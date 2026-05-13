import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { Roles } from '../../auth/roles.decorator';

@Controller('connections')
export class ConnectionsController {
    constructor(private readonly connectionsService: ConnectionsService) { }

    @Roles('ADMIN')
    @Post()
    async saveConnection(@Body() body: {
        type: string;
        name: string;
        hotelId?: string;
        restaurantId?: string;
        credentials: any;
    }) {
        return this.connectionsService.saveConnection(body);
    }

    @Roles('ADMIN')
    @Get()
    async getConnections(
        @Query('hotelId') hotelId?: string,
        @Query('restaurantId') restaurantId?: string
    ) {
        return this.connectionsService.getConnections(hotelId, restaurantId);
    }

    @Roles('ADMIN')
    @Get(':type')
    async getConnection(
        @Param('type') type: string,
        @Query('hotelId') hotelId?: string,
        @Query('restaurantId') restaurantId?: string
    ) {
        return this.connectionsService.getConnection(type, hotelId, restaurantId);
    }

    @Roles('ADMIN')
    @Post('test/:connectionId')
    async testConnection(@Param('connectionId') connectionId: string) {
        // Testing Google Analytics as example
        return this.connectionsService.testConnection(
            connectionId,
            async (credentials) => {
                // Verify Google Analytics credentials
                if (!credentials.propertyId) return false;
                // TODO: Implement actual Google Analytics API test
                return true;
            }
        );
    }

    @Roles('ADMIN')
    @Delete(':connectionId')
    async deleteConnection(@Param('connectionId') connectionId: string) {
        return this.connectionsService.deleteConnection(connectionId);
    }
}
