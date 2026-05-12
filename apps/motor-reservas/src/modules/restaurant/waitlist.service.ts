import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class WaitlistService {
    private readonly logger = new Logger(WaitlistService.name);

    constructor(
        private prisma: PrismaService,
        private mailService: MailService
    ) {}

    /**
     * Triggered when a reservation is cancelled or a table becomes free.
     * Searches for suitable waitlist entries and notifies the first one.
     */
    async checkWaitlistForAvailability(restaurantId: string, date: Date, shiftId?: string) {
        this.logger.log(`Checking waitlist for restaurant ${restaurantId} on date ${date.toISOString()}`);

        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0,0,0,0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23,59,59,999);

        // 1. Find all WAITING entries for this day
        const waitlistEntries = await this.prisma.restaurantWaitlist.findMany({
            where: {
                restaurantId,
                date: { gte: startOfDay, lte: endOfDay },
                status: 'WAITING',
                ...(shiftId ? { shiftId } : {})
            },
            orderBy: { createdAt: 'asc' }
        });

        if (waitlistEntries.length === 0) return;

        // 2. For each entry, check if there's enough room now
        // This is a simplified check. In a full implementation, we'd call the availability logic.
        // For now, if someone cancelled, we notify the first person in line as a 'potential' opening.
        
        for (const entry of waitlistEntries) {
            // Send notification email
            await this.notifyGuest(entry);
            
            // We only notify the first one to avoid over-booking the same freed slot
            // They have priority. If they don't confirm in X time, it goes to next (impl later)
            break; 
        }
    }

    private async notifyGuest(entry: any) {
        try {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: entry.restaurantId }
            });

            await this.prisma.restaurantWaitlist.update({
                where: { id: entry.id },
                data: { 
                    status: 'NOTIFIED',
                    notifiedAt: new Date()
                }
            });

            const now = new Date();
            const hoursUntilService = (new Date(entry.date).getTime() - now.getTime()) / (1000 * 60 * 60);
            const isUrgent = hoursUntilService < 48;

            // 1. Notify GUEST
            await this.mailService.sendRestaurantNotification(
                {
                    restaurantId: entry.restaurantId,
                    guestName: entry.name,
                    guestEmail: entry.email,
                    pax: entry.pax,
                    date: entry.date,
                    id: 'waitlist-' + entry.id
                },
                'waitlist_available',
                {
                    confirm_link: `https://reservas.sotodelprior.com/confirmar-espera?id=${entry.id}`,
                    urgent_note: isUrgent ? 'Debido a la proximidad de la reserva, te recomendamos confirmar lo antes posible.' : ''
                }
            );

            // 2. Notify ADMIN
            if (restaurant?.contactEmail) {
                const subject = isUrgent 
                    ? `🚨 URGENTE: Hueco en Lista de Espera - ${restaurant.name}` 
                    : `Aviso: Hueco en Lista de Espera - ${restaurant.name}`;
                
                const html = `
                    <h3>¡Se ha liberado un hueco!</h3>
                    <p>Una reserva ha sido cancelada para el <strong>${new Date(entry.date).toLocaleDateString()}</strong>.</p>
                    <p>El sistema ha notificado automáticamente al primer cliente en lista de espera:</p>
                    <ul>
                        <li><strong>Cliente:</strong> ${entry.name}</li>
                        <li><strong>Pax:</strong> ${entry.pax}</li>
                        <li><strong>Email:</strong> ${entry.email}</li>
                        <li><strong>Teléfono:</strong> ${entry.phone || 'No proporcionado'}</li>
                    </ul>
                    ${isUrgent ? `
                    <div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px; color: #c53030;">
                        <strong>⚠️ AVISO URGENTE:</strong> Faltan menos de 48h para el servicio. 
                        Te recomendamos llamar directamente al cliente para asegurar la mesa.
                    </div>
                    ` : '<p>El cliente tiene un enlace para confirmar online.</p>'}
                    <p><a href="https://reservas.sotodelprior.com/admin/restaurant/${restaurant.id}">Ir al Panel de Control</a></p>
                `;

                await this.mailService.sendEmail(
                    restaurant.contactEmail,
                    subject,
                    html,
                    'SOTOdelPRIOR Sistema',
                    undefined,
                    restaurant.mailConfig
                );
            }

            this.logger.log(`Guest ${entry.email} notified for waitlist ${entry.id}. Urgent: ${isUrgent}`);
        } catch (e) {
            this.logger.error(`Error notifying waitlist guest: ${e.message}`);
        }
    }

    async confirmWaitlistEntry(waitlistId: string) {
        const entry = await this.prisma.restaurantWaitlist.findUnique({
            where: { id: waitlistId }
        });

        if (!entry || (entry.status !== 'NOTIFIED' && entry.status !== 'WAITING')) {
            throw new Error('Entrada de lista de espera no válida o ya procesada.');
        }

        // Convert to real booking
        const booking = await this.prisma.resBooking.create({
            data: {
                restaurantId: entry.restaurantId,
                date: entry.date,
                pax: entry.pax,
                guestName: entry.name,
                guestEmail: entry.email,
                guestPhone: entry.phone,
                status: 'CONFIRMED',
                origin: 'WAITLIST'
            }
        });

        // Update waitlist status
        await this.prisma.restaurantWaitlist.update({
            where: { id: waitlistId },
            data: { status: 'CONFIRMED' }
        });

        return booking;
    }
}
