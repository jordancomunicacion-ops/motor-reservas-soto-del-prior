import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventService } from './event.service';
import { Public } from '../../auth/public.decorator';
import { Roles } from '../../auth/roles.decorator';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() createEventDto: any) {
    return this.eventService.create({
        ...createEventDto,
        date: new Date(createEventDto.date),
        capacity: Number(createEventDto.capacity),
        price: Number(createEventDto.price)
    });
  }

  @Public()
  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: any) {
    if (updateEventDto.date) updateEventDto.date = new Date(updateEventDto.date);
    if (updateEventDto.capacity) updateEventDto.capacity = Number(updateEventDto.capacity);
    if (updateEventDto.price) updateEventDto.price = Number(updateEventDto.price);

    return this.eventService.update(id, updateEventDto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Public()
  @Post(':id/bookings')
  createBooking(@Param('id') id: string, @Body() bookingData: any) {
    return this.eventService.createBooking(id, bookingData);
  }
}
