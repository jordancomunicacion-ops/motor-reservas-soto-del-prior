import { Controller, Get, Query, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../auth/roles.decorator';
import { getUserScope, type AuthenticatedRequest } from '../../common/scope';

type RecentBooking = {
    id: string;
    type: 'hotel' | 'restaurant';
    customerName: string;
    customerEmail: string | null;
    amount: number;
    entityName: string;
    date: Date | string;
};

@Controller('global')
export class GlobalController {
    private readonly logger = new Logger(GlobalController.name);

    constructor(private prisma: PrismaService) { }

    @Roles('ADMIN')
    @Get('contexts')
    async getContexts(@Req() req: AuthenticatedRequest) {
        const scope = await getUserScope(req?.user, this.prisma);

        const [hotels, restaurants] = await Promise.all([
            this.prisma.hotel.findMany({
                where: scope.hotelIds === null ? {} : { id: { in: scope.hotelIds } },
                select: { id: true, name: true, restaurantId: true },
            }),
            this.prisma.restaurant.findMany({
                where: scope.restaurantIds === null ? {} : { id: { in: scope.restaurantIds } },
                select: { id: true, name: true },
            }),
        ]);

        this.logger.debug(`contexts for ${req?.user?.email ?? '?'} (hotelId=${req?.user?.hotelId ?? null}, restaurantId=${req?.user?.restaurantId ?? null}) -> ${hotels.length} hotels, ${restaurants.length} restaurants`);

        return { hotels, restaurants };
    }

    /**
     * Devuelve KPIs y reservas recientes.
     *
     * Filtrado:
     *   - Sin params: alcance del usuario (super-admin = global; usuario con scope = sus entidades).
     *   - ?ctxType=hotel&ctxId=ID: solo ese hotel + el restaurante vinculado si existe (sinergia).
     *   - ?ctxType=restaurant&ctxId=ID: solo ese restaurante + el hotel vinculado si existe.
     */
    @Roles('ADMIN')
    @Get('stats')
    async getStats(
        @Req() req: AuthenticatedRequest,
        @Query('ctxType') ctxType?: string,
        @Query('ctxId') ctxId?: string,
    ) {
        const now = new Date();
        // Rangos calendario: mes actual MTD vs mes anterior completo.
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        // Semana ISO (lunes a domingo): semana actual MTD vs semana anterior completa.
        const dow = now.getDay(); // 0=dom, 1=lun, ..., 6=sab
        const diffToMonday = dow === 0 ? -6 : 1 - dow;
        const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
        thisMonday.setHours(0, 0, 0, 0);
        const lastMonday = new Date(thisMonday);
        lastMonday.setDate(thisMonday.getDate() - 7);

        const scope = await getUserScope(req?.user, this.prisma);

        // Filtros base derivados del scope del usuario (seguridad: nunca exponer
        // entidades fuera de su scope).
        let hotelIdsAllowed: string[] | null = scope.hotelIds;
        let restaurantIdsAllowed: string[] | null = scope.restaurantIds;

        // Aplicar filtro de contexto seleccionado (LocationSwitcher). Se intersecta
        // con el scope: solo se permite acceder a entidades dentro del scope del usuario.
        if (ctxType === 'hotel' && ctxId) {
            const hotel = await this.prisma.hotel.findUnique({
                where: { id: ctxId },
                select: { id: true, restaurantId: true },
            });
            // Si el hotel no está en el scope o no existe, devolvemos sin datos.
            const inScope = hotelIdsAllowed === null || hotelIdsAllowed.includes(ctxId);
            if (!hotel || !inScope) {
                hotelIdsAllowed = [];
                restaurantIdsAllowed = [];
            } else {
                hotelIdsAllowed = [hotel.id];
                // Vínculo hotel↔restaurante: si existe sinergia, también se ve.
                restaurantIdsAllowed = hotel.restaurantId ? [hotel.restaurantId] : [];
            }
        } else if (ctxType === 'restaurant' && ctxId) {
            const inScope = restaurantIdsAllowed === null || restaurantIdsAllowed.includes(ctxId);
            if (!inScope) {
                hotelIdsAllowed = [];
                restaurantIdsAllowed = [];
            } else {
                restaurantIdsAllowed = [ctxId];
                // Si hay hotel vinculado a este restaurante, también lo incluimos.
                const linkedHotel = await this.prisma.hotel.findFirst({
                    where: { restaurantId: ctxId },
                    select: { id: true },
                });
                hotelIdsAllowed = linkedHotel ? [linkedHotel.id] : [];
            }
        }

        // Helpers de filtros Prisma
        const hotelFilter = hotelIdsAllowed === null ? {} : { hotelId: { in: hotelIdsAllowed } };
        const restaurantFilter = restaurantIdsAllowed === null ? {} : { restaurantId: { in: restaurantIdsAllowed } };

        const hasHotelScope = hotelIdsAllowed === null || hotelIdsAllowed.length > 0;
        const hasRestaurantScope = restaurantIdsAllowed === null || restaurantIdsAllowed.length > 0;

        const eventRestaurantWhere = restaurantIdsAllowed === null
            ? {}
            : { restaurantId: { in: restaurantIdsAllowed } };

        // Queries en paralelo
        const [
            // Hotel
            hotelActiveCount,
            recentHotelBookings,
            hotelRevenueCurrentMonth,
            hotelRevenuePrevMonth,
            // Restaurante
            resActiveCount,
            recentResBookings,
            // Covers: semana ISO actual MTD vs semana ISO pasada completa
            coversThisWeek,
            coversLastWeek,
            // Ingresos restaurante: eventos del mes actual vs mes anterior
            resRevenueCurrentMonth,
            resRevenuePrevMonth,
            // Valoración: media del mes actual vs mes anterior
            hotelReviewsCurrent,
            hotelReviewsPrev,
            resReviewsCurrent,
            resReviewsPrev,
        ] = await Promise.all([
            hasHotelScope
                ? this.prisma.booking.count({
                    where: { checkInDate: { gte: now }, status: { not: 'CANCELLED' }, ...hotelFilter },
                })
                : Promise.resolve(0),
            hasHotelScope
                ? this.prisma.booking.findMany({
                    take: 5,
                    where: hotelFilter,
                    orderBy: { createdAt: 'desc' },
                    include: { hotel: { select: { name: true } } },
                })
                : Promise.resolve([]),
            hasHotelScope
                ? this.prisma.booking.aggregate({
                    where: { checkInDate: { gte: currentMonthStart, lt: nextMonthStart }, status: { not: 'CANCELLED' }, ...hotelFilter },
                    _sum: { totalPrice: true },
                })
                : Promise.resolve({ _sum: { totalPrice: null as null | number } }),
            hasHotelScope
                ? this.prisma.booking.aggregate({
                    where: { checkInDate: { gte: prevMonthStart, lt: currentMonthStart }, status: { not: 'CANCELLED' }, ...hotelFilter },
                    _sum: { totalPrice: true },
                })
                : Promise.resolve({ _sum: { totalPrice: null as null | number } }),
            hasRestaurantScope
                ? this.prisma.resBooking.count({
                    where: { date: { gte: now }, status: { not: 'CANCELLED' }, ...restaurantFilter },
                })
                : Promise.resolve(0),
            hasRestaurantScope
                ? this.prisma.resBooking.findMany({
                    take: 5,
                    where: restaurantFilter,
                    orderBy: { createdAt: 'desc' },
                    include: { restaurant: { select: { name: true } } },
                })
                : Promise.resolve([]),
            hasRestaurantScope
                ? this.prisma.resBooking.aggregate({
                    where: { date: { gte: thisMonday }, status: { not: 'CANCELLED' }, ...restaurantFilter },
                    _sum: { pax: true },
                })
                : Promise.resolve({ _sum: { pax: 0 } }),
            hasRestaurantScope
                ? this.prisma.resBooking.aggregate({
                    where: { date: { gte: lastMonday, lt: thisMonday }, status: { not: 'CANCELLED' }, ...restaurantFilter },
                    _sum: { pax: true },
                })
                : Promise.resolve({ _sum: { pax: 0 } }),
            hasRestaurantScope
                ? this.prisma.eventBooking.aggregate({
                    where: {
                        status: 'CONFIRMED',
                        event: { date: { gte: currentMonthStart, lt: nextMonthStart }, ...eventRestaurantWhere },
                    },
                    _sum: { totalPrice: true },
                })
                : Promise.resolve({ _sum: { totalPrice: null as null | number } }),
            hasRestaurantScope
                ? this.prisma.eventBooking.aggregate({
                    where: {
                        status: 'CONFIRMED',
                        event: { date: { gte: prevMonthStart, lt: currentMonthStart }, ...eventRestaurantWhere },
                    },
                    _sum: { totalPrice: true },
                })
                : Promise.resolve({ _sum: { totalPrice: null as null | number } }),
            hasHotelScope
                ? this.prisma.hotelReview.findMany({
                    where: { createdAt: { gte: currentMonthStart, lt: nextMonthStart }, ...hotelFilter },
                    select: { serviceScore: true, roomScore: true, cleanlinessScore: true },
                })
                : Promise.resolve([]),
            hasHotelScope
                ? this.prisma.hotelReview.findMany({
                    where: { createdAt: { gte: prevMonthStart, lt: currentMonthStart }, ...hotelFilter },
                    select: { serviceScore: true, roomScore: true, cleanlinessScore: true },
                })
                : Promise.resolve([]),
            hasRestaurantScope
                ? this.prisma.resReview.findMany({
                    where: { createdAt: { gte: currentMonthStart, lt: nextMonthStart }, ...restaurantFilter },
                    select: { serviceScore: true, ambianceScore: true, foodScore: true },
                })
                : Promise.resolve([]),
            hasRestaurantScope
                ? this.prisma.resReview.findMany({
                    where: { createdAt: { gte: prevMonthStart, lt: currentMonthStart }, ...restaurantFilter },
                    select: { serviceScore: true, ambianceScore: true, foodScore: true },
                })
                : Promise.resolve([]),
        ]);

        // Mezclamos reservas recientes hotel + restaurante por createdAt y nos quedamos las 5 más recientes.
        const recentBookings: RecentBooking[] = [
            ...recentHotelBookings.map(b => ({
                id: b.id,
                type: 'hotel' as const,
                customerName: b.guestName,
                customerEmail: b.guestEmail ?? null,
                amount: typeof b.totalPrice === 'number' ? b.totalPrice : Number(b.totalPrice ?? 0),
                entityName: b.hotel?.name ?? '',
                date: b.checkInDate ?? b.createdAt,
            })),
            ...recentResBookings.map(b => ({
                id: b.id,
                type: 'restaurant' as const,
                customerName: b.guestName,
                customerEmail: b.guestEmail ?? null,
                amount: 0,
                entityName: b.restaurant?.name ?? '',
                date: b.date,
            })),
        ]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

        // Helpers de agregacion
        const pctChange = (curr: number, prev: number): number => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };
        const avgScore = <T extends Record<string, number>>(rows: T[]): number | null => {
            if (rows.length === 0) return null;
            let sum = 0;
            let count = 0;
            for (const r of rows) {
                for (const k in r) {
                    sum += r[k];
                    count += 1;
                }
            }
            return count > 0 ? sum / count : null;
        };

        const revenueCurrent = Number(hotelRevenueCurrentMonth._sum.totalPrice ?? 0) + Number(resRevenueCurrentMonth._sum.totalPrice ?? 0);
        const revenuePrev = Number(hotelRevenuePrevMonth._sum.totalPrice ?? 0) + Number(resRevenuePrevMonth._sum.totalPrice ?? 0);
        const coversCurr = coversThisWeek._sum.pax ?? 0;
        const coversPrev = coversLastWeek._sum.pax ?? 0;

        // Reviews: si contexto restaurante usa ResReview; si hotel usa HotelReview;
        // si global suma todas las puntuaciones de ambas tablas.
        const reviewSamplesCurrent = ctxType === 'restaurant'
            ? avgScore(resReviewsCurrent)
            : ctxType === 'hotel'
                ? avgScore(hotelReviewsCurrent)
                : avgScore([...hotelReviewsCurrent, ...resReviewsCurrent] as Array<Record<string, number>>);
        const reviewSamplesPrev = ctxType === 'restaurant'
            ? avgScore(resReviewsPrev)
            : ctxType === 'hotel'
                ? avgScore(hotelReviewsPrev)
                : avgScore([...hotelReviewsPrev, ...resReviewsPrev] as Array<Record<string, number>>);
        const reviewsTotal = ctxType === 'restaurant'
            ? resReviewsCurrent.length
            : ctxType === 'hotel'
                ? hotelReviewsCurrent.length
                : hotelReviewsCurrent.length + resReviewsCurrent.length;
        const reviewsChange = reviewSamplesCurrent !== null && reviewSamplesPrev !== null
            ? Math.round((reviewSamplesCurrent - reviewSamplesPrev) * 10) / 10
            : 0;

        return {
            revenue: {
                total: Math.round(revenueCurrent),
                change: pctChange(revenueCurrent, revenuePrev),
            },
            activeReservations: {
                // Suma hotel + restaurante: si contexto=hotel y tiene restaurante vinculado, suma ambos.
                total: hotelActiveCount + resActiveCount,
                change: 0,
            },
            occupancy: { percentage: 0, change: 0 },
            covers: {
                total: coversCurr,
                change: pctChange(coversCurr, coversPrev),
            },
            reviews: {
                overall: reviewSamplesCurrent,
                total: reviewsTotal,
                // change en puntos de score (delta absoluto), no porcentaje
                change: reviewsChange,
            },
            visits: { total: 0, change: 0 },
            recentBookings,
        };
    }

    /**
     * Series temporales (mensuales) de los últimos N meses, agregadas según el scope
     * del usuario + contexto seleccionado. Devuelve un array de 12 (por defecto) puntos
     * con bookings totales, covers (pax restaurante) y revenue (€ hotel).
     *
     * Frontend lo usa para pintar sparklines reales en las MetricCard del dashboard.
     */
    @Roles('ADMIN')
    @Get('trends')
    async getTrends(
        @Req() req: AuthenticatedRequest,
        @Query('ctxType') ctxType?: string,
        @Query('ctxId') ctxId?: string,
        @Query('months') monthsParam?: string,
    ) {
        const months = Math.min(Math.max(parseInt(monthsParam || '12') || 12, 1), 24);
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

        const scope = await getUserScope(req?.user, this.prisma);
        let hotelIdsAllowed: string[] | null = scope.hotelIds;
        let restaurantIdsAllowed: string[] | null = scope.restaurantIds;

        if (ctxType === 'hotel' && ctxId) {
            const hotel = await this.prisma.hotel.findUnique({
                where: { id: ctxId },
                select: { id: true, restaurantId: true },
            });
            const inScope = hotelIdsAllowed === null || hotelIdsAllowed.includes(ctxId);
            if (!hotel || !inScope) {
                hotelIdsAllowed = [];
                restaurantIdsAllowed = [];
            } else {
                hotelIdsAllowed = [hotel.id];
                restaurantIdsAllowed = hotel.restaurantId ? [hotel.restaurantId] : [];
            }
        } else if (ctxType === 'restaurant' && ctxId) {
            const inScope = restaurantIdsAllowed === null || restaurantIdsAllowed.includes(ctxId);
            if (!inScope) {
                hotelIdsAllowed = [];
                restaurantIdsAllowed = [];
            } else {
                restaurantIdsAllowed = [ctxId];
                const linkedHotel = await this.prisma.hotel.findFirst({
                    where: { restaurantId: ctxId },
                    select: { id: true },
                });
                hotelIdsAllowed = linkedHotel ? [linkedHotel.id] : [];
            }
        }

        const hotelFilter = hotelIdsAllowed === null ? {} : { hotelId: { in: hotelIdsAllowed } };
        const restaurantFilter = restaurantIdsAllowed === null ? {} : { restaurantId: { in: restaurantIdsAllowed } };

        const hasHotelScope = hotelIdsAllowed === null || hotelIdsAllowed.length > 0;
        const hasRestaurantScope = restaurantIdsAllowed === null || restaurantIdsAllowed.length > 0;

        // Una query por entidad: trae solo los campos necesarios para agrupar en memoria.
        // Para 12 meses esto son a lo sumo unos miles de filas — muy barato vs N+1 por mes.
        const [hotelBookings, resBookings] = await Promise.all([
            hasHotelScope
                ? this.prisma.booking.findMany({
                    where: { checkInDate: { gte: startMonth }, status: { not: 'CANCELLED' }, ...hotelFilter },
                    select: { checkInDate: true, totalPrice: true },
                })
                : Promise.resolve([]),
            hasRestaurantScope
                ? this.prisma.resBooking.findMany({
                    where: { date: { gte: startMonth }, status: { not: 'CANCELLED' }, ...restaurantFilter },
                    select: { date: true, pax: true },
                })
                : Promise.resolve([]),
        ]);

        type Bucket = { month: string; bookings: number; covers: number; revenue: number; hotelBookings: number; restaurantBookings: number };
        const buckets: Bucket[] = [];
        for (let i = 0; i < months; i++) {
            const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            buckets.push({ month: key, bookings: 0, covers: 0, revenue: 0, hotelBookings: 0, restaurantBookings: 0 });
        }

        const indexFor = (d: Date) => (d.getFullYear() - startMonth.getFullYear()) * 12 + (d.getMonth() - startMonth.getMonth());

        for (const b of hotelBookings) {
            const idx = indexFor(b.checkInDate);
            if (idx >= 0 && idx < buckets.length) {
                buckets[idx].bookings += 1;
                buckets[idx].hotelBookings += 1;
                buckets[idx].revenue += Number(b.totalPrice ?? 0);
            }
        }
        for (const b of resBookings) {
            const idx = indexFor(b.date);
            if (idx >= 0 && idx < buckets.length) {
                buckets[idx].bookings += 1;
                buckets[idx].restaurantBookings += 1;
                buckets[idx].covers += b.pax;
            }
        }

        return { months: buckets };
    }
}
