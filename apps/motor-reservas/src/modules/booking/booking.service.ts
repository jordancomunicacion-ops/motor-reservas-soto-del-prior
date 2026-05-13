import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, BookingSource } from '../../common/enums';
import { RatesService } from '../rates/rates.service';
import { AvailabilityService } from '../rates/availability.service';
import { CrmIntegrationService } from '../crm/crm-integration.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private ratesService: RatesService,
        private availabilityService: AvailabilityService,
        private crmIntegrationService: CrmIntegrationService,
        private mailService: MailService
    ) { }


    async createBooking(data: {
        hotelId: string;
        guestName: string;
        checkInDate: string;
        checkOutDate: string;
        roomTypeId: string;
        ratePlanId?: string; // Optional for backward compat
        pax: number;
        guestEmail?: string;
        guestPhone?: string;
    }) {
        const checkIn = new Date(data.checkInDate);
        const checkOut = new Date(data.checkOutDate);

        // 0. Default Rate Plan if missing
        let ratePlanId = data.ratePlanId;
        if (!ratePlanId) {
            const defaultPlan = await this.prisma.ratePlan.findFirst({
                where: { hotelId: data.hotelId, isDefault: true }
            });
            // Fallback if no default exists (should not happen in real app)
            if (!defaultPlan) {
                // Try find ANY plan
                const anyPlan = await this.prisma.ratePlan.findFirst({ where: { hotelId: data.hotelId } });
                if (!anyPlan) throw new BadRequestException("No Rate Plan configured for this hotel.");
                ratePlanId = anyPlan.id;
            } else {
                ratePlanId = defaultPlan.id;
            }
        }

        // 1. Check Availability & Restrictions
        try {
            await this.availabilityService.checkAvailability(
                data.hotelId,
                data.roomTypeId,
                ratePlanId!,
                checkIn,
                checkOut,
                1 // units
            );
        } catch (e: any) {
            throw new BadRequestException(e.message);
        }

        // 2. Calculate Price (Server Side Authority)
        const priceInfo = await this.ratesService.calculatePrice(
            data.hotelId,
            data.roomTypeId,
            ratePlanId!,
            checkIn,
            checkOut,
            data.pax
        );

        // 3. Allocate Room (Simple logic: pick first free)
        const room = await this.allocateRoom(data.hotelId, data.roomTypeId, checkIn, checkOut);
        if (!room) throw new BadRequestException('System error: Inventory check passed but no physical room found.');

        // 4. Create Booking
        const booking = await this.prisma.booking.create({
            data: {
                hotelId: data.hotelId,
                guestName: data.guestName,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                totalPrice: priceInfo.totalPrice,
                nights: this.calculateNights(checkIn, checkOut),
                referenceCode: `RES-${Date.now()}`,
                status: BookingStatus.CONFIRMED,
                source: BookingSource.DIRECT,
                bookingRooms: {
                    create: [{
                        roomId: room.id,
                        priceSnapshot: priceInfo.totalPrice,
                        date: checkIn
                    }]
                }
            },
            include: { bookingRooms: true }
        });

        // Sync with CRM
        this.crmIntegrationService.syncHotelBooking(booking.id).catch(err => {
            console.error(`Error syncing hotel booking ${booking.id} to CRM:`, err);
        });

        // NEW: Send Confirmation Email (If guest has email)
        const guestEmail = data.guestEmail;
        if (guestEmail) {
            this.mailService.sendHotelNotification(booking, 'created').catch(err => {
                console.error(`Error sending confirmation email for hotel booking ${booking.id}:`, err);
            });
        }
        
        return booking;

    }


    async getBookings(hotelId: string) {
        return this.prisma.booking.findMany({
            where: { hotelId },
            include: { bookingRooms: { include: { room: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async cancelBooking(bookingId: string) {
        const booking = await this.prisma.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.CANCELLED }
        });

        // Sync with CRM
        this.crmIntegrationService.syncHotelBooking(booking.id, 'CANCELLED').catch(err => {
            console.error(`Error syncing cancelled hotel booking ${booking.id} to CRM:`, err);
        });

        // NEW: Send Cancellation Email
        if (booking.guestEmail) {
            this.mailService.sendHotelNotification(booking, 'cancelled').catch(err => {
                console.error(`Error sending cancellation email for hotel booking ${booking.id}:`, err);
            });
        }
        
        return booking;

    }

    // PUBLIC AVAILABILITY
    async checkAvailability(hotelId: string, from: string, to: string, pax: number) {
        const checkIn = new Date(from);
        const checkOut = new Date(to);

        const roomTypes = await this.prisma.roomType.findMany({
            where: { hotelId, capacity: { gte: +pax } },
            // include: { dailyPrices: true } // Optimization possible (Requires Client Regen)
        });

        // Assume default rate plan for public search if none provided
        // In real app, we iterate all RatePlans.
        const defaultRatePlan = await this.prisma.ratePlan.findFirst({
            where: { hotelId, isDefault: true }
        });

        if (!defaultRatePlan) return []; // No public rates

        const availableTypes: any[] = [];

        for (const type of roomTypes) {
            try {
                // Check restrictions
                await this.availabilityService.checkAvailability(hotelId, type.id, defaultRatePlan.id, checkIn, checkOut);

                // Calculate Price
                const priceInfo = await this.ratesService.calculatePrice(hotelId, type.id, defaultRatePlan.id, checkIn, checkOut, pax);

                availableTypes.push({
                    ...type,
                    totalPrice: priceInfo.totalPrice,
                    ratePlan: defaultRatePlan.name,
                    breakdown: priceInfo.breakdown
                });
            } catch (e) {
                // Not available
                continue;
            }
        }

        return availableTypes;
    }

    // --- Helpers ---

    private async allocateRoom(hotelId: string, roomTypeId: string, start: Date, end: Date) {
        const allRooms = await this.prisma.room.findMany({
            where: { roomTypeId, isActive: true }
        });

        for (const room of allRooms) {
            const isBusy = await this.prisma.bookingRoom.findFirst({
                where: {
                    roomId: room.id,
                    booking: {
                        status: { not: 'CANCELLED' }, // Check valid status
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                }
            });

            if (!isBusy) return room;
        }
        return null;
    }

    private calculateNights(start: Date, end: Date) {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
}
