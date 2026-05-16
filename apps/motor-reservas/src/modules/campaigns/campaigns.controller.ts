import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { Roles } from '../../auth/roles.decorator';
import type { AuthenticatedRequest } from '../../common/scope';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Roles('ADMIN')
    @Post()
    async create(
        @Body() body: { name: string; type: string; subject?: string; content: string; hotelId?: string; restaurantId?: string },
        @Req() req: AuthenticatedRequest
    ) {
        return this.campaignsService.createCampaign(body, req?.user);
    }

    @Roles('ADMIN')
    @Get()
    async findAll(@Req() req: AuthenticatedRequest) {
        return this.campaignsService.getCampaigns(req?.user);
    }

    @Roles('ADMIN')
    @Post(':id/execute')
    async execute(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.campaignsService.executeCampaign(id, req?.user);
    }
}
