import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import * as ical from 'node-ical';
import { BookingStatus, BookingSource, ChannelType } from '@prisma/client';

@Injectable()
export class ChannelManagerService {
    private readonly logger = new Logger(ChannelManagerService.name);

    constructor(private prisma: PrismaService) { }

    // Run every 15 minutes
    @Cron('0 */15 * * * *')
    async handleCron() {
        this.logger.log('Starting scheduled iCal sync...');
        await this.syncAllFeeds();
    }

    async syncAllFeeds() {
        const feeds = await this.prisma.iCalFeed.findMany({ where: { isActive: true } });
        for (const feed of feeds) {
            this.logger.log(`Syncing feed: ${feed.url}`);
            await this.syncFeed(feed);
        }
    }

    private async syncFeed(feed: any) {
        try {
            const events = await ical.async.fromURL(feed.url);

            for (const k in events) {
                const event = events[k];
                if (event.type !== 'VEVENT') continue;

                const uid = event.uid;
                const start = new Date(event.start);
                const end = new Date(event.end);
                const summary = event.summary || 'External Reservation';

                // Check if exists
                const existing = await this.prisma.booking.findFirst({
                    where: { externalId: uid }
                });

                if (existing) {
                    // Update if dates changed (simplified logic)
                    continue;
                }

                // Create new Booking
                // In real app, we need to find WHICH room to assign it to.
                // For MVP, we assign to the FIRST available room of the feed's RoomType.
                const availableRoom = await this.findFirstRoomOfType(feed.roomTypeId);

                if (availableRoom) {
                    await this.prisma.booking.create({
                        data: {
                            hotelId: availableRoom.roomType.hotelId,
                            guestName: `OTA Guest (${summary})`,
                            checkInDate: start,
                            checkOutDate: end,
                            nights: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
                            totalPrice: 0, // Unknown price from iCal
                            status: BookingStatus.CONFIRMED,
                            source: feed.source === 'BOOKING' ? BookingSource.BOOKING_COM : BookingSource.AIRBNB,
                            externalId: uid,
                            referenceCode: `EXT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            bookingRooms: {
                                create: {
                                    roomId: availableRoom.id,
                                    rateSnapshot: 0,
                                    date: start
                                }
                            }
                        }
                    });
                    this.logger.log(`Imported event ${uid}`);
                } else {
                    this.logger.warn(`No room available for event ${uid}`);
                }
            }

            // Update Feed Status
            await this.prisma.iCalFeed.update({
                where: { id: feed.id },
                data: { lastSync: new Date() }
            });

        } catch (e) {
            this.logger.error(`Failed to sync feed ${feed.id}`, e);
        }
    }

    private async findFirstRoomOfType(roomTypeId: string) {
        // Very naive implementation
        return this.prisma.room.findFirst({
            where: { roomTypeId, isActive: true },
            include: { roomType: true }
        });
    }

    // EXPORT
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
