import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
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
    getHotels() {
        return this.propertyService.getHotels();
    }

    @Roles('ADMIN')
    @Get('hotels/:id')
    getHotel(@Param('id') id: string) {
        return this.propertyService.getHotel(id);
    }

    @Roles('ADMIN')
    @Patch('hotels/:id')
    updateHotel(@Param('id') id: string, @Body() body: any) {
        return this.propertyService.updateHotel(id, body);
    }

    @Roles('ADMIN')
    @Delete('hotels/:id')
    deleteHotel(@Param('id') id: string) {
        return this.propertyService.deleteHotel(id);
    }

    @Roles('ADMIN')
    @Post('hotels/:id/room-types')
    createRoomType(
        @Param('id') hotelId: string,
        @Body() body: any,
    ) {
        return this.propertyService.createRoomType(hotelId, body);
    }

    @Roles('ADMIN')
    @Patch('room-types/:id')
    updateRoomType(@Param('id') id: string, @Body() body: any) {
        return this.propertyService.updateRoomType(id, body);
    }

    @Roles('ADMIN')
    @Delete('room-types/:id')
    deleteRoomType(@Param('id') id: string) {
        return this.propertyService.deleteRoomType(id);
    }

    @Roles('ADMIN')
    @Get('hotels/:id/room-types')
    getRoomTypes(@Param('id') hotelId: string) {
        return this.propertyService.getRoomTypes(hotelId);
    }

    @Roles('ADMIN')
    @Post('room-types/:id/rooms')
    createRoom(@Param('id') roomTypeId: string, @Body('name') name: string) {
        return this.propertyService.createRoom(roomTypeId, name);
    }

    @Roles('ADMIN')
    @Get('hotels/:id/zones')
    getHotelZones(@Param('id') id: string) {
        return this.propertyService.getHotelZones(id);
    }
}
