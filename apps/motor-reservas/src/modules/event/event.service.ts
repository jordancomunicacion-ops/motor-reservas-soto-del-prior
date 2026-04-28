import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.event.findMany({
      include: {
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async create(data: { name: string; date: Date; capacity: number; price: number; description?: string }) {
    return this.prisma.event.create({
      data: {
        ...data,
        integrations: {},
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.event.update({
      where: { id },
      data,
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

    return this.prisma.eventBooking.create({
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
  }
}
