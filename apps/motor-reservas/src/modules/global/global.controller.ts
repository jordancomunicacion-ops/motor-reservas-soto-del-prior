import { Controller, Get, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../auth/roles.decorator';
import { getUserScope } from '../../common/scope';

@Controller('global')
export class GlobalController {
    private readonly logger = new Logger(GlobalController.name);

    constructor(private prisma: PrismaService) { }

    @Roles('ADMIN')
    @Get('contexts')
    async getContexts(@Req() req: any) {
        // El alcance real del usuario no lo da el role (todos son ADMIN por defecto en el schema),
        // sino hotelId/restaurantId del propio User. Si no tiene ninguno, es super-admin global.
        const scope = await getUserScope(req?.user, this.prisma);

        const [hotels, restaurants] = await Promise.all([
            this.prisma.hotel.findMany({
                where: scope.hotelIds === null ? {} : { id: { in: scope.hotelIds } },
                select: { id: true, name: true, restaurantId: true }
            }),
            this.prisma.restaurant.findMany({
                where: scope.restaurantIds === null ? {} : { id: { in: scope.restaurantIds } },
                select: { id: true, name: true }
            })
        ]);

        this.logger.debug(`contexts for ${req?.user?.email ?? '?'} (hotelId=${req?.user?.hotelId ?? null}, restaurantId=${req?.user?.restaurantId ?? null}) -> ${hotels.length} hotels, ${restaurants.length} restaurants`);

        return { hotels, restaurants };
    }

    @Roles('ADMIN')
    @Get('stats')
    async getStats(@Req() req: any) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Scope al restaurante del usuario. Si tiene hotelId con sinergia, usamos el restaurante asociado.
        // Si no tiene scope (super-admin global), las cifras agregan todos los restaurantes.
        const scope = await getUserScope(req?.user, this.prisma);

        const restaurantFilter = scope.restaurantIds === null
            ? {}
            : { restaurantId: { in: scope.restaurantIds } };

        const [
            resBookingsCount,
            restaurantCovers,
            recentResBookings
        ] = await Promise.all([
            this.prisma.resBooking.count({
                where: { date: { gte: now }, ...restaurantFilter }
            }),
            this.prisma.resBooking.aggregate({
                where: { date: { gte: firstDayOfMonth }, ...restaurantFilter },
                _sum: { pax: true }
            }),
            this.prisma.resBooking.findMany({
                take: 5,
                where: restaurantFilter,
                orderBy: { createdAt: 'desc' },
                include: { restaurant: { select: { name: true } } }
            })
        ]);

        // Mock values for things not yet fully implemented in DB (like hotel occupancy or complex revenue)
        // This provides a base that will grow as we add more logic
        return {
            revenue: {
                total: 0,
                change: 0
            },
            activeReservations: {
                total: resBookingsCount,
                change: 0
            },
            occupancy: {
                percentage: 0,
                change: 0
            },
            covers: {
                total: restaurantCovers._sum.pax || 0,
                change: 0
            },
            recentBookings: recentResBookings.map(b => ({
                id: b.id,
                customerName: b.guestName,
                customerEmail: b.guestEmail,
                amount: 0, // We don't have prices in resBookings yet
                type: 'restaurant',
                entityName: b.restaurant.name,
                date: b.date
            }))
        };
    }
}
