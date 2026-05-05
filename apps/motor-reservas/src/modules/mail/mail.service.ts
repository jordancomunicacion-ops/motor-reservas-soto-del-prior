import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private prisma: PrismaService) {
        // Initialize Transporter with Outlook/Office365 defaults
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // TLS
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                ciphers: 'SSLv3',
                rejectUnauthorized: false
            }
        });
    }

    private processTemplate(html: string, data: any): string {
        if (!html) return '';
        let processed = html;
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            processed = processed.replace(regex, data[key]);
        });
        return processed;
    }

    async sendEmail(to: string, subject: string, html: string, fromName?: string, replyTo?: string) {
        try {
            const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
            const info = await this.transporter.sendMail({
                from: `"${fromName || 'SOTO DEL PRIOR'}" <${fromEmail}>`,
                to,
                replyTo: replyTo || fromEmail,
                subject,
                html,
            });
            this.logger.log(`Email sent successfully: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
            return null;
        }
    }

    // --- RESTAURANT NOTIFICATIONS ---

    async sendRestaurantNotification(booking: any, type: string) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: booking.restaurantId }
        });

        if (!restaurant) return;

        const templates: any = restaurant.emailTemplates || {};
        const customHtml = templates[type];
        
        let html = '';
        let subject = '';

        const data = {
            name: booking.guestName,
            date: new Date(booking.date).toLocaleDateString(),
            time: new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            pax: booking.pax,
            restaurant_name: restaurant.name,
            modify_link: `https://motor.sotodelprior.com/restaurant/modify?id=${booking.id}`
        };

        if (customHtml && customHtml.trim() !== '') {
            html = this.processTemplate(customHtml, data);
            subject = type === 'created' ? `Nueva reserva en ${restaurant.name}` : 
                      type === 'confirmed' ? `Reserva confirmada - ${restaurant.name}` : 
                      type === 'cancelled' ? `Reserva cancelada - ${restaurant.name}` :
                      type === 'reminder' ? `Recordatorio de reserva - ${restaurant.name}` :
                      type === 'waitlist_join' ? `En lista de espera - ${restaurant.name}` :
                      type === 'waitlist_available' ? `Mesa disponible - ${restaurant.name}` :
                      `Reserva modificada - ${restaurant.name}`;
        } else {
            // Fallback to basic internal templates if no custom HTML
            const statusText = type === 'created' ? 'recibida' : type === 'confirmed' ? 'confirmada' : type === 'cancelled' ? 'cancelada' : type === 'reminder' ? 'recordada' : 'procesada';
            html = `<h1>${restaurant.name}</h1><p>Hola ${booking.guestName}, tu solicitud para el ${data.date} ha sido ${statusText}.</p>`;
            subject = `${restaurant.name} - Notificación de Reserva`;
        }

        await this.sendEmail(
            booking.guestEmail, 
            subject, 
            html, 
            restaurant.name, 
            restaurant.contactEmail || undefined
        );
    }

    // --- HOTEL NOTIFICATIONS ---
    async sendHotelNotification(booking: any, type: string) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: booking.hotelId }
        });

        if (!hotel) return;

        const templates: any = hotel.emailTemplates || {};
        const customHtml = templates[type];
        
        let html = '';
        let subject = '';

        const data = {
            name: booking.guestName,
            hotel_name: hotel.name,
            check_in: new Date(booking.checkInDate).toLocaleDateString(),
            check_out: new Date(booking.checkOutDate).toLocaleDateString(),
            reference: booking.referenceCode,
            nights: booking.nights,
            total_price: `${booking.totalPrice} ${booking.currency}`,
            room_type: booking.roomType?.name || 'Habitación',
            modify_link: `https://motor.sotodelprior.com/hotel/modify?id=${booking.id}`
        };

        if (customHtml && customHtml.trim() !== '') {
            html = this.processTemplate(customHtml, data);
            subject = type === 'created' ? `Solicitud de estancia en ${hotel.name}` : 
                      type === 'confirmed' ? `Estancia confirmada - ${hotel.name}` : 
                      type === 'cancelled' ? `Estancia cancelada - ${hotel.name}` :
                      type === 'reminder' ? `Recordatorio de estancia - ${hotel.name}` :
                      `Estancia modificada - ${hotel.name}`;
        } else {
            const statusText = type === 'created' ? 'recibida' : type === 'confirmed' ? 'confirmada' : type === 'cancelled' ? 'cancelada' : type === 'reminder' ? 'recordada' : 'modificada';
            html = `<h1>${hotel.name}</h1><p>Hola ${booking.guestName}, tu estancia del ${data.check_in} al ${data.check_out} ha sido ${statusText}.</p>`;
            subject = `${hotel.name} - Notificación de Estancia`;
        }

        await this.sendEmail(
            booking.guestEmail, 
            subject, 
            html, 
            hotel.name, 
            hotel.contactEmail || undefined
        );
    }

    async sendTestEmail(params: {
        to: string,
        entityId: string,
        entityType: 'hotel' | 'restaurant',
        templateType: string
    }) {
        const { to, entityId, entityType, templateType } = params;

        if (entityType === 'restaurant') {
            const mockBooking = {
                id: 'test-id',
                restaurantId: entityId,
                guestName: 'Cliente de Prueba',
                guestEmail: to,
                date: new Date(),
                pax: 2
            };
            return this.sendRestaurantNotification(mockBooking, templateType);
        } else {
            const mockBooking = {
                id: 'test-id',
                hotelId: entityId,
                guestName: 'Huésped de Prueba',
                guestEmail: to,
                checkInDate: new Date(),
                checkOutDate: new Date(Date.now() + 86400000),
                referenceCode: 'TEST-1234',
                nights: 1,
                totalPrice: 150,
                currency: 'EUR',
                roomType: { name: 'Suite de Prueba' }
            };
            return this.sendHotelNotification(mockBooking, templateType);
        }
    }
}
