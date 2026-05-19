import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EventService } from './event.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';
import { CreateEventDto, UpdateEventDto, CreateEventBookingDto } from './event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventService.create({
        ...createEventDto,
        date: new Date(createEventDto.date),
    });
  }

  @Public()
  @Get()
  findAll(
    @Query('restaurantId') restaurantId?: string,
    @Query('hotelId') hotelId?: string,
  ) {
    return this.eventService.findAll({ restaurantId, hotelId });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    const payload: any = { ...updateEventDto };
    if (payload.date) payload.date = new Date(payload.date);
    return this.eventService.update(id, payload);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Public()
  @Post(':id/bookings')
  createBooking(@Param('id') id: string, @Body() bookingData: CreateEventBookingDto) {
    return this.eventService.createBooking(id, bookingData);
  }

  @Roles('ADMIN')
  @Delete(':eventId/bookings/:bookingId')
  cancelBooking(
    @Param('eventId') eventId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.eventService.cancelBooking(eventId, bookingId);
  }
}
