import { Controller, Post, Body, Get, Query, Param, Put, Logger, Req } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmConfigService } from './crm-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { ensureHotelAccess, ensureRestaurantAccess } from '../../common/scope';

@Controller('crm')
export class CrmController {
    private readonly logger = new Logger(CrmController.name);

    constructor(
        private readonly crmService: CrmService,
        private readonly crmConfigService: CrmConfigService,
        private readonly prisma: PrismaService
    ) { }

    @Public()
    @Post('identify')
    async identify(@Body() body: { email?: string; phone?: string; firstName?: string; lastName?: string }) {
        return this.crmService.identify(body);
    }

    @Public()
    @Post('track')
    async track(@Body() body: {
        sessionId: string;
        url: string;
        visitorId?: string;
        email?: string;
        referrer?: string;
        userAgent?: string;
        duration?: number;
    }) {
        return this.crmService.trackVisit(body);
    }

    @Public()
    @Post('event')
    async trackEvent(@Body() body: {
        sessionId: string;
        visitorId?: string;
        event: string;
        data?: any;
        timestamp?: string;
    }) {
        // Track generic events for analytics
        this.logger.log(`[CRM-EVENT] ${body.event}:`, body.data);

        // Could be extended to store custom events in the future
        return { success: true, event: body.event };
    }

    @Roles('ADMIN')
    @Get('profiles')
    async getProfiles(@Req() req: any, @Query('page') page: number = 1) {
        return this.crmService.getProfiles(Number(page), 50, req?.user);
    }

    // CRM Configuration Endpoints
    @Roles('ADMIN')
    @Post('setup-hotel/:hotelId')
    async setupHotelCrm(@Param('hotelId') hotelId: string, @Body() config: any, @Req() req: any) {
        await ensureHotelAccess(req?.user, this.prisma, hotelId);
        return this.crmConfigService.setupHotelCrm(hotelId, config);
    }

    @Roles('ADMIN')
    @Post('setup-restaurant/:restaurantId')
    async setupRestaurantCrm(@Param('restaurantId') restaurantId: string, @Body() config: any, @Req() req: any) {
        await ensureRestaurantAccess(req?.user, this.prisma, restaurantId);
        return this.crmConfigService.setupRestaurantCrm(restaurantId, config);
    }

    @Roles('ADMIN')
    @Get('config/hotel/:hotelId')
    async getHotelConfig(@Param('hotelId') hotelId: string, @Req() req: any) {
        await ensureHotelAccess(req?.user, this.prisma, hotelId);
        return this.crmConfigService.getCrmConfig(hotelId);
    }

    @Roles('ADMIN')
    @Get('config/restaurant/:restaurantId')
    async getRestaurantConfig(@Param('restaurantId') restaurantId: string, @Req() req: any) {
        await ensureRestaurantAccess(req?.user, this.prisma, restaurantId);
        return this.crmConfigService.getCrmConfig(undefined, restaurantId);
    }

    @Roles('ADMIN')
    @Post('test-connection')
    async testConnection(@Body() body: { url: string; token?: string }) {
        return this.crmConfigService.testConnection(body.url, body.token);
    }

    @Roles('ADMIN')
    @Post('disable-hotel/:hotelId')
    async disableHotelCrm(@Param('hotelId') hotelId: string, @Req() req: any) {
        await ensureHotelAccess(req?.user, this.prisma, hotelId);
        return this.crmConfigService.disableCrm(hotelId);
    }

    @Roles('ADMIN')
    @Post('disable-restaurant/:restaurantId')
    async disableRestaurantCrm(@Param('restaurantId') restaurantId: string, @Req() req: any) {
        await ensureRestaurantAccess(req?.user, this.prisma, restaurantId);
        return this.crmConfigService.disableCrm(undefined, restaurantId);
    }
}
