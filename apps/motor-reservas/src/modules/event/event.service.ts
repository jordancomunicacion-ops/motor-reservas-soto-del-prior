import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService
  ) {}

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        hotel: { select: { name: true } },
        restaurant: { select: { name: true } },
        _count: {
          select: { bookings: true },
        },
        zones: true
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        hotel: true,
        restaurant: true,
        bookings: {
          orderBy: { createdAt: 'desc' },
        },
        zones: true
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async create(data: any) {
    const { zoneIds, ...rest } = data;
    return this.prisma.event.create({
      data: {
        ...rest,
        integrations: {},
        zones: {
            connect: zoneIds?.map((id: string) => ({ id })) || []
        }
      },
    });
  }

  async update(id: string, data: any) {
    const { zoneIds, ...rest } = data;
    return this.prisma.event.update({
      where: { id },
      data: {
          ...rest,
          zones: {
              set: zoneIds?.map((id: string) => ({ id })) || []
          }
      },
    });
  }

  async remove(id: string) {
    return this.prisma.event.delete({
      where: { id },
    });
  }

  async createBooking(eventId: string, data: any) {
    const event = await this.findOne(eventId);
    
    // Check capacity
    const currentPax = event.bookings.reduce((sum, b) => sum + b.pax, 0);
    if (currentPax + data.pax > event.capacity) {
      throw new Error('Not enough capacity for this event');
    }

    const booking = await this.prisma.eventBooking.create({
      data: {
        eventId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        pax: data.pax,
        totalPrice: event.price.toNumber() * data.pax,
        status: 'CONFIRMED',
      },
    });

    // Sync with CRM removed for now

    return booking;
  }

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.eventBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });

    // Sync with CRM removed
    
    return booking;
  }
}
