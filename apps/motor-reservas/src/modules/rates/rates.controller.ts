import { Controller, Get, Post, Body, Param, Query, HttpCode, Patch, Delete } from '@nestjs/common';
import { RatesService } from './rates.service';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../auth/roles.decorator';

@Controller('rates')
export class RatesController {
    constructor(
        private readonly ratesService: RatesService,
        private readonly availabilityService: AvailabilityService,
        private readonly prisma: PrismaService
    ) { }

    @Roles('ADMIN')
    @Get('plans/:hotelId')
    async getRatePlans(@Param('hotelId') hotelId: string) {
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

    @Roles('ADMIN')
    @Post('plans')
    async createRatePlan(@Body() body: any) {
        return this.prisma.ratePlan.create({ data: body });
    }

    @Roles('ADMIN')
    @Patch('plans/:id')
    async updateRatePlan(@Param('id') id: string, @Body() body: any) {
        const { id: _, ...data } = body;
        return this.prisma.ratePlan.update({
            where: { id },
            data
        });
    }

    @Roles('ADMIN')
    @Delete('plans/:id')
    async deleteRatePlan(@Param('id') id: string) {
        return this.prisma.ratePlan.delete({
            where: { id }
        });
    }

    // Bulk Update Prices
    @Roles('ADMIN')
    @Post('prices/bulk')
    @HttpCode(200)
    async updatePrices(@Body() body: {
        hotelId: string;
        ratePlanId: string;
        roomTypeId: string;
        fromDate: string;
        toDate: string;
        price: number;
        daysOfWeek?: number[]; // [0, 6] for Sun, Sat
    }) {
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
