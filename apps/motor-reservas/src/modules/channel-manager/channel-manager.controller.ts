import { Controller, Get, Post, Delete, Param, Body, Query, Res, Req } from '@nestjs/common';
import { ChannelManagerService } from './channel-manager.service';
import { Roles } from '../../auth/roles.decorator';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../common/scope';

@Controller('channels')
export class ChannelManagerController {
    constructor(private readonly channelService: ChannelManagerService) { }

    @Post('sync')
    async forceSync() {
        await this.channelService.syncAllFeeds();
        return { status: 'Sync started' };
    }

    @Get('export/:roomTypeId/calendar.ics')
    async exportICal(@Param('roomTypeId') roomTypeId: string, @Res() res: Response) {
        const ics = await this.channelService.generateICal(roomTypeId);
        res.setHeader('Content-Type', 'text/calendar');
        res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
        res.send(ics);
    }

    @Get('feeds')
    async getFeeds(@Req() req: AuthenticatedRequest) {
        return this.channelService.getFeeds(req?.user);
    }

    @Post('feeds')
    async createFeed(
        @Req() req: AuthenticatedRequest,
        @Body() body: { roomTypeId: string; url: string; name?: string; source: string }
    ) {
        return this.channelService.createFeed(body, req?.user);
    }

    @Post('feeds/validate')
    async validateFeed(@Body() body: { url: string }) {
        return this.channelService.validateICalUrl(body.url);
    }

    @Post('feeds/:id/sync')
    async syncFeed(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.channelService.syncFeed(id, req?.user);
    }

    @Delete('feeds/:id')
    async deleteFeed(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.channelService.deleteFeed(id, req?.user);
    }

    @Get('logs')
    async getLogs(
        @Req() req: AuthenticatedRequest,
        @Query('limit') limit?: string
    ) {
        const n = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
        return this.channelService.getRecentLogs(req?.user, n);
    }
}
