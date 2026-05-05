import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PropertyService {
    constructor(private prisma: PrismaService) { }

    // HOTEL
    async createHotel(data: { name: string; currency: string; timezone: string }) {
        return this.prisma.hotel.create({ data });
    }

    async getHotels() {
        return this.prisma.hotel.findMany();
    }

    async getHotel(id: string) {
        return this.prisma.hotel.findUnique({
            where: { id },
            include: { 
                roomTypes: true,
                restaurant: true
            },
        });
    }

    async updateHotel(id: string, data: any) {
        const { restaurantId: rawRestaurantId, ...rest } = data;
        const restaurantId = (rawRestaurantId === 'none' || rawRestaurantId === '') ? null : rawRestaurantId;
        
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
                        { name: 'Desayuno', type: 'BREAKFAST', startTime: '08:00', endTime: '11:00' },
                        { name: 'Comida', type: 'LUNCH', startTime: '13:00', endTime: '16:00' },
                        { name: 'Cena', type: 'DINNER', startTime: '20:00', endTime: '23:00' }
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

    async deleteHotel(id: string) {
        return this.prisma.hotel.delete({
            where: { id },
        });
    }

    // ROOM TYPES
    async createRoomType(hotelId: string, data: any) {
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

    async updateRoomType(id: string, data: any) {
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

    async deleteRoomType(id: string) {
        return this.prisma.roomType.delete({
            where: { id },
        });
    }

    async getRoomTypes(hotelId: string) {
        return this.prisma.roomType.findMany({
            where: { hotelId },
            include: { rooms: true },
        });
    }

    // ROOMS (UNITS)
    async createRoom(roomTypeId: string, name: string) {
        return this.prisma.room.create({
            data: {
                roomTypeId,
                name,
            },
        });
    }
}
