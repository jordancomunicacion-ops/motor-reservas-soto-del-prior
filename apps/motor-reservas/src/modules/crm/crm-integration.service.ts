import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmIntegrationService {
    private readonly logger = new Logger(CrmIntegrationService.name);

    constructor(private prisma: PrismaService) { }

    async syncHotelBooking(bookingId: string, event: 'CREATED' | 'UPDATED' | 'CANCELLED' = 'CREATED') {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { hotel: { include: { restaurant: true, crmIntegration: true } }, guest: true }
            });

            if (!booking || !booking.hotel) return;

            let crm: any = booking.hotel.crmIntegration;

            if (!crm || !crm.enabled) {
                const hotelIntegrations = (booking.hotel.integrations as any) || {};
                if (hotelIntegrations.crm?.enabled && hotelIntegrations.crm?.url) {
                    crm = hotelIntegrations.crm;
                }
            }

            if ((!crm || !crm.enabled) && booking.hotel.restaurant) {
                crm = await (this.prisma as any).crmIntegration.findUnique({
                    where: { restaurantId: booking.hotel.restaurant.id }
                });
                if (crm && !crm.enabled) crm = null;
                if (!crm) {
                    const restIntegrations = (booking.hotel.restaurant.integrations as any) || {};
                    if (restIntegrations.crm?.enabled && restIntegrations.crm?.url) {
                        crm = restIntegrations.crm;
                    }
                }
            }

            if (!crm || !crm.enabled || !crm.url) return;

            const [firstName, ...rest] = booking.guestName.split(' ');
            const lastName = rest.join(' ') || '';

            const payload = {
                source: 'HOTEL_RESERVATIONS',
                sourceLabel: crm.sourceLabel,
                event: `BOOKING_${event}`,
                guest: {
                    email: booking.guestEmail || booking.guest?.email,
                    phone: booking.guestPhone || booking.guest?.phone,
                    firstName,
                    lastName,
                    fullName: booking.guestName,
                    notes: booking.guest?.notes,
                    tags: booking.guest?.tags
                },
                data: {
                    id: booking.id,
                    reference: booking.referenceCode,
                    total: Number(booking.totalPrice),
                    checkIn: booking.checkInDate,
                    checkOut: booking.checkOutDate,
                    nights: booking.nights,
                    status: booking.status,
                    source: booking.source,
                    hotelId: booking.hotelId,
                    hotelName: booking.hotel.name
                },
                tracking: {
                    trackingId: crm.trackingId,
                    campaignSource: crm.campaignSource,
                    campaignMedium: crm.campaignMedium,
                    campaignName: crm.campaignName
                }
            };

            await this.sendToCrm(crm.url, payload, crm.token, crm);
        } catch (error) {
            this.logger.error(`Failed to sync hotel booking ${bookingId}:`, error);
        }
    }

    private async getGuestStats(email?: string | null, phone?: string | null) {
        if (!email && !phone) return { visitCount: 0, firstVisit: null, cancelledCount: 0, totalBookings: 0, cancelledOrNoShowRate: 0 };

        const bookings = await this.prisma.resBooking.findMany({
            where: {
                OR: [
                    email ? { guestEmail: email } : null,
                    phone ? { guestPhone: phone } : null
                ].filter(Boolean) as any
            },
            select: {
                status: true,
                date: true
            }
        });

        const committed = bookings.filter(b => b.status !== 'PENDING_CONFIRMATION');
        const totalBookings = committed.length;
        const visitCount = committed.filter(b => b.status === 'SEATED').length;
        const cancelledCount = committed.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;

        let firstVisit: Date | null = null;
        if (bookings.length > 0) {
            firstVisit = bookings.reduce((prev, curr) =>
                (curr.date < prev.date) ? curr : prev
            ).date;
        }

        return {
            visitCount,
            firstVisit,
            cancelledCount,
            totalBookings,
            cancelledOrNoShowRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0
        };
    }

    async syncRestaurantBooking(bookingId: string, event: 'CREATED' | 'UPDATED' | 'CANCELLED' = 'CREATED') {
        this.logger.log(`[CRM-DEBUG] syncRestaurantBooking started for ID: ${bookingId}, Event: ${event}`);
        try {
            const booking = await this.prisma.resBooking.findUnique({
                where: { id: bookingId },
                include: { restaurant: { include: { hotel: true, crmIntegration: true } } }
            });

            if (!booking) {
                this.logger.warn(`[CRM-DEBUG] Booking ${bookingId} not found`);
                return;
            }
            if (!booking.restaurant) {
                this.logger.warn(`[CRM-DEBUG] Booking ${bookingId} has no restaurant`);
                return;
            }

            let crm: any = booking.restaurant.crmIntegration;

            this.logger.log(`[CRM-DEBUG] Restaurant CRM table config: ${JSON.stringify(crm)}`);

            if (!crm || !crm.enabled) {
                const restIntegrations = (booking.restaurant.integrations as any) || {};
                if (restIntegrations.crm?.enabled && restIntegrations.crm?.url) {
                    this.logger.log(`[CRM-DEBUG] Using restaurant.integrations.crm JSON fallback`);
                    crm = restIntegrations.crm;
                }
            }

            if ((!crm || !crm.enabled) && booking.restaurant.hotel) {
                this.logger.log(`[CRM-DEBUG] CRM not enabled on restaurant, checking hotel...`);
                crm = await (this.prisma as any).crmIntegration.findUnique({
                    where: { hotelId: booking.restaurant.hotel.id }
                });
                if (!crm || !crm.enabled) {
                    const hotelIntegrations = (booking.restaurant.hotel.integrations as any) || {};
                    if (hotelIntegrations.crm?.enabled && hotelIntegrations.crm?.url) {
                        this.logger.log(`[CRM-DEBUG] Using hotel.integrations.crm JSON fallback`);
                        crm = hotelIntegrations.crm;
                    }
                }
            }

            if (!crm) {
                this.logger.warn(`[CRM-DEBUG] CRM configuration NOT FOUND for booking ${bookingId}`);
                return;
            }
            if (!crm.enabled) {
                this.logger.warn(`[CRM-DEBUG] CRM is DISABLED for booking ${bookingId}`);
                return;
            }
            if (!crm.url) {
                this.logger.warn(`[CRM-DEBUG] CRM URL is MISSING for booking ${bookingId}`);
                return;
            }

            this.logger.log(`[CRM-DEBUG] Syncing to CRM URL: ${crm.url}`);

            if (!booking.guestEmail && !booking.guestPhone) {
                this.logger.warn(`[CRM-DEBUG] Skipping CRM sync for booking ${bookingId}: Both guest email and phone are missing.`);
                return;
            }

            // Calculate actual guest stats for CRM
            const stats = await this.getGuestStats(booking.guestEmail, booking.guestPhone);

            const [firstName, ...rest] = booking.guestName.split(' ');
            const lastName = rest.join(' ') || '';

            const payload = {
                source: 'RESTAURANT_RESERVATIONS',
                sourceLabel: crm.sourceLabel,
                event: `RESERVATION_${event}`,
                guest: {
                    email: booking.guestEmail,
                    phone: booking.guestPhone,
                    name: booking.guestName,
                    firstName,
                    lastName,
                    surname2: booking.guestSurname2,
                    age: booking.guestAge,
                    gender: booking.guestGender,
                    whatsapp: booking.guestWhatsapp,
                    notes: booking.notes,
                    tags: booking.tags ? JSON.parse(booking.tags.startsWith('[') ? booking.tags : '[]') : [],
                    instagram: (booking as any).instagram,
                    facebook: (booking as any).facebook,
                    tiktok: (booking as any).tiktok,
                    linkedin: (booking as any).linkedin,
                    xTwitter: (booking as any).xTwitter
                },
                data: {
                    id: booking.id,
                    date: booking.date,
                    pax: booking.pax,
                    status: booking.status,
                    notes: booking.notes,
                    tags: booking.tags,
                    origin: booking.origin,
                    restaurantId: booking.restaurantId,
                    restaurantName: booking.restaurant.name,
                    isMealPlan: booking.isMealPlan,
                    hotelBookingId: booking.hotelBookingId,
                    seatedAt: booking.status === 'SEATED' ? booking.updatedAt : null,
                    visitCount: stats.visitCount,
                    totalBookings: stats.totalBookings,
                    cancelledCount: stats.cancelledCount,
                    cancelledOrNoShowRate: stats.cancelledOrNoShowRate,
                    firstReservationDate: stats.firstVisit
                },
                tracking: {
                    trackingId: crm.trackingId,
                    campaignSource: crm.campaignSource,
                    campaignMedium: crm.campaignMedium,
                    campaignName: crm.campaignName
                }
            };

            this.logger.log(`[CRM-DEBUG] Sending payload: ${JSON.stringify(payload)}`);
            await this.sendToCrm(crm.url, payload, crm.token, crm);
            this.logger.log(`[CRM-DEBUG] syncRestaurantBooking completed for ID: ${bookingId}`);
        } catch (error) {
            this.logger.error(`[CRM-DEBUG] Failed to sync restaurant booking ${bookingId}:`, error);
        }
    }

    async syncEventBooking(bookingId: string, event: 'CREATED' | 'UPDATED' | 'CANCELLED' = 'CREATED') {
        try {
            const booking = await this.prisma.eventBooking.findUnique({
                where: { id: bookingId },
                include: {
                    event: {
                        include: {
                            hotel: { include: { restaurant: true, crmIntegration: true } },
                            restaurant: { include: { hotel: true, crmIntegration: true } }
                        }
                    }
                }
            });

            if (!booking) return;

            const primaryEntity = booking.event.hotel || booking.event.restaurant;
            if (!primaryEntity) return;

            let crm = (primaryEntity as any).crmIntegration;

            if (!crm || !crm.enabled) {
                const linkedEntity = booking.event.hotel?.restaurant || booking.event.restaurant?.hotel;
                if (linkedEntity) {
                    crm = (linkedEntity as any).crmIntegration;
                }
            }

            if (!crm || !crm.enabled || !crm.url) return;

            const [firstName, ...rest] = booking.guestName.split(' ');
            const lastName = rest.join(' ') || '';

            const payload = {
                source: 'EVENT_RESERVATIONS',
                sourceLabel: crm.sourceLabel,
                event: `EVENT_BOOKING_${event}`,
                guest: {
                    email: booking.guestEmail,
                    phone: booking.guestPhone,
                    name: booking.guestName,
                    firstName,
                    lastName
                },
                data: {
                    id: booking.id,
                    eventId: booking.eventId,
                    eventName: booking.event.name,
                    date: booking.event.date,
                    pax: booking.pax,
                    total: Number(booking.totalPrice),
                    status: booking.status
                },
                tracking: {
                    trackingId: crm.trackingId,
                    campaignSource: crm.campaignSource,
                    campaignMedium: crm.campaignMedium,
                    campaignName: crm.campaignName
                }
            };

            await this.sendToCrm(crm.url, payload, crm.token, crm);
        } catch (error) {
            this.logger.error(`Failed to sync event booking ${bookingId}:`, error);
        }
    }

    private async sendToCrm(url: string, payload: any, token?: string | null, crmConfig?: any) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`CRM responded with ${response.status}: ${errorText}`);
            }

            // Register successful sync
            if (crmConfig?.id) {
                await (this.prisma as any).crmIntegration.update({
                    where: { id: crmConfig.id },
                    data: {
                        lastSync: new Date(),
                        syncCount: { increment: 1 },
                        lastError: null
                    }
                });
            }

            this.logger.log(`Successfully synced to CRM: ${payload.event} (${payload.source})`);
        } catch (error) {
            // Register failed sync
            if (crmConfig?.id) {
                await (this.prisma as any).crmIntegration.update({
                    where: { id: crmConfig.id },
                    data: {
                        failureCount: { increment: 1 },
                        lastError: error instanceof Error ? error.message : String(error)
                    }
                });
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
