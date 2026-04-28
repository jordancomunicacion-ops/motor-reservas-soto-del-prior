import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventService } from './event.service';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  create(@Body() createEventDto: any) {
    return this.eventService.create({
        ...createEventDto,
        date: new Date(createEventDto.date),
        capacity: Number(createEventDto.capacity),
        price: Number(createEventDto.price)
    });
  }

  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: any) {
    if (updateEventDto.date) updateEventDto.date = new Date(updateEventDto.date);
    if (updateEventDto.capacity) updateEventDto.capacity = Number(updateEventDto.capacity);
    if (updateEventDto.price) updateEventDto.price = Number(updateEventDto.price);
    
    return this.eventService.update(id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(id);
  }

  @Post(':id/bookings')
  createBooking(@Param('id') id: string, @Body() bookingData: any) {
    return this.eventService.createBooking(id, bookingData);
  }
}
