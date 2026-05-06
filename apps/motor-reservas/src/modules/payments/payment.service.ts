import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private stripeClients: Map<string, any> = new Map();

    constructor(private prisma: PrismaService) { }

    /**
     * Gets or creates a Stripe client for a specific restaurant/hotel
     */
    private async getStripeClient(entityId: string, entityType: 'hotel' | 'restaurant'): Promise<any> {
        // Check cache
        if (this.stripeClients.has(entityId)) {
            return this.stripeClients.get(entityId)!;
        }

        // Fetch entity to get keys
        let integrations: any = null;
        if (entityType === 'hotel') {
            const hotel = await this.prisma.hotel.findUnique({ where: { id: entityId } });
            integrations = hotel?.integrations;
        } else {
            const res = await this.prisma.restaurant.findUnique({ where: { id: entityId } });
            integrations = res?.integrations;
        }

        const stripeConfig = integrations?.stripe;
        if (!stripeConfig?.enabled || !stripeConfig?.secretKey) {
            throw new BadRequestException(`Stripe no está configurado para este ${entityType}.`);
        }

        const stripe = new Stripe(stripeConfig.secretKey, {
            apiVersion: '2025-01-27-preview' as any, // Use latest stable
        });

        this.stripeClients.set(entityId, stripe);
        return stripe;
    }

    async createSetupIntent(bookingId: string, entityId: string, entityType: 'hotel' | 'restaurant') {
        const stripe = await this.getStripeClient(entityId, entityType);
        
        // Find booking to get guest info
        const booking = entityType === 'restaurant' 
            ? await this.prisma.resBooking.findUnique({ where: { id: bookingId } })
            : null; // TODO: Add hotel booking support

        if (!booking) throw new BadRequestException('Booking not found');

        // Create or get customer
        let customerId = (booking as any).stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: (booking as any).guestEmail,
                name: (booking as any).guestName,
                metadata: { bookingId, entityId }
            });
            customerId = customer.id;

            // Update booking
            if (entityType === 'restaurant') {
                await this.prisma.resBooking.update({
                    where: { id: bookingId },
                    data: { stripeCustomerId: customerId }
                });
            }
        }

        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
            payment_method_types: ['card'],
            metadata: { bookingId }
        });

        return {
            clientSecret: setupIntent.client_secret,
            customerId
        };
    }

    async savePaymentMethod(bookingId: string, paymentMethodId: string, entityId?: string, entityType?: 'hotel' | 'restaurant') {
        let eId = entityId;
        let eType = entityType;

        if (!eId || !eType) {
            const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
            if (!booking) throw new BadRequestException('Reserva no encontrada para autodetectar entidad.');
            eId = booking.restaurantId;
            eType = 'restaurant';
        }

        const stripe = await this.getStripeClient(eId, eType);
        
        const booking = eType === 'restaurant' 
            ? await this.prisma.resBooking.findUnique({ where: { id: bookingId } })
            : null;

        if (!booking || !(booking as any).stripeCustomerId) throw new BadRequestException('Booking or Customer not found');

        // Attach payment method to customer
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: (booking as any).stripeCustomerId,
        });

        // Set as default for customer
        await stripe.customers.update((booking as any).stripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        // Save in DB
        if (eType === 'restaurant') {
            return this.prisma.resBooking.update({
                where: { id: bookingId },
                data: { stripePaymentMethodId: paymentMethodId }
            });
        }
    }

    async chargeNoShowFee(bookingId: string, entityId?: string, entityType?: 'hotel' | 'restaurant') {
        let eId = entityId;
        let eType = entityType;

        if (!eId || !eType) {
            const booking = await this.prisma.resBooking.findUnique({ where: { id: bookingId } });
            if (!booking) throw new BadRequestException('Reserva no encontrada.');
            eId = booking.restaurantId;
            eType = 'restaurant';
        }

        const stripe = await this.getStripeClient(eId, eType);

        const booking = entityType === 'restaurant' 
            ? await this.prisma.resBooking.findUnique({ where: { id: bookingId } })
            : null;

        if (!booking || !(booking as any).stripeCustomerId || !(booking as any).stripePaymentMethodId) {
            throw new BadRequestException('No hay tarjeta guardada para esta reserva.');
        }

        // Get fee from config
        let amount = 0;
        let currency = 'eur';
        
        if (entityType === 'restaurant') {
            const restaurant = await this.prisma.restaurant.findUnique({ 
                where: { id: entityId },
                include: { widgetConfig: true } 
            });
            // We store fee in EUR units (e.g. 20.00), Stripe wants cents
            amount = (restaurant?.widgetConfig as any)?.noShowFee * 100 || 2000;
        }

        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                customer: (booking as any).stripeCustomerId,
                payment_method: (booking as any).stripePaymentMethodId,
                off_session: true,
                confirm: true,
                description: `Penalización No-Show Reserva ${bookingId}`,
                metadata: { bookingId }
            });

            return { success: true, paymentIntentId: paymentIntent.id };
        } catch (e) {
            this.logger.error(`Error charging no-show fee: ${e.message}`);
            return { success: false, error: e.message };
        }
    }
}
