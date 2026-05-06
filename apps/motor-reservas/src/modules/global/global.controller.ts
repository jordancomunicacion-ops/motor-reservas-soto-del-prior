import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('global')
export class GlobalController {
    constructor(private prisma: PrismaService) { }

    @Get('contexts')
    async getContexts() {
        const [hotels, restaurants] = await Promise.all([
            this.prisma.hotel.findMany({
                select: { id: true, name: true, restaurantId: true }
            }),
            this.prisma.restaurant.findMany({
                select: { id: true, name: true }
            })
        ]);

        return {
            hotels,
            restaurants
        };
    }

    @Get('stats')
    async getStats() {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            resBookingsCount,
            restaurantCovers,
            recentResBookings
        ] = await Promise.all([
            this.prisma.resBooking.count({
                where: { date: { gte: now } }
            }),
            this.prisma.resBooking.aggregate({
                where: { date: { gte: firstDayOfMonth } },
                _sum: { pax: true }
            }),
            this.prisma.resBooking.findMany({
                take: 5,
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
