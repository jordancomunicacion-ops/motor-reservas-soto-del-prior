import { Controller, Get, Post, Body, Param, Query, HttpCode, Patch, Delete, Req, NotFoundException } from '@nestjs/common';
import { RatesService } from './rates.service';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../auth/roles.decorator';
import { ensureHotelAccess, type AuthenticatedRequest } from '../../common/scope';

@Controller('rates')
export class RatesController {
    constructor(
        private readonly ratesService: RatesService,
        private readonly availabilityService: AvailabilityService,
        private readonly prisma: PrismaService
    ) { }

    /** Resuelve el hotelId al que pertenece un RatePlan (para checks de ownership). */
    private async hotelIdForRatePlan(ratePlanId: string): Promise<string> {
        const plan = await this.prisma.ratePlan.findUnique({
            where: { id: ratePlanId },
            select: { hotelId: true }
        });
        if (!plan) throw new NotFoundException('Tarifa no encontrada');
        return plan.hotelId;
    }

    @Get('plans/:hotelId')
    async getRatePlans(@Param('hotelId') hotelId: string, @Req() req: AuthenticatedRequest) {
        await ensureHotelAccess(req?.user, this.prisma, hotelId);

        const plans = await this.prisma.ratePlan.findMany({
            where: { hotelId }
        });

        if (plans.length === 0) {
            const defaultPlan = await this.prisma.ratePlan.create({
                data: {
                    hotelId,
                    name: 'Tarifa Estándar',
                    isDefault: true,
                    mealsIncluded: 'Desayuno incluido'
                }
            });
            return [defaultPlan];
        }

        return plans;
    }

    @Post('plans')
    async createRatePlan(@Body() body: any, @Req() req: AuthenticatedRequest) {
        if (body?.hotelId) {
            await ensureHotelAccess(req?.user, this.prisma, body.hotelId);
        }
        return this.prisma.ratePlan.create({ data: body });
    }

    @Patch('plans/:id')
    async updateRatePlan(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        await ensureHotelAccess(req?.user, this.prisma, await this.hotelIdForRatePlan(id));
        const { id: _, ...data } = body;
        return this.prisma.ratePlan.update({
            where: { id },
            data
        });
    }

    @Delete('plans/:id')
    async deleteRatePlan(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        await ensureHotelAccess(req?.user, this.prisma, await this.hotelIdForRatePlan(id));
        return this.prisma.ratePlan.delete({
            where: { id }
        });
    }

    // Bulk Update Prices
    @Post('prices/bulk')
    @HttpCode(200)
    async updatePrices(@Req() req: AuthenticatedRequest, @Body() body: {
        hotelId: string;
        ratePlanId: string;
        roomTypeId: string;
        fromDate: string;
        toDate: string;
        price: number;
        daysOfWeek?: number[]; // [0, 6] for Sun, Sat
    }) {
        await ensureHotelAccess(req?.user, this.prisma, body.hotelId);
        const start = new Date(body.fromDate);
        const end = new Date(body.toDate);
        let count = 0;

        // Iterate through each day in the range
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = new Date(d);
            dateKey.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

            // Filter by day of week if provided
            if (body.daysOfWeek && body.daysOfWeek.length > 0) {
                if (!body.daysOfWeek.includes(dateKey.getUTCDay())) {
                    continue;
                }
            }

            // Upsert DailyPrice
            await this.prisma.dailyPrice.upsert({
                where: {
                    roomTypeId_ratePlanId_date: {
                        roomTypeId: body.roomTypeId,
                        ratePlanId: body.ratePlanId,
                        date: dateKey
                    }
                },
                update: { price: body.price },
                create: {
                    roomTypeId: body.roomTypeId,
                    ratePlanId: body.ratePlanId,
                    date: dateKey,
                    price: body.price
                }
            });
            count++;
        }
        
        return { status: 'success', count };
    }
}
