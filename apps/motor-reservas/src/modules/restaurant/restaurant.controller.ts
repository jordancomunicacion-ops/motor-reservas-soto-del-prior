import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { WaitlistService } from './waitlist.service';

@Controller('restaurant')
export class RestaurantController {
    constructor(
        private readonly service: RestaurantService,
        private readonly waitlistService: WaitlistService
    ) { }

    @Post()
    createRestaurant(@Body() body: any) {
        return this.service.createRestaurant(body);
    }

    @Get()
    getRestaurants() {
        return this.service.getRestaurants();
    }

    @Get(':id')
    getRestaurant(@Param('id') id: string) {
        return this.service.getRestaurant(id);
    }

    @Patch(':id')
    updateRestaurant(@Param('id') id: string, @Body() body: any) {
        return this.service.updateRestaurant(id, body);
    }

    @Delete(':id')
    deleteRestaurant(@Param('id') id: string) {
        return this.service.deleteRestaurant(id);
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

    @Post(':id/zones/sync')
    syncZones(@Param('id') id: string, @Body() body: any[]) {
        return this.service.syncZones(id, body);
    }

    @Post('zones/:id/tables/sync')
    syncTables(@Param('id') id: string, @Body() body: any[]) {
        return this.service.syncTables(id, body);
    }

    // --- Bookings ---
    @Get(':id/bookings')
    getBookings(
        @Param('id') id: string, 
        @Query('date') date?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.service.getBookings(id, date, startDate, endDate);
    }

    @Post('bookings')
    createBooking(@Body() body: any) {
        return this.service.createBooking(body);
    }

    // --- Waitlist ---
    @Post(':id/waitlist')
    addToWaitlist(@Param('id') id: string, @Body() body: any) {
        return this.service.addToWaitlist(id, body);
    }

    @Get(':id/waitlist')
    getWaitlist(@Param('id') id: string) {
        return this.service.getWaitlist(id);
    }

    // --- Public Widget Flow ---

    @Post('public/reservation')
    createPublicReservation(@Body() body: any) {
        return this.service.createPublicReservation(body);
    }

    @Post('reservation/:id/confirm')
    confirmReservation(@Param('id') id: string) {
        return this.service.confirmReservation(id);
    }

    @Post('reservation/:id/cancel')
    cancelReservation(@Param('id') id: string) {
        return this.service.cancelReservation(id);
    }

    @Patch('reservation/:id/status')
    updateBookingStatus(@Param('id') id: string, @Body() body: { status: string; tableId?: string }) {
        return this.service.updateBookingStatus(id, body.status, body.tableId);
    }

    // --- Synergy & Shifts ---
    @Get(':id/slots')
    getAvailableSlots(
        @Param('id') id: string,
        @Query('date') date: string,
        @Query('pax') pax: string,
        @Query('type') type?: string
    ) {
        return this.service.getAvailableSlots(id, date, parseInt(pax), type);
    }


    @Get(':id/shifts')
    getShifts(@Param('id') id: string) {
        return this.service.getShifts(id);
    }

    @Post(':id/shifts')
    createShift(@Param('id') id: string, @Body() body: any) {
        return this.service.createShift(id, body);
    }

    @Post('linked-reservation')
    createLinkedReservation(@Body() body: any) {
        return this.service.createLinkedReservation(body);
    }

    @Delete(':id/shifts/:shiftId')
    deleteShift(@Param('shiftId') shiftId: string) {
        return this.service.deleteShift(shiftId);
    }

    @Get(':id/closures')
    getClosures(@Param('id') id: string) {
        return this.service.getClosures(id);
    }

    @Post(':id/closures')
    createClosure(@Param('id') id: string, @Body() body: any) {
        return this.service.createClosure(id, body);
    }

    @Delete(':id/closures/:closureId')
    deleteClosure(@Param('closureId') closureId: string) {
        return this.service.deleteClosure(closureId);
    }

    @Post('waitlist/:id/confirm')
    confirmWaitlist(@Param('id') id: string) {
        return this.waitlistService.confirmWaitlistEntry(id);
    }

    @Get(':id/users')
    getAuthorizedUsers(@Param('id') id: string) {
        return this.service.getAuthorizedUsers(id);
    }

    @Post(':id/users')
    authorizeUser(@Param('id') id: string, @Body() body: any) {
        return this.service.authorizeUser(id, body);
    }

    @Delete(':id/users/:userId')
    deauthorizeUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.service.deauthorizeUser(id, userId);
    }
}

