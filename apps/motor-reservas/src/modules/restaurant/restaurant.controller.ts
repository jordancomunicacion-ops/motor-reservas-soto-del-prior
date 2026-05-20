import { Controller, Get, Post, Body, Param, Query, Patch, Delete, Req, Logger } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { WaitlistService } from './waitlist.service';
import { RestaurantReviewService } from './restaurant-review.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { CreateRestaurantDto, CreatePublicReservationDto, UpdateBookingStatusDto, AuthorizeUserDto, CreateAccessProfileDto, UpdateAccessProfileDto } from './restaurant.dto';
import type { AuthenticatedRequest } from '../../common/scope';

@Controller('restaurant')
export class RestaurantController {
    private readonly logger = new Logger(RestaurantController.name);

    constructor(
        private readonly service: RestaurantService,
        private readonly waitlistService: WaitlistService,
        private readonly reviewService: RestaurantReviewService,
    ) { }

    @Roles('ADMIN')
    @Post()
    createRestaurant(@Body() body: CreateRestaurantDto) {
        return this.service.createRestaurant(body);
    }

    @Roles('ADMIN')
    @Get()
    getRestaurants(@Req() req: AuthenticatedRequest) {
        return this.service.getRestaurants(req?.user);
    }

    @Roles('ADMIN')
    @Get(':id')
    getRestaurant(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getRestaurant(id, req?.user);
    }

    @Roles('ADMIN')
    @Patch(':id')
    updateRestaurant(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.updateRestaurant(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete(':id')
    deleteRestaurant(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.deleteRestaurant(id, req?.user);
    }

    @Roles('ADMIN')
    @Post('zones')
    createZone(@Body() body: { restaurantId: string; name: string }, @Req() req: AuthenticatedRequest) {
        return this.service.createZone(body.restaurantId, body.name, req?.user);
    }

    @Roles('ADMIN')
    @Post('tables')
    createTable(@Body() body: { zoneId: string; name: string; capacity: number }, @Req() req: AuthenticatedRequest) {
        return this.service.createTable(body.zoneId, body.name, body.capacity, req?.user);
    }

    @Roles('ADMIN')
    @Get(':id/tables')
    getTables(@Param('id') id: string, @Query('date') date?: string, @Req() req?: any) {
        return this.service.getTables(id, date, req?.user);
    }

    @Roles('ADMIN')
    @Get(':id/zones')
    getZones(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getTables(id, undefined, req?.user); // getTables returns the zones with tables
    }

    @Roles('ADMIN')
    @Post(':id/zones/sync')
    syncZones(@Param('id') id: string, @Body() body: any[], @Req() req: AuthenticatedRequest) {
        return this.service.syncZones(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Post('zones/:id/tables/sync')
    syncTables(@Param('id') id: string, @Body() body: any[], @Req() req: AuthenticatedRequest) {
        return this.service.syncTables(id, body, req?.user);
    }

    // --- Bookings ---
    @Roles('ADMIN')
    @Get(':id/bookings')
    getBookings(
        @Param('id') id: string,
        @Req() req: AuthenticatedRequest,
        @Query('date') date?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.service.getBookings(id, date, startDate, endDate, req?.user);
    }

    @Roles('ADMIN')
    @Post('bookings')
    createBooking(@Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.createBooking(body, req?.user);
    }

    // --- Waitlist ---
    @Roles('ADMIN')
    @Post(':id/waitlist')
    addToWaitlist(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.addToWaitlist(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Get(':id/waitlist')
    getWaitlist(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getWaitlist(id, req?.user);
    }

    // --- Public Widget Flow ---

    @Public()
    @Post('public/reservation')
    async createPublicReservation(@Body() body: CreatePublicReservationDto) {
        try {
            return await this.service.createPublicReservation(body);
        } catch (error) {
            this.logger.error('Error creating public reservation', error as Error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Public()
    @Post('reservation/:id/confirm')
    confirmReservation(@Param('id') id: string) {
        return this.service.confirmReservation(id);
    }

    // --- Self-service público (enlace desde email) ---

    @Public()
    @Get('public/reservation/:id')
    async getPublicReservation(@Param('id') id: string, @Query('token') token: string) {
        try {
            return await this.service.getPublicReservation(id, token);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Public()
    @Patch('public/reservation/:id')
    async updatePublicReservation(
        @Param('id') id: string,
        @Query('token') token: string,
        @Body() body: { date?: string; time?: string; pax?: number; notes?: string }
    ) {
        try {
            return await this.service.updatePublicReservation(id, token, body);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Public()
    @Post('public/reservation/:id/cancel')
    async cancelPublicReservation(@Param('id') id: string, @Query('token') token: string) {
        try {
            return await this.service.cancelPublicReservation(id, token);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    // --- Valoración post-experiencia ---

    @Public()
    @Get('public/reservation/:id/review')
    async getPublicReviewForm(@Param('id') id: string, @Query('token') token: string) {
        try {
            return await this.reviewService.getReviewForm(id, token);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Public()
    @Post('public/reservation/:id/review')
    async submitPublicReview(
        @Param('id') id: string,
        @Query('token') token: string,
        @Body() body: { serviceScore: number; ambianceScore: number; foodScore: number; advice?: string }
    ) {
        try {
            return await this.reviewService.submitReview(id, token, body);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Roles('ADMIN')
    @Get(':id/reviews')
    listRestaurantReviews(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.reviewService.listReviewsForRestaurant(id, req?.user);
    }

    @Roles('ADMIN')
    @Get('hotel/:hotelId/reviews')
    listHotelReviews(@Param('hotelId') hotelId: string, @Req() req: AuthenticatedRequest) {
        return this.reviewService.listReviewsForHotel(hotelId, req?.user);
    }

    @Roles('ADMIN')
    @Patch('reservation/:id/status')
    updateBookingStatus(@Param('id') id: string, @Body() body: UpdateBookingStatusDto, @Req() req: AuthenticatedRequest) {
        return this.service.updateBookingStatus(id, body.status, body.tableId, req?.user);
    }

    @Roles('ADMIN')
    @Patch('bookings/:id')
    updateBooking(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.updateBooking(id, body, req?.user);
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
    getShifts(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getShifts(id, req?.user);
    }

    @Roles('ADMIN')
    @Post(':id/shifts')
    async createShift(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        try {
            return await this.service.createShift(id, body, req?.user);
        } catch (e: any) {
            return { error: true, message: e.message };
        }
    }

    @Roles('ADMIN')
    @Post('linked-reservation')
    createLinkedReservation(@Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.createLinkedReservation(body, req?.user);
    }

    @Roles('ADMIN')
    @Delete(':id/shifts/:shiftId')
    deleteShift(@Param('shiftId') shiftId: string, @Req() req: AuthenticatedRequest) {
        return this.service.deleteShift(shiftId, req?.user);
    }

    @Roles('ADMIN')
    @Get(':id/closures')
    getClosures(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getClosures(id, req?.user);
    }

    @Roles('ADMIN')
    @Post(':id/closures')
    createClosure(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.createClosure(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete(':id/closures/:closureId')
    deleteClosure(@Param('closureId') closureId: string, @Req() req: AuthenticatedRequest) {
        return this.service.deleteClosure(closureId, req?.user);
    }

    @Roles('ADMIN')
    @Get(':id/openings')
    getOpenings(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getOpenings(id, req?.user);
    }

    @Roles('ADMIN')
    @Post(':id/openings')
    createOpening(@Param('id') id: string, @Body() body: any, @Req() req: AuthenticatedRequest) {
        return this.service.createOpening(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete(':id/openings/:openingId')
    deleteOpening(@Param('openingId') openingId: string, @Req() req: AuthenticatedRequest) {
        return this.service.deleteOpening(openingId, req?.user);
    }

    @Public()
    @Post('waitlist/:id/confirm')
    confirmWaitlist(@Param('id') id: string) {
        return this.waitlistService.confirmWaitlistEntry(id);
    }

    @Roles('ADMIN')
    @Get(':id/users')
    getAuthorizedUsers(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getAuthorizedUsers(id, req?.user);
    }

    @Roles('ADMIN')
    @Post(':id/users')
    authorizeUser(@Param('id') id: string, @Body() body: AuthorizeUserDto, @Req() req: AuthenticatedRequest) {
        return this.service.authorizeUser(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete(':id/users/:userId')
    deauthorizeUser(@Param('id') id: string, @Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
        return this.service.deauthorizeUser(id, userId, req?.user);
    }

    // --- Access Profiles ---
    @Roles('ADMIN')
    @Get(':id/access-profiles')
    getAccessProfiles(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
        return this.service.getAccessProfiles(id, req?.user);
    }

    @Roles('ADMIN')
    @Post(':id/access-profiles')
    createAccessProfile(@Param('id') id: string, @Body() body: CreateAccessProfileDto, @Req() req: AuthenticatedRequest) {
        return this.service.createAccessProfile(id, body, req?.user);
    }

    @Roles('ADMIN')
    @Patch('access-profiles/:profileId')
    updateAccessProfile(@Param('profileId') profileId: string, @Body() body: UpdateAccessProfileDto, @Req() req: AuthenticatedRequest) {
        return this.service.updateAccessProfile(profileId, body, req?.user);
    }

    @Roles('ADMIN')
    @Delete('access-profiles/:profileId')
    deleteAccessProfile(@Param('profileId') profileId: string, @Req() req: AuthenticatedRequest) {
        return this.service.deleteAccessProfile(profileId, req?.user);
    }
}

