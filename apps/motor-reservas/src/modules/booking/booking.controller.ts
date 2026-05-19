import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { HotelReviewService } from './hotel-review.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { CreateHotelBookingDto, CheckAvailabilityDto, CancelBookingDto } from './booking.dto';
import type { AuthenticatedRequest } from '../../common/scope';

@Controller('bookings')
export class BookingController {
    constructor(
        private readonly bookingService: BookingService,
        private readonly reviewService: HotelReviewService,
    ) { }

    @Roles('ADMIN')
    @Post()
    createBooking(@Body() body: CreateHotelBookingDto) {
        return this.bookingService.createBooking(body);
    }

    @Public()
    @Get('availability')
    checkAvailability(
        @Query('hotelId') hotelId: string,
        @Query('from') from: string,
        @Query('to') to: string,
        @Query('pax') pax: string
    ) {
        return this.bookingService.checkAvailability(hotelId, from, to, +pax);
    }

    // --- Valoración post-estancia (rutas literales antes que el wildcard :hotelId) ---

    @Public()
    @Get('public/:id/review')
    async getPublicReviewForm(@Param('id') id: string, @Query('token') token: string) {
        try {
            return await this.reviewService.getReviewForm(id, token);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Public()
    @Post('public/:id/review')
    async submitPublicReview(
        @Param('id') id: string,
        @Query('token') token: string,
        @Body() body: { serviceScore: number; roomScore: number; cleanlinessScore: number; advice?: string }
    ) {
        try {
            return await this.reviewService.submitReview(id, token, body);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: true, message };
        }
    }

    @Roles('ADMIN')
    @Get('hotel/:hotelId/reviews')
    listHotelReviews(@Param('hotelId') hotelId: string, @Req() req: AuthenticatedRequest) {
        return this.reviewService.listReviewsForHotel(hotelId, req?.user);
    }

    @Roles('ADMIN')
    @Get(':hotelId')
    getBookings(@Param('hotelId') hotelId: string) {
        return this.bookingService.getBookings(hotelId);
    }

    @Public()
    @Post(':id/cancel')
    cancelBooking(@Param('id') id: string, @Body() body?: CancelBookingDto) {
        return this.bookingService.cancelBooking(id);
    }
}
