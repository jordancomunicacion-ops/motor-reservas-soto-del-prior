import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfidentialClientApplication } from '@azure/msal-node';
import 'isomorphic-fetch';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';

type GraphConfig = {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    senderEmail: string;
};

@Injectable()
export class MailService {
    private defaultTransporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor(private prisma: PrismaService) {
        // Initialize Default Transporter from .env
        this.defaultTransporter = nodemailer.createTransport({
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

    private getTransporter(customConfig?: any): nodemailer.Transporter {
        const config = {
            host: customConfig?.host || process.env.SMTP_HOST || 'smtp.office365.com',
            port: parseInt(customConfig?.port || process.env.SMTP_PORT || '587'),
            secure: customConfig?.secure || false,
            auth: {
                user: customConfig?.user || process.env.SMTP_USER,
                pass: customConfig?.pass || process.env.SMTP_PASS,
            },
            tls: {
                ciphers: 'SSLv3', // Required for some Outlook/Office 365 setups
                rejectUnauthorized: false
            }
        };

        return nodemailer.createTransport(config);
    }

    private escapeHtml(value: unknown): string {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private processTemplate(html: string, data: any): string {
        if (!html) return '';
        let processed = html;
        // Allow a small whitelist of "raw" placeholders (already-safe URLs we generate).
        const rawAllowed = new Set(['modify_link', 'cancel_link', 'confirm_link']);
        Object.keys(data || {}).forEach(key => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            const replacement = rawAllowed.has(key) ? String(data[key] ?? '') : this.escapeHtml(data[key]);
            processed = processed.replace(regex, replacement);
        });
        return processed;
    }

    private resolveGraphConfig(customConfig?: any): GraphConfig | null {
        const tenantId = customConfig?.graph?.tenantId || process.env.GRAPH_TENANT_ID;
        const clientId = customConfig?.graph?.clientId || process.env.GRAPH_CLIENT_ID;
        const clientSecret = customConfig?.graph?.clientSecret || process.env.GRAPH_CLIENT_SECRET;
        const senderEmail = customConfig?.graph?.senderEmail || customConfig?.from || customConfig?.user || process.env.GRAPH_SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

        if (!tenantId || !clientId || !clientSecret || !senderEmail) return null;
        return { tenantId, clientId, clientSecret, senderEmail };
    }

    private async getGraphClient(config: GraphConfig): Promise<GraphClient> {
        const cca = new ConfidentialClientApplication({
            auth: {
                clientId: config.clientId,
                authority: `https://login.microsoftonline.com/${config.tenantId}`,
                clientSecret: config.clientSecret,
            },
        });
        const tokenResponse = await cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default'],
        });
        if (!tokenResponse?.accessToken) {
            throw new Error('Could not acquire Graph access token');
        }
        const accessToken = tokenResponse.accessToken;
        return GraphClient.init({
            authProvider: (done) => done(null, accessToken),
        });
    }

    private async sendViaGraph(
        graphConfig: GraphConfig,
        to: string,
        subject: string,
        html: string,
        fromName?: string,
        replyTo?: string,
    ): Promise<{ messageId: string } | null> {
        try {
            const client = await this.getGraphClient(graphConfig);
            const message: any = {
                subject,
                body: { contentType: 'HTML', content: html },
                toRecipients: [{ emailAddress: { address: to } }],
            };
            if (replyTo) {
                message.replyTo = [{ emailAddress: { address: replyTo } }];
            }
            // Note: 'from' cannot be arbitrary - Graph uses the authenticated user's address.
            // The senderEmail must be a real mailbox the app has SendAs/Send permission to.
            await client
                .api(`/users/${encodeURIComponent(graphConfig.senderEmail)}/sendMail`)
                .post({ message, saveToSentItems: true });
            const messageId = `graph-${Date.now()}`;
            this.logger.log(`Email sent via Graph to ${to} (from ${graphConfig.senderEmail})${fromName ? ` as "${fromName}"` : ''}`);
            return { messageId };
        } catch (error: any) {
            this.logger.error(`Graph sendMail failed to ${to}: ${error.message}`, error?.stack);
            return null;
        }
    }

    async sendEmail(to: string, subject: string, html: string, fromName?: string, replyTo?: string, customConfig?: any) {
        // Try Microsoft Graph first if configured (preferred over SMTP for Office 365 tenants)
        const graphConfig = this.resolveGraphConfig(customConfig);
        if (graphConfig) {
            const graphResult = await this.sendViaGraph(graphConfig, to, subject, html, fromName, replyTo);
            if (graphResult) return graphResult;
            this.logger.warn(`Graph send failed for ${to}. Falling back to SMTP if configured.`);
        }

        try {
            const transporter = this.getTransporter(customConfig);

            // Outlook Requirement: The 'from' email MUST match the authenticated 'user' email
            // if 'customConfig.from' is provided, we use it, otherwise we fallback to the authenticated user.
            const authenticatedUser = customConfig?.user || process.env.SMTP_USER;
            const fromEmail = customConfig?.from || authenticatedUser;

            if (!authenticatedUser) {
                this.logger.warn(`Skipping email to ${to}: No SMTP or Graph configuration. Configure it in the restaurant admin panel or .env file.`);
                return null;
            }

            const info = await transporter.sendMail({
                from: `"${fromName || 'SOTO DEL PRIOR'}" <${fromEmail}>`,
                to,
                replyTo: replyTo || fromEmail,
                subject,
                html,
            });
            this.logger.log(`Email sent successfully to ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}. Host: ${customConfig?.host || process.env.SMTP_HOST}. Error: ${error.message}`, error.stack);
            return null;
        }
    }

    async verifyGraphConfig(config: GraphConfig) {
        try {
            const client = await this.getGraphClient(config);
            // Try to read mailbox settings to validate token & permissions
            const result = await client.api(`/users/${encodeURIComponent(config.senderEmail)}`).select('mail,userPrincipalName,displayName').get();
            return { success: true, message: `Configuración Graph válida. Mailbox: ${result.userPrincipalName || result.mail}` };
        } catch (error: any) {
            const hint = this.getGraphErrorHint(error);
            return { success: false, message: `Error de Graph: ${error.message}`, hint };
        }
    }

    private getGraphErrorHint(error: any): string {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('aadsts7000215') || msg.includes('invalid client secret')) {
            return 'Client Secret incorrecto o expirado. Genera uno nuevo en Azure Portal → App Registrations → tu app → Certificates & secrets.';
        }
        if (msg.includes('aadsts700016') || msg.includes('application with identifier')) {
            return 'Client ID incorrecto o la app no existe en el tenant. Revisa la App Registration en Azure.';
        }
        if (msg.includes('aadsts90002') || msg.includes('tenant')) {
            return 'Tenant ID incorrecto. Búscalo en Azure Portal → Microsoft Entra ID → Overview.';
        }
        if (msg.includes('forbidden') || msg.includes('403')) {
            return 'Permisos insuficientes. La app necesita Mail.Send (Application) y consentimiento de admin en Azure → API permissions.';
        }
        if (msg.includes('user not found') || msg.includes('404')) {
            return 'El senderEmail no existe en este tenant o no tiene mailbox. Verifica que es un email válido del tenant.';
        }
        return 'Revisa Azure Portal: App Registration, API permissions (Mail.Send), Admin consent, y que senderEmail tenga buzón.';
    }

    async verifyConnection(config: { host: string; port: number; user: string; pass: string; secure?: boolean }) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: Number(config.port) || 587,
                secure: config.secure || false,
                auth: {
                    user: config.user,
                    pass: config.pass,
                },
                tls: {
                    ciphers: 'SSLv3',
                    rejectUnauthorized: false
                }
            });
            await transporter.verify();
            this.logger.log(`SMTP connection verified for ${config.user}@${config.host}`);
            return { success: true, message: 'Conexión SMTP exitosa. Las credenciales son correctas.' };
        } catch (error: any) {
            this.logger.error(`SMTP verification failed: ${error.message}`);
            const hint = this.getErrorHint(error);
            return {
                success: false,
                message: `Error de conexión SMTP: ${error.message}`,
                hint
            };
        }
    }

    private getErrorHint(error: any): string {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('authentication') || msg.includes('535') || msg.includes('5.7.3')) {
            return 'Credenciales incorrectas. Para Outlook/Office365, debes usar una "Contraseña de aplicación" (no tu contraseña normal). Generala en https://account.microsoft.com/security/ o en el panel de admin de Microsoft 365.';
        }
        if (msg.includes('etimedout') || msg.includes('econnrefused')) {
            return 'No se puede conectar al servidor SMTP. Verifica el host y puerto. Outlook: smtp-mail.outlook.com:587. Office365: smtp.office365.com:587. Gmail: smtp.gmail.com:587.';
        }
        if (msg.includes('tls') || msg.includes('ssl')) {
            return 'Error de seguridad TLS/SSL. Prueba con puerto 587 (STARTTLS) o 465 (SSL).';
        }
        return 'Verifica host, puerto, usuario y contraseña. Para Gmail/Outlook, usa una contraseña de aplicación, no la contraseña normal.';
    }

    // --- RESTAURANT NOTIFICATIONS ---

    async sendRestaurantNotification(booking: any, type: string, extraData: any = {}) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: booking.restaurantId }
        });

        if (!restaurant) return;

        const mailConfig: any = restaurant.mailConfig || {};
        
        // NEW: Check if notifications are enabled (stored in mailConfig to avoid schema changes)
        if (mailConfig.notificationsEnabled === false) {
            this.logger.log(`Skipping email notification for restaurant ${restaurant.name}: Notifications are disabled.`);
            return;
        }


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
            modify_link: `https://motor.sotodelprior.com/restaurant/modify?id=${booking.id}`,
            ...extraData
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
            const statusText = type === 'created' ? 'recibida' : type === 'confirmed' ? 'confirmada' : type === 'cancelled' ? 'cancelada' : type === 'reminder' ? 'recordada' : 'procesada';
            html = `<h1>${this.escapeHtml(restaurant.name)}</h1><p>Hola ${this.escapeHtml(booking.guestName)}, tu solicitud para el ${this.escapeHtml(data.date)} ha sido ${statusText}.</p>`;
            subject = `${restaurant.name} - Notificación de Reserva`;
        }

        return await this.sendEmail(
            booking.guestEmail,
            subject,
            html,
            restaurant.name,
            restaurant.contactEmail || undefined,
            mailConfig
        );
    }

    // --- HOTEL NOTIFICATIONS ---
    async sendHotelNotification(booking: any, type: string) {
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: booking.hotelId }
        });

        if (!hotel) return;

        const mailConfig: any = hotel.mailConfig || {};

        // NEW: Check if notifications are enabled (stored in mailConfig to avoid schema changes)
        if (mailConfig.notificationsEnabled === false) {
            this.logger.log(`Skipping email notification for hotel ${hotel.name}: Notifications are disabled.`);
            return;
        }


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
            html = `<h1>${this.escapeHtml(hotel.name)}</h1><p>Hola ${this.escapeHtml(booking.guestName)}, tu estancia del ${this.escapeHtml(data.check_in)} al ${this.escapeHtml(data.check_out)} ha sido ${statusText}.</p>`;
            subject = `${hotel.name} - Notificación de Estancia`;
        }

        await this.sendEmail(
            booking.guestEmail, 
            subject, 
            html, 
            hotel.name, 
            hotel.contactEmail || undefined,
            mailConfig
        );
    }

    async sendTestEmail(params: {
        to: string,
        entityId: string,
        entityType: 'hotel' | 'restaurant',
        templateType: string
    }): Promise<any> {
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
