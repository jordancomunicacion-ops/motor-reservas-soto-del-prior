import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShiftType } from '../../common/enums';
import { getUserScope, assertHotelAccess, ensureHotelAccess } from '../../common/scope';

@Injectable()
export class PropertyService {
    constructor(private prisma: PrismaService) { }

    // HOTEL
    async createHotel(data: { name: string; currency: string; timezone: string }) {
        return this.prisma.hotel.create({ data });
    }

    private sanitizeMailConfig(entity: any): any {
        if (!entity) return entity;
        const cfg = entity.mailConfig;
        if (!cfg) return entity;
        const sanitized: any = {
            host: cfg.host || '',
            port: cfg.port || '',
            user: cfg.user || '',
            from: cfg.from || '',
            notificationsEnabled: cfg.notificationsEnabled !== false,
            passConfigured: !!(cfg.pass && cfg.pass.length > 0),
        };
        if (cfg.graph) {
            sanitized.graph = {
                tenantId: cfg.graph.tenantId || '',
                clientId: cfg.graph.clientId || '',
                senderEmail: cfg.graph.senderEmail || '',
                clientSecretConfigured: !!(cfg.graph.clientSecret && cfg.graph.clientSecret.length > 0),
            };
        }
        return { ...entity, mailConfig: sanitized };
    }

    async getHotels(user?: any) {
        const scope = await getUserScope(user, this.prisma);
        const hotels = await this.prisma.hotel.findMany({
            where: scope.hotelIds === null ? {} : { id: { in: scope.hotelIds } },
            include: { restaurant: true }
        });
        return hotels.map(h => this.sanitizeMailConfig(h));
    }

    async getHotel(id: string, user?: any) {
        if (user) {
            const scope = await getUserScope(user, this.prisma);
            assertHotelAccess(scope, id);
        }
        const hotel = await this.prisma.hotel.findUnique({
            where: { id },
            include: {
                roomTypes: true,
                restaurant: true
            },
        });
        return this.sanitizeMailConfig(hotel);
    }

    /** Resuelve el hotelId al que pertenece un RoomType. */
    private async hotelIdForRoomType(roomTypeId: string): Promise<string> {
        const rt = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            select: { hotelId: true }
        });
        if (!rt) throw new NotFoundException('Tipo de habitación no encontrado');
        return rt.hotelId;
    }

    async updateHotel(id: string, data: any, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, id);
        const { restaurantId: rawRestaurantId, ...rest } = data;
        const restaurantId = (rawRestaurantId === 'none' || rawRestaurantId === '') ? null : rawRestaurantId;

        // Si llega mailConfig sanitizado (sin pass o clientSecret), preservar los del actual
        if (rest.mailConfig) {
            const existing = await this.prisma.hotel.findUnique({ where: { id }, select: { mailConfig: true } });
            const currentCfg: any = existing?.mailConfig || {};
            const incoming: any = rest.mailConfig || {};
            if (!incoming.pass) {
                incoming.pass = currentCfg.pass;
            }
            if (incoming.graph) {
                if (!incoming.graph.clientSecret) {
                    incoming.graph.clientSecret = currentCfg.graph?.clientSecret;
                }
            } else if (currentCfg.graph) {
                incoming.graph = currentCfg.graph;
            }
            delete incoming.passConfigured;
            if (incoming.graph) delete incoming.graph.clientSecretConfigured;
            rest.mailConfig = incoming;
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. If we are linking a restaurant, clear it from any other hotel first
            if (restaurantId) {
                await tx.hotel.updateMany({
                    where: { restaurantId: restaurantId },
                    data: { restaurantId: null }
                });
            }

            // 2. Update this hotel
            const hotel = await tx.hotel.update({
                where: { id },
                data: {
                    ...rest,
                    restaurantId
                }
            });

            // 3. Auto-initialize restaurant if it's new/empty and being linked
            if (restaurantId) {
                const restaurant = await tx.restaurant.findUnique({
                    where: { id: restaurantId },
                    include: { zones: true, shifts: true }
                });

                if (restaurant && restaurant.zones.length === 0) {
                    const zone = await tx.zone.create({
                        data: {
                            restaurantId: restaurant.id,
                            name: 'Interior',
                            index: 0
                        }
                    });

                    // Create 10 default tables for a quick start
                    for (let i = 1; i <= 10; i++) {
                        await tx.table.create({
                            data: {
                                zoneId: zone.id,
                                name: `Mesa ${i}`,
                                capacity: 4,
                                x: (i - 1) % 5 * 100,
                                y: Math.floor((i - 1) / 5) * 100
                            }
                        });
                    }
                }

                if (restaurant && restaurant.shifts.length === 0) {
                    const shiftsData = [
                        { name: 'Desayuno', type: ShiftType.BREAKFAST, startTime: '08:00', endTime: '11:00' },
                        { name: 'Comida', type: ShiftType.LUNCH, startTime: '13:00', endTime: '16:00' },
                        { name: 'Cena', type: ShiftType.DINNER, startTime: '20:00', endTime: '23:00' }
                    ];

                    for (const s of shiftsData) {
                        await tx.shift.create({
                            data: {
                                ...s,
                                restaurantId: restaurant.id,
                                daysOfWeek: '1,2,3,4,5,6,0'
                            }
                        });
                    }
                }
            }

            return hotel;
        });
    }

    async deleteHotel(id: string, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, id);
        return this.prisma.$transaction(async (tx) => {
            // 1. Clean up bookings and related
            await tx.booking.deleteMany({ where: { hotelId: id } });
            
            // 2. Clean up inventory, pricing, seasons and restrictions
            await tx.dailyPrice.deleteMany({ where: { roomType: { hotelId: id } } });
            await tx.restriction.deleteMany({ where: { hotelId: id } });
            await tx.season.deleteMany({ where: { hotelId: id } });
            await tx.ratePlan.deleteMany({ where: { hotelId: id } });
            await tx.widgetConfig.deleteMany({ where: { hotelId: id } });
            await tx.event.deleteMany({ where: { hotelId: id } });

            // 3. Clean up rooms and room types
            const roomTypes = await tx.roomType.findMany({ where: { hotelId: id }, select: { id: true } });
            const roomTypeIds = roomTypes.map(rt => rt.id);
            if (roomTypeIds.length > 0) {
                await tx.room.deleteMany({ where: { roomTypeId: { in: roomTypeIds } } });
                await tx.roomType.deleteMany({ where: { hotelId: id } });
            }

            // 4. Finally delete the hotel
            return tx.hotel.delete({ where: { id } });
        });
    }

    // ROOM TYPES
    async createRoomType(hotelId: string, data: any, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, hotelId);
        const { quantity = 1, id, ...rest } = data;

        return this.prisma.$transaction(async (tx) => {
            const roomType = await tx.roomType.create({
                data: {
                    name: rest.name,
                    basePrice: rest.basePrice,
                    capacity: rest.capacity,
                    hotelId,
                },
            });

            // Create individual rooms based on quantity
            for (let i = 1; i <= quantity; i++) {
                await tx.room.create({
                    data: {
                        roomTypeId: roomType.id,
                        name: `${roomType.name} ${i}`,
                    }
                });
            }

            return roomType;
        });
    }

    async updateRoomType(id: string, data: any, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, await this.hotelIdForRoomType(id));
        const { quantity, id: _, ...rest } = data;
        
        return this.prisma.$transaction(async (tx) => {
            const roomType = await tx.roomType.update({
                where: { id },
                data: {
                    name: rest.name,
                    basePrice: rest.basePrice,
                    capacity: rest.capacity,
                },
            });

            // If quantity is provided, we might want to sync the number of rooms
            // For now, let's just update the room type info
            // TODO: Handle quantity changes (adding/removing room units)

            return roomType;
        });
    }

    async deleteRoomType(id: string, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, await this.hotelIdForRoomType(id));
        return this.prisma.roomType.delete({
            where: { id },
        });
    }

    async getRoomTypes(hotelId: string, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, hotelId);
        return this.prisma.roomType.findMany({
            where: { hotelId },
            include: { rooms: true },
        });
    }

    // ROOMS (UNITS)
    async createRoom(roomTypeId: string, name: string, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, await this.hotelIdForRoomType(roomTypeId));
        return this.prisma.room.create({
            data: {
                roomTypeId,
                name,
            },
        });
    }

    async getHotelZones(hotelId: string, user?: any) {
        if (user) await ensureHotelAccess(user, this.prisma, hotelId);
        const hotel: any = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            include: { zones: true, restaurant: { include: { zones: true } } }
        });

        if (!hotel) return [];

        // Combine hotel-specific zones and restaurant zones if linked
        const hotelZones = hotel.zones || [];
        const restaurantZones = hotel.restaurant?.zones || [];

        return [...hotelZones, ...restaurantZones];
    }
}
