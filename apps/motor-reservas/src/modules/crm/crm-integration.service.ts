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
                include: { hotel: { include: { restaurant: true } }, guest: true }
            });

            if (!booking || !booking.hotel) return;

            const hotelIntegrations = (booking.hotel.integrations as any) || {};
            let crm = hotelIntegrations.crm;

            if ((!crm || !crm.enabled) && booking.hotel.restaurant) {
                const restIntegrations = (booking.hotel.restaurant.integrations as any) || {};
                if (restIntegrations.crm?.enabled) {
                    crm = restIntegrations.crm;
                }
            }

            if (!crm || !crm.enabled || !crm.url) return;

            const [firstName, ...rest] = booking.guestName.split(' ');
            const lastName = rest.join(' ') || '';

            const payload = {
                source: 'HOTEL_RESERVATIONS',
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
                }
            };

            await this.sendToCrm(crm.url, payload, crm.token);
        } catch (error) {
            this.logger.error(`Failed to sync hotel booking ${bookingId}:`, error);
        }
    }

    async syncRestaurantBooking(bookingId: string, event: 'CREATED' | 'UPDATED' | 'CANCELLED' = 'CREATED') {
        try {
            const booking = await this.prisma.resBooking.findUnique({
                where: { id: bookingId },
                include: { restaurant: { include: { hotel: true } } }
            });

            if (!booking || !booking.restaurant) return;

            const restIntegrations = (booking.restaurant.integrations as any) || {};
            let crm = restIntegrations.crm;

            if ((!crm || !crm.enabled) && booking.restaurant.hotel) {
                const hotelIntegrations = (booking.restaurant.hotel.integrations as any) || {};
                if (hotelIntegrations.crm?.enabled) {
                    crm = hotelIntegrations.crm;
                }
            }

            if (!crm || !crm.enabled || !crm.url) return;

            const [firstName, ...rest] = booking.guestName.split(' ');
            const lastName = rest.join(' ') || '';

            const payload = {
                source: 'RESTAURANT_RESERVATIONS',
                event: `RESERVATION_${event}`,
                guest: {
                    email: booking.guestEmail,
                    phone: booking.guestPhone,
                    name: booking.guestName,
                    firstName,
                    lastName,
                    notes: booking.notes,
                    tags: booking.tags // "VIP", "ALLERGIES", etc.
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
                    restaurantName: booking.restaurant.name
                }
            };

            await this.sendToCrm(crm.url, payload, crm.token);
        } catch (error) {
            this.logger.error(`Failed to sync restaurant booking ${bookingId}:`, error);
        }
    }

    async syncEventBooking(bookingId: string, event: 'CREATED' | 'UPDATED' | 'CANCELLED' = 'CREATED') {
        try {
            const booking = await this.prisma.eventBooking.findUnique({
                where: { id: bookingId },
                include: { 
                    event: { 
                        include: { 
                            hotel: { include: { restaurant: true } }, 
                            restaurant: { include: { hotel: true } } 
                        } 
                    } 
                }
            });

            if (!booking) return;

            const primaryEntity = booking.event.hotel || booking.event.restaurant;
            if (!primaryEntity) return;

            let integrations = (primaryEntity.integrations as any) || {};
            let crm = integrations.crm;

            if (!crm || !crm.enabled) {
                const linkedEntity = (primaryEntity as any).hotel || (primaryEntity as any).restaurant;
                if (linkedEntity) {
                    const linkedIntegrations = (linkedEntity.integrations as any) || {};
                    if (linkedIntegrations.crm?.enabled) {
                        crm = linkedIntegrations.crm;
                    }
                }
            }

            if (!crm || !crm.enabled || !crm.url) return;

            const [firstName, ...rest] = booking.guestName.split(' ');
            const lastName = rest.join(' ') || '';

            const payload = {
                source: 'EVENT_RESERVATIONS',
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
                }
            };

            await this.sendToCrm(crm.url, payload, crm.token);
        } catch (error) {
            this.logger.error(`Failed to sync event booking ${bookingId}:`, error);
        }
    }

    private async sendToCrm(url: string, payload: any, token?: string) {
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
                throw new Error(`CRM responded with ${response.status}`);
            }

            this.logger.log(`Successfully synced to CRM: ${payload.event} (${payload.source})`);
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
