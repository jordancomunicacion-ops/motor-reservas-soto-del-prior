import { Controller, Get, Post, Body, Param, Patch, Delete, Req } from '@nestjs/common';
import { PropertyService } from './property.service';
import { Roles } from '../../auth/roles.decorator';

@Controller('property')
export class PropertyController {
    constructor(private readonly propertyService: PropertyService) { }

    @Roles('ADMIN')
    @Post('hotels')
    createHotel(@Body() body: { name: string; currency: string; timezone: string }) {
        return this.propertyService.createHotel(body);
    }

    @Roles('ADMIN')
    @Get('hotels')
    getHotels(@Req() req: any) {
        return this.propertyService.getHotels(req?.user);
    }

    @Roles('ADMIN')
    @Get('hotels/:id')
    getHotel(@Param('id') id: string, @Req() req: any) {
        return this.propertyService.getHotel(id, req?.user);
    }

    @Roles('ADMIN')
    @Patch('hotels/:id')
    updateHotel(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.propertyService.updateHotel(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete('hotels/:id')
    deleteHotel(@Param('id') id: string, @Req() req: any) {
        return this.propertyService.deleteHotel(id, req?.user);
    }

    @Roles('ADMIN')
    @Post('hotels/:id/room-types')
    createRoomType(
        @Param('id') hotelId: string,
        @Body() body: any,
        @Req() req: any
    ) {
        return this.propertyService.createRoomType(hotelId, body, req?.user);
    }

    @Roles('ADMIN')
    @Patch('room-types/:id')
    updateRoomType(@Param('id') id: string, @Body() body: any, @Req() req: any) {
        return this.propertyService.updateRoomType(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete('room-types/:id')
    deleteRoomType(@Param('id') id: string, @Req() req: any) {
        return this.propertyService.deleteRoomType(id, req?.user);
    }

    @Roles('ADMIN')
    @Get('hotels/:id/room-types')
    getRoomTypes(@Param('id') hotelId: string, @Req() req: any) {
        return this.propertyService.getRoomTypes(hotelId, req?.user);
    }

    @Roles('ADMIN')
    @Post('room-types/:id/rooms')
    createRoom(@Param('id') roomTypeId: string, @Body('name') name: string, @Req() req: any) {
        return this.propertyService.createRoom(roomTypeId, name, req?.user);
    }

    @Roles('ADMIN')
    @Get('hotels/:id/zones')
    getHotelZones(@Param('id') id: string, @Req() req: any) {
        return this.propertyService.getHotelZones(id, req?.user);
    }
}
