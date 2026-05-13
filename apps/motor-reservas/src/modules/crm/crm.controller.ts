import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { CrmService } from './crm.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';

@Controller('crm')
export class CrmController {
    constructor(private readonly crmService: CrmService) { }

    @Public()
    @Post('identify')
    async identify(@Body() body: { email?: string; phone?: string; firstName?: string; lastName?: string }) {
        return this.crmService.identify(body);
    }

    @Public()
    @Post('track')
    async track(@Body() body: { sessionId: string; url: string; visitorId?: string; email?: string }) {
        return this.crmService.trackVisit(body);
    }

    @Roles('ADMIN')
    @Get('profiles')
    async getProfiles(@Query('page') page: number = 1) {
        return this.crmService.getProfiles(Number(page));
    }
}
