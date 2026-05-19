import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { $Enums } from '@prisma/client';
import { ensureHotelAccess, type AuthenticatedUser } from '../../common/scope';

// Estados de reserva que NO procede valorar.
const NON_REVIEWABLE_STATUSES: $Enums.BookingStatus[] = [
    $Enums.BookingStatus.CANCELLED,
    $Enums.BookingStatus.PENDING,
];

// Ventana: checkOut entre hace 24h y 48h.
const REVIEW_DELAY_HOURS = 24;
const REVIEW_WINDOW_HOURS = 48;

@Injectable()
export class HotelReviewService {
    private readonly logger = new Logger(HotelReviewService.name);

    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
    ) {}

    // Cada hora: busca reservas cuyo checkOut fue hace 24-48h y manda el email.
    @Cron('0 5 * * * *') // 5 minutos pasada la hora, para no chocar con el cron de restaurantes (en :00)
    async handleReviewEmailsCron() {
        try {
            await this.dispatchPendingReviewEmails();
        } catch (err: any) {
            this.logger.error(`Hotel review cron failed: ${err.message}`, err?.stack);
        }
    }

    async dispatchPendingReviewEmails() {
        const now = Date.now();
        const windowEnd = new Date(now - REVIEW_DELAY_HOURS * 3600 * 1000);
        const windowStart = new Date(now - REVIEW_WINDOW_HOURS * 3600 * 1000);

        const candidates = await this.prisma.booking.findMany({
            where: {
                reviewSent: false,
                checkOutDate: { gte: windowStart, lte: windowEnd },
                guestEmail: { not: null },
                status: { notIn: NON_REVIEWABLE_STATUSES },
            },
            take: 200,
        });

        if (candidates.length === 0) return { sent: 0 };

        this.logger.log(`Sending hotel review emails for ${candidates.length} bookings`);

        let sent = 0;
        for (const booking of candidates) {
            try {
                const token = booking.reviewToken || randomBytes(24).toString('hex');
                const updated = await this.prisma.booking.update({
                    where: { id: booking.id },
                    data: { reviewToken: token, reviewSent: true },
                });
                await this.mailService.sendHotelNotification(updated, 'review');
                sent++;
            } catch (err: any) {
                this.logger.error(`Hotel review email failed for booking ${booking.id}: ${err.message}`);
            }
        }

        return { sent };
    }

    // --- Public flow ---

    private async findBookingByReviewToken(id: string, token: string) {
        if (!id || !token) throw new BadRequestException('Faltan parámetros.');
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                hotel: { select: { id: true, name: true, googleReviewUrl: true, reviewMinScoreForGoogle: true } },
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
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            hotelName: booking.hotel.name,
            alreadySubmitted: !!booking.review,
        };
    }

    async submitReview(
        id: string,
        token: string,
        body: { serviceScore: number; roomScore: number; cleanlinessScore: number; advice?: string }
    ) {
        const booking = await this.findBookingByReviewToken(id, token);

        if (booking.review) {
            throw new ForbiddenException('Ya recibimos tu valoración. ¡Gracias!');
        }

        const scores = [body.serviceScore, body.roomScore, body.cleanlinessScore];
        for (const s of scores) {
            if (typeof s !== 'number' || !Number.isInteger(s) || s < 1 || s > 5) {
                throw new BadRequestException('Las puntuaciones deben ser números enteros entre 1 y 5.');
            }
        }

        const threshold = booking.hotel.reviewMinScoreForGoogle ?? 4;
        const allHighEnough = scores.every(s => s >= threshold);
        const googleUrl = booking.hotel.googleReviewUrl?.trim() || null;
        const redirectToGoogle = allHighEnough && !!googleUrl;

        await this.prisma.hotelReview.create({
            data: {
                bookingId: booking.id,
                hotelId: booking.hotelId,
                serviceScore: body.serviceScore,
                roomScore: body.roomScore,
                cleanlinessScore: body.cleanlinessScore,
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

    // --- Admin ---

    async listReviewsForHotel(hotelId: string, user?: AuthenticatedUser) {
        if (user) await ensureHotelAccess(user, this.prisma, hotelId);
        const reviews = await this.prisma.hotelReview.findMany({
            where: { hotelId },
            orderBy: { createdAt: 'desc' },
            take: 200,
            include: {
                booking: { select: { id: true, guestName: true, guestEmail: true, checkInDate: true, checkOutDate: true, referenceCode: true } },
            },
        });

        const total = reviews.length;
        const avg = (key: 'serviceScore' | 'roomScore' | 'cleanlinessScore') =>
            total === 0 ? null : Math.round((reviews.reduce((s, r) => s + r[key], 0) / total) * 10) / 10;

        return {
            total,
            averages: {
                service: avg('serviceScore'),
                room: avg('roomScore'),
                cleanliness: avg('cleanlinessScore'),
                overall: total === 0 ? null : Math.round(
                    (reviews.reduce((s, r) => s + (r.serviceScore + r.roomScore + r.cleanlinessScore) / 3, 0) / total) * 10
                ) / 10,
            },
            redirectedToGoogleCount: reviews.filter(r => r.redirectedToGoogle).length,
            items: reviews,
        };
    }
}
