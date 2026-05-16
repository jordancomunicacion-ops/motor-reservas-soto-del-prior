import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { WaitlistService } from './waitlist.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { CreateRestaurantDto, CreatePublicReservationDto, UpdateBookingStatusDto, AuthorizeUserDto, CreateAccessProfileDto, UpdateAccessProfileDto } from './restaurant.dto';

@Controller('restaurant')
export class RestaurantController {
    constructor(
        private readonly service: RestaurantService,
        private readonly waitlistService: WaitlistService
    ) { }

    @Roles('ADMIN')
    @Post()
    createRestaurant(@Body() body: CreateRestaurantDto) {
        return this.service.createRestaurant(body);
    }

    @Roles('ADMIN')
    @Get()
    getRestaurants() {
        return this.service.getRestaurants();
    }

    @Roles('ADMIN')
    @Get(':id')
    getRestaurant(@Param('id') id: string) {
        return this.service.getRestaurant(id);
    }

    @Roles('ADMIN')
    @Patch(':id')
    updateRestaurant(@Param('id') id: string, @Body() body: any) {
        return this.service.updateRestaurant(id, body);
    }

    @Roles('ADMIN')
    @Delete(':id')
    deleteRestaurant(@Param('id') id: string) {
        return this.service.deleteRestaurant(id);
    }

    @Roles('ADMIN')
    @Post('zones')
    createZone(@Body() body: { restaurantId: string; name: string }) {
        return this.service.createZone(body.restaurantId, body.name);
    }

    @Roles('ADMIN')
    @Post('tables')
    createTable(@Body() body: { zoneId: string; name: string; capacity: number }) {
        return this.service.createTable(body.zoneId, body.name, body.capacity);
    }

    @Roles('ADMIN')
    @Get(':id/tables')
    getTables(@Param('id') id: string, @Query('date') date?: string) {
        return this.service.getTables(id, date);
    }

    @Roles('ADMIN')
    @Get(':id/zones')
    getZones(@Param('id') id: string) {
        return this.service.getTables(id); // getTables returns the zones with tables
    }

    @Roles('ADMIN')
    @Post(':id/zones/sync')
    syncZones(@Param('id') id: string, @Body() body: any[]) {
        return this.service.syncZones(id, body);
    }

    @Roles('ADMIN')
    @Post('zones/:id/tables/sync')
    syncTables(@Param('id') id: string, @Body() body: any[]) {
        return this.service.syncTables(id, body);
    }

    // --- Bookings ---
    @Roles('ADMIN')
    @Get(':id/bookings')
    getBookings(
        @Param('id') id: string,
        @Query('date') date?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.service.getBookings(id, date, startDate, endDate);
    }

    @Roles('ADMIN')
    @Post('bookings')
    createBooking(@Body() body: any) {
        return this.service.createBooking(body);
    }

    // --- Waitlist ---
    @Roles('ADMIN')
    @Post(':id/waitlist')
    addToWaitlist(@Param('id') id: string, @Body() body: any) {
        return this.service.addToWaitlist(id, body);
    }

    @Roles('ADMIN')
    @Get(':id/waitlist')
    getWaitlist(@Param('id') id: string) {
        return this.service.getWaitlist(id);
    }

    // --- Public Widget Flow ---

    @Public()
    @Post('public/reservation')
    async createPublicReservation(@Body() body: CreatePublicReservationDto) {
        try {
            return await this.service.createPublicReservation(body);
        } catch (error: any) {
            console.error('Error creating public reservation:', error);
            return { error: true, message: error.message || 'Unknown error' };
        }
    }

    @Public()
    @Post('reservation/:id/confirm')
    confirmReservation(@Param('id') id: string) {
        return this.service.confirmReservation(id);
    }

    @Public()
    @Post('reservation/:id/cancel')
    cancelReservation(@Param('id') id: string) {
        return this.service.cancelReservation(id);
    }

    @Roles('ADMIN')
    @Patch('reservation/:id/status')
    updateBookingStatus(@Param('id') id: string, @Body() body: UpdateBookingStatusDto) {
        return this.service.updateBookingStatus(id, body.status, body.tableId);
    }

    @Roles('ADMIN')
    @Patch('bookings/:id')
    updateBooking(@Param('id') id: string, @Body() body: any) {
        return this.service.updateBooking(id, body);
    }

    // --- Synergy & Shifts ---
    @Public()
    @Get(':id/slots')
    getAvailableSlots(
        @Param('id') id: string,
        @Query('date') date: string,
        @Query('pax') pax: string,
        @Query('type') type?: string
    ) {
        return this.service.getAvailableSlots(id, date, parseInt(pax), type);
    }

    @Roles('ADMIN')
    @Get(':id/shifts')
    getShifts(@Param('id') id: string) {
        return this.service.getShifts(id);
    }

    @Roles('ADMIN')
    @Post(':id/shifts')
    async createShift(@Param('id') id: string, @Body() body: any) {
        try {
            return await this.service.createShift(id, body);
        } catch (e: any) {
            return { error: true, message: e.message };
        }
    }

    @Roles('ADMIN')
    @Post('linked-reservation')
    createLinkedReservation(@Body() body: any) {
        return this.service.createLinkedReservation(body);
    }

    @Roles('ADMIN')
    @Delete(':id/shifts/:shiftId')
    deleteShift(@Param('shiftId') shiftId: string) {
        return this.service.deleteShift(shiftId);
    }

    @Roles('ADMIN')
    @Get(':id/closures')
    getClosures(@Param('id') id: string) {
        return this.service.getClosures(id);
    }

    @Roles('ADMIN')
    @Post(':id/closures')
    createClosure(@Param('id') id: string, @Body() body: any) {
        return this.service.createClosure(id, body);
    }

    @Roles('ADMIN')
    @Delete(':id/closures/:closureId')
    deleteClosure(@Param('closureId') closureId: string) {
        return this.service.deleteClosure(closureId);
    }

    @Public()
    @Post('waitlist/:id/confirm')
    confirmWaitlist(@Param('id') id: string) {
        return this.waitlistService.confirmWaitlistEntry(id);
    }

    @Roles('ADMIN')
    @Get(':id/users')
    getAuthorizedUsers(@Param('id') id: string) {
        return this.service.getAuthorizedUsers(id);
    }

    @Roles('ADMIN')
    @Post(':id/users')
    authorizeUser(@Param('id') id: string, @Body() body: AuthorizeUserDto) {
        return this.service.authorizeUser(id, body);
    }

    @Roles('ADMIN')
    @Delete(':id/users/:userId')
    deauthorizeUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.service.deauthorizeUser(id, userId);
    }

    // --- Access Profiles (Custom Roles) ---
    @Roles('ADMIN')
    @Get(':id/access-profiles')
    getAccessProfiles(@Param('id') id: string) {
        return this.service.getAccessProfiles(id);
    }

    @Roles('ADMIN')
    @Post(':id/access-profiles')
    createAccessProfile(@Param('id') id: string, @Body() body: CreateAccessProfileDto) {
        return this.service.createAccessProfile(id, body);
    }

    @Roles('ADMIN')
    @Patch('access-profiles/:profileId')
    updateAccessProfile(@Param('profileId') profileId: string, @Body() body: UpdateAccessProfileDto) {
        return this.service.updateAccessProfile(profileId, body);
    }

    @Roles('ADMIN')
    @Delete('access-profiles/:profileId')
    deleteAccessProfile(@Param('profileId') profileId: string) {
        return this.service.deleteAccessProfile(profileId);
    }
}

