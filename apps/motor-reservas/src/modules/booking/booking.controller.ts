import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { CreateHotelBookingDto, CheckAvailabilityDto, CancelBookingDto } from './booking.dto';

@Controller('bookings')
export class BookingController {
    constructor(private readonly bookingService: BookingService) { }

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
