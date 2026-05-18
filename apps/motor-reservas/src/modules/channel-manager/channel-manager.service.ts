
import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as ical from 'node-ical';
import { BookingStatus, BookingSource } from '../../common/constants';
import { getUserScope, type AuthenticatedUser } from '../../common/scope';

@Injectable()
export class ChannelManagerService {
    private readonly logger = new Logger(ChannelManagerService.name);

    constructor(private prisma: PrismaService) { }

    // Run every 10 minutes
    @Cron('0 */10 * * * *')
    async handleCron() {
        this.logger.log('Starting Channel Manager Sync...');
        await this.syncAllFeeds();
        // await this.syncBcomApi(); // Level 2/3 Feature
    }

    // --- LEVEL 1: iCal Sync ---

    async getFeeds(user?: AuthenticatedUser | null) {
        const scope = await getUserScope(user, this.prisma);
        // Los iCalFeed cuelgan de RoomType, que a su vez pertenece a un Hotel.
        // Si el usuario está atado a un hotel, solo se muestran los feeds de habitaciones de ese hotel.
        // Usuarios atados solo a restaurante no manejan habitaciones → no ven feeds.
        const where = scope.hotelIds === null
            ? {}
            : { roomType: { hotelId: { in: scope.hotelIds } } };
        return this.prisma.iCalFeed.findMany({
            where,
            include: { roomType: { select: { id: true, name: true, hotelId: true } } },
            orderBy: { id: 'desc' }
        });
    }

    /**
     * Crea un feed iCal validando primero la URL contra el origen.
     * Si la URL no es alcanzable o no es un iCalendar válido, lanza BadRequestException.
     */
    async createFeed(
        data: { roomTypeId: string; url: string; name?: string; source: string },
        user?: AuthenticatedUser | null
    ) {
        await this.assertRoomTypeAccess(data.roomTypeId, user);
        await this.validateICalUrl(data.url);

        return this.prisma.iCalFeed.create({
            data: {
                roomTypeId: data.roomTypeId,
                url: data.url,
                name: data.name ?? null,
                source: data.source
            },
            include: { roomType: { select: { id: true, name: true, hotelId: true } } }
        });
    }

    /** Elimina un feed; respeta scoping. */
    async deleteFeed(feedId: string, user?: AuthenticatedUser | null) {
        const feed = await this.prisma.iCalFeed.findUnique({
            where: { id: feedId },
            include: { roomType: { select: { hotelId: true } } }
        });
        if (!feed) throw new NotFoundException('Feed no encontrado');
        await this.assertHotelScope(feed.roomType.hotelId, user);
        await this.prisma.iCalFeed.delete({ where: { id: feedId } });
        return { ok: true };
    }

    /** Sincroniza un único feed bajo demanda. Devuelve nº de bookings importadas y errores. */
    async syncFeed(feedId: string, user?: AuthenticatedUser | null) {
        const feed = await this.prisma.iCalFeed.findUnique({
            where: { id: feedId },
            include: { roomType: true }
        });
        if (!feed) throw new NotFoundException('Feed no encontrado');
        await this.assertHotelScope(feed.roomType.hotelId, user);
        return this.processICalUrl(feed);
    }

    /** Valida que la URL devuelva un calendario iCalendar parseable. No persiste nada. */
    async validateICalUrl(url: string): Promise<{ ok: true; eventCount: number }> {
        if (!/^https?:\/\//i.test(url)) {
            throw new BadRequestException('La URL iCal debe empezar por http(s)://');
        }
        try {
            const events = await ical.async.fromURL(url);
            const eventCount = Object.values(events).filter((e: any) => e?.type === 'VEVENT').length;
            return { ok: true, eventCount };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'No se pudo descargar el iCal';
            throw new BadRequestException(`URL iCal inválida: ${msg}`);
        }
    }

    private async assertRoomTypeAccess(roomTypeId: string, user?: AuthenticatedUser | null) {
        const rt = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            select: { hotelId: true }
        });
        if (!rt) throw new BadRequestException('RoomType no existe');
        await this.assertHotelScope(rt.hotelId, user);
    }

    private async assertHotelScope(hotelId: string, user?: AuthenticatedUser | null) {
        const scope = await getUserScope(user, this.prisma);
        if (scope.isGlobalAdmin) return;
        if (!scope.hotelIds?.includes(hotelId)) {
            throw new ForbiddenException('Sin acceso a este hotel');
        }
    }

    async syncAllFeeds() {
        const feeds = await this.prisma.iCalFeed.findMany({ where: { isActive: true }, include: { roomType: true } });
        for (const feed of feeds) {
            this.logger.log(`Syncing iCal: ${feed.name || feed.url}`);
            await this.processICalUrl(feed);
        }
    }

    private async processICalUrl(feed: any): Promise<{ imported: number; overbooked: number; skipped: number; error?: string }> {
        const result = { imported: 0, overbooked: 0, skipped: 0 };
        try {
            const events = await ical.async.fromURL(feed.url);

            for (const k in events) {
                const event = events[k];
                if (event.type !== 'VEVENT') continue;

                const uid = event.uid;
                const start = new Date(event.start);
                const end = new Date(event.end);
                const summary = event.summary || 'OTA Booking';

                // Idempotency Check
                const existing = await this.prisma.booking.findFirst({
                    where: { otaId: uid }
                });

                if (existing) {
                    result.skipped++;
                    continue;
                }

                const roomTypeId = feed.roomTypeId;
                const room = await this.allocateRoomForOTA(roomTypeId, start, end);

                if (room) {
                    await this.prisma.booking.create({
                        data: {
                            hotelId: feed.roomType.hotelId,
                            guestName: `OTA Guest (${summary})`,
                            checkInDate: start,
                            checkOutDate: end,
                            nights: Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)),
                            totalPrice: 0,
                            status: BookingStatus.CONFIRMED,
                            source: feed.source === 'BOOKING' ? BookingSource.BOOKING_COM : BookingSource.AIRBNB,
                            referenceCode: `EXT-${Date.now()}`,
                            otaId: uid,
                            bookingRooms: {
                                create: [{
                                    roomId: room.id,
                                    priceSnapshot: 0,
                                    date: start
                                }]
                            }
                        }
                    });
                    result.imported++;
                } else {
                    result.overbooked++;
                    this.logger.error(`OVERBOOKING ALERT: No room available for OTA event ${uid} on dates ${start.toDateString()}`);
                }
            }

            await this.prisma.iCalFeed.update({ where: { id: feed.id }, data: { lastSync: new Date() } });
            await this.prisma.syncLog.create({
                data: {
                    channel: feed.source,
                    action: 'PULL_ICAL',
                    status: 'SUCCESS',
                    details: JSON.stringify({ feedId: feed.id, ...result })
                }
            });

            return result;
        } catch (e) {
            const error = e instanceof Error ? e.message : 'unknown error';
            this.logger.error(`Error syncing feed ${feed.id}: ${error}`);
            await this.prisma.syncLog.create({
                data: {
                    channel: feed.source,
                    action: 'PULL_ICAL',
                    status: 'ERROR',
                    details: JSON.stringify({ feedId: feed.id, error })
                }
            });
            return { ...result, error };
        }
    }

    /** Últimos N logs de sincronización filtrados por scope. */
    async getRecentLogs(user?: AuthenticatedUser | null, limit = 20) {
        const scope = await getUserScope(user, this.prisma);
        // SyncLog no tiene FK a hotel — devolvemos últimos N globales si admin global,
        // o filtrados por canal asociado a un feed del hotel del usuario en otro caso.
        if (scope.isGlobalAdmin) {
            return this.prisma.syncLog.findMany({ orderBy: { timestamp: 'desc' }, take: limit });
        }
        // Para usuarios con scope: buscamos los feedIds del hotel y filtramos por details que los contenga.
        const feeds = await this.prisma.iCalFeed.findMany({
            where: { roomType: { hotelId: { in: scope.hotelIds ?? [] } } },
            select: { id: true }
        });
        const feedIds = new Set(feeds.map(f => f.id));
        const logs = await this.prisma.syncLog.findMany({ orderBy: { timestamp: 'desc' }, take: limit * 5 });
        return logs.filter(l => {
            try {
                const parsed = JSON.parse(l.details || '{}');
                return feedIds.has(parsed.feedId);
            } catch {
                return false;
            }
        }).slice(0, limit);
    }

    private async allocateRoomForOTA(roomTypeId: string, start: Date, end: Date) {
        const allRooms = await this.prisma.room.findMany({ where: { roomTypeId, isActive: true } });
        for (const room of allRooms) {
            const conflict = await this.prisma.bookingRoom.findFirst({
                where: {
                    roomId: room.id,
                    booking: {
                        status: { not: 'CANCELLED' },
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                }
            });
            if (!conflict) return room;
        }
        return null;
    }

    // --- LEVEL 3: Booking.com API Stub ---
    // Requires "Connectivity Partner" credentials

    async pushInventory(hotelId: string) {
        // 1. Get Mappings
        const mappings = await this.prisma.channelMapping.findMany({
            where: { channel: { name: 'Booking.com' }, roomType: { hotelId } },
            include: { roomType: { include: { dailyPrices: true, restrictions: true } } }
        });

        for (const map of mappings) {
            // ... (Logic to push inventory would go here)
        }

        /*
        for (const map of mappings) {
            this.logger.log(`Pushing inventory for Room ${map.roomType.name} -> Booking.com ID ${map.externalId}`);
            
            // Construct OTA OTA_HotelRateAmountNotifRQ XML or JSON
            const payload = {
                id: map.externalId,
                dates: []
            };
            
            // await axios.post('https://supply-xml.booking.com/hotels/xml/availability', payload);
        }
        */
    }
    async generateICal(roomTypeId: string) {
        const bookings = await this.prisma.booking.findMany({
            where: {
                bookingRooms: { some: { room: { roomTypeId } } },
                status: BookingStatus.CONFIRMED
            }
        });

        let ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SotoDelPrior//PMS//EN\n`;

        for (const b of bookings) {
            ics += `BEGIN:VEVENT\n`;
            ics += `UID:${b.id}@sotodelprior.com\n`;
            // Format dates YYYYMMDD
            ics += `DTSTART;VALUE=DATE:${b.checkInDate.toISOString().replace(/[-:]/g, '').split('T')[0]}\n`;
            ics += `DTEND;VALUE=DATE:${b.checkOutDate.toISOString().replace(/[-:]/g, '').split('T')[0]}\n`;
            ics += `SUMMARY:Reserved\n`;
            ics += `END:VEVENT\n`;
        }

        ics += `END:VCALENDAR`;
        return ics;
    }
}
