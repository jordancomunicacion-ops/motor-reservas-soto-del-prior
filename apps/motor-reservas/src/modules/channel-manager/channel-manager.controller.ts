import { Controller, Get, Post, Param, Body, Res, Req } from '@nestjs/common';
import { ChannelManagerService } from './channel-manager.service';
import { Roles } from '../../auth/roles.decorator';
import type { Response } from 'express';

@Controller('channels')
export class ChannelManagerController {
    constructor(private readonly channelService: ChannelManagerService) { }

    @Roles('ADMIN')
    @Post('sync')
    async forceSync() {
        await this.channelService.syncAllFeeds();
        return { status: 'Sync started' };
    }

    @Roles('ADMIN')
    @Get('export/:roomTypeId/calendar.ics')
    async exportICal(@Param('roomTypeId') mk: string, @Res() res: Response) {
        const ics = await this.channelService.generateICal(mk);
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
        res.send(ics);
    }

    @Roles('ADMIN')
    @Get('feeds')
    async getFeeds(@Req() req: any) {
        return this.channelService.getFeeds(req?.user);
    }

    @Roles('ADMIN')
    @Post('feeds')
    async createFeed(@Body() body: { roomTypeId: string; url: string; name: string; source: string }) {
        return this.channelService.createFeed(body);
    }
}
