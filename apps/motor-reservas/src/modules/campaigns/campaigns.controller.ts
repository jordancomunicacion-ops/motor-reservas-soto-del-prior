import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { Roles } from '../../auth/roles.decorator';

@Controller('campaigns')
export class CampaignsController {
    constructor(private readonly campaignsService: CampaignsService) { }

    @Roles('ADMIN')
    @Post()
    async create(@Body() body: { name: string; type: string; subject?: string; content: string }) {
        return this.campaignsService.createCampaign(body);
    }

    @Roles('ADMIN')
    @Get()
    async findAll() {
        return this.campaignsService.getCampaigns();
    }

    @Roles('ADMIN')
    @Post(':id/execute')
    async execute(@Param('id') id: string) {
        return this.campaignsService.executeCampaign(id);
    }
}
