import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { $Enums } from '@prisma/client';
import { ensureRestaurantAccess, type AuthenticatedUser } from '../../common/scope';

// Estados de reserva que NO procede valorar (cancelada, no presentada, sin confirmar, liberada).
const NON_REVIEWABLE_STATUSES: $Enums.ResBookingStatus[] = [
    $Enums.ResBookingStatus.CANCELLED,
    $Enums.ResBookingStatus.NO_SHOW,
    $Enums.ResBookingStatus.PENDING_CONFIRMATION,
    $Enums.ResBookingStatus.RELEASED,
    $Enums.ResBookingStatus.PENDING,
];

// Ventana de envío: la reserva tiene que haber terminado hace al menos 24h y como mucho 48h
// (margen para tolerar caídas / reservas creadas tarde).
const REVIEW_DELAY_HOURS = 24;
const REVIEW_WINDOW_HOURS = 48;

@Injectable()
export class RestaurantReviewService {
    private readonly logger = new Logger(RestaurantReviewService.name);

    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
    ) {}

    // Cada hora en punto: busca reservas finalizadas hace 24-48h y envía email de valoración.
    @Cron('0 0 * * * *')
    async handleReviewEmailsCron() {
        try {
            await this.dispatchPendingReviewEmails();
        } catch (err: any) {
            this.logger.error(`Review cron failed: ${err.message}`, err?.stack);
        }
    }

    async dispatchPendingReviewEmails() {
        const now = Date.now();
        const windowEnd = new Date(now - REVIEW_DELAY_HOURS * 3600 * 1000);
        const windowStart = new Date(now - REVIEW_WINDOW_HOURS * 3600 * 1000);

        const candidates = await this.prisma.resBooking.findMany({
            where: {
                reviewSent: false,
                date: { gte: windowStart, lte: windowEnd },
                guestEmail: { not: null },
                status: { notIn: NON_REVIEWABLE_STATUSES },
            },
            take: 200, // Salvaguarda
        });

        if (candidates.length === 0) return { sent: 0 };

        this.logger.log(`Sending review emails for ${candidates.length} bookings`);

        let sent = 0;
        for (const booking of candidates) {
            try {
                const token = booking.reviewToken || randomBytes(24).toString('hex');
                const updated = await this.prisma.resBooking.update({
                    where: { id: booking.id },
                    data: { reviewToken: token, reviewSent: true },
                });
                await this.mailService.sendRestaurantNotification(updated, 'review');
                sent++;
            } catch (err: any) {
                this.logger.error(`Review email failed for booking ${booking.id}: ${err.message}`);
            }
        }

        return { sent };
    }

    // --- Public flow (formulario de valoración) ---

    private async findBookingByReviewToken(id: string, token: string) {
        if (!id || !token) throw new BadRequestException('Faltan parámetros.');
        const booking = await this.prisma.resBooking.findUnique({
            where: { id },
            include: {
                restaurant: { select: { id: true, name: true, googleReviewUrl: true, reviewMinScoreForGoogle: true } },
                review: true,
            },
        });
        if (!booking || !booking.reviewToken || booking.reviewToken !== token) {
            throw new NotFoundException('Enlace de valoración no encontrado.');
        }
        return booking;
    }

    async getReviewForm(id: string, token: string) {
        const booking = await this.findBookingByReviewToken(id, token);
        return {
            id: booking.id,
            guestName: booking.guestName,
            date: booking.date,
            restaurantName: booking.restaurant.name,
            alreadySubmitted: !!booking.review,
        };
    }

    async submitReview(
        id: string,
        token: string,
        body: { serviceScore: number; ambianceScore: number; foodScore: number; advice?: string }
    ) {
        const booking = await this.findBookingByReviewToken(id, token);

        if (booking.review) {
            throw new ForbiddenException('Ya recibimos tu valoración. ¡Gracias!');
        }

        const scores = [body.serviceScore, body.ambianceScore, body.foodScore];
        for (const s of scores) {
            if (typeof s !== 'number' || !Number.isInteger(s) || s < 1 || s > 5) {
                throw new BadRequestException('Las puntuaciones deben ser números enteros entre 1 y 5.');
            }
        }

        const threshold = booking.restaurant.reviewMinScoreForGoogle ?? 4;
        const allHighEnough = scores.every(s => s >= threshold);
        const googleUrl = booking.restaurant.googleReviewUrl?.trim() || null;
        const redirectToGoogle = allHighEnough && !!googleUrl;

        await this.prisma.resReview.create({
            data: {
                bookingId: booking.id,
                restaurantId: booking.restaurantId,
                serviceScore: body.serviceScore,
                ambianceScore: body.ambianceScore,
                foodScore: body.foodScore,
                advice: body.advice?.trim() || null,
                redirectedToGoogle: redirectToGoogle,
            },
        });

        return {
            ok: true,
            redirectToGoogle,
            googleUrl: redirectToGoogle ? googleUrl : null,
        };
    }

    // --- Admin: listado para el panel ---

    async listReviewsForRestaurant(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const reviews = await this.prisma.resReview.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                booking: { select: { id: true, guestName: true, guestEmail: true, date: true, pax: true } },
            },
        });

        const total = reviews.length;
        const avg = (key: 'serviceScore' | 'ambianceScore' | 'foodScore') =>
            total === 0 ? null : Math.round((reviews.reduce((s, r) => s + r[key], 0) / total) * 10) / 10;

        return {
            total,
            averages: {
                service: avg('serviceScore'),
                ambiance: avg('ambianceScore'),
                food: avg('foodScore'),
                overall: total === 0 ? null : Math.round(
                    (reviews.reduce((s, r) => s + (r.serviceScore + r.ambianceScore + r.foodScore) / 3, 0) / total) * 10
                ) / 10,
            },
            redirectedToGoogleCount: reviews.filter(r => r.redirectedToGoogle).length,
            items: reviews,
        };
    }

    async listReviewsForHotel(hotelId: string, user?: AuthenticatedUser) {
        // Hotel+Restaurante = unidad: si el hotel está vinculado a un restaurante,
        // sus valoraciones son las del restaurante asociado.
        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { restaurantId: true },
        });
        if (!hotel?.restaurantId) {
            return { total: 0, averages: { service: null, ambiance: null, food: null, overall: null }, redirectedToGoogleCount: 0, items: [] };
        }
        return this.listReviewsForRestaurant(hotel.restaurantId, user);
    }
}
