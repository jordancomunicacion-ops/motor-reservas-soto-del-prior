import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';

@Controller('restaurant')
export class RestaurantController {
    constructor(private readonly service: RestaurantService) { }

    @Post()
    createRestaurant(@Body() body: any) {
        return this.service.createRestaurant(body);
    }

    @Get()
    getRestaurants() {
        return this.service.getRestaurants();
    }

    @Post('zones')
    createZone(@Body() body: { restaurantId: string; name: string }) {
        return this.service.createZone(body.restaurantId, body.name);
    }

    @Post('tables')
    createTable(@Body() body: { zoneId: string; name: string; capacity: number }) {
        return this.service.createTable(body.zoneId, body.name, body.capacity);
    }

    @Get(':id/tables')
    getTables(@Param('id') id: string) {
        return this.service.getTables(id);
    }
}
