import { Controller, Get, Post, Body, Param, Patch, Delete, Req } from '@nestjs/common';
import { PropertyService } from './property.service';
import { Roles } from '../../auth/roles.decorator';
import type { AuthenticatedRequest } from '../../common/scope';

@Controller('property')
export class PropertyController {
    constructor(private readonly propertyService: PropertyService) { }

    @Roles('ADMIN')
    @Post('hotels')
    createHotel(@Body() body: { name: string; currency: string; timezone: string }) {
        return this.propertyService.createHotel(body);
    }

    @Get('hotels')
    getHotels(@Req() req: AuthenticatedRequest) {
        return this.propertyService.getHotels(req?.user);
    }

    @Get('hotels/:id')
    getHotel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.getHotel(id, req?.user);
    }

    @Patch('hotels/:id')
    updateHotel(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.propertyService.updateHotel(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete('hotels/:id')
    deleteHotel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.deleteHotel(id, req?.user);
    }

    @Post('hotels/:id/room-types')
    createRoomType(
        @Param('id') hotelId: string,
        @Body() body: any,
        @Req() req: AuthenticatedRequest
    ) {
        return this.propertyService.createRoomType(hotelId, body, req?.user);
    }

    @Patch('room-types/:id')
    updateRoomType(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.propertyService.updateRoomType(id, body, req?.user);
    }

    @Delete('room-types/:id')
    deleteRoomType(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.deleteRoomType(id, req?.user);
    }

    @Get('hotels/:id/room-types')
    getRoomTypes(@Param('id') hotelId: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.getRoomTypes(hotelId, req?.user);
    }

    @Post('room-types/:id/rooms')
    createRoom(@Param('id') roomTypeId: string, @Body('name') name: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.createRoom(roomTypeId, name, req?.user);
    }

    @Get('hotels/:id/zones')
    getHotelZones(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.getHotelZones(id, req?.user);
    }

    @Get('hotels/:id/openings')
    getHotelOpenings(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.getHotelOpenings(id, req?.user);
    }

    @Post('hotels/:id/openings')
    createHotelOpening(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.propertyService.createHotelOpening(id, body, req?.user);
    }

    @Delete('hotels/:id/openings/:openingId')
    deleteHotelOpening(@Param('openingId') openingId: string, @Req() req: AuthenticatedRequest) {
        return this.propertyService.deleteHotelOpening(openingId, req?.user);
    }
}
