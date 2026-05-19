import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBookingStatus } from '../../common/enums';
import { CrmIntegrationService } from '../crm/crm-integration.service';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private crmIntegrationService: CrmIntegrationService,
  ) {}

  async findAll(filters?: { restaurantId?: string; hotelId?: string }) {
    const where: { restaurantId?: string; hotelId?: string } = {};
    if (filters?.restaurantId) where.restaurantId = filters.restaurantId;
    if (filters?.hotelId) where.hotelId = filters.hotelId;

    return this.prisma.event.findMany({
      where,
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

    // Solo cuentan las bookings que ocupan plaza (no las canceladas)
    const activeBookings = event.bookings.filter(b => b.status !== EventBookingStatus.CANCELLED);
    const currentPax = activeBookings.reduce((sum, b) => sum + b.pax, 0);
    if (currentPax + data.pax > event.capacity) {
      throw new BadRequestException('No hay capacidad suficiente para este evento');
    }

    const booking = await this.prisma.eventBooking.create({
      data: {
        eventId,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        pax: data.pax,
        totalPrice: event.price.toNumber() * data.pax,
        status: EventBookingStatus.CONFIRMED,
        ...(data.stripePaymentMethodId ? { stripePaymentMethodId: data.stripePaymentMethodId } : {}),
        ...(data.stripeCustomerId ? { stripeCustomerId: data.stripeCustomerId } : {}),
      },
    });

    // Sync con CRM (no bloquea el flujo si falla)
    void this.crmIntegrationService.syncEventBooking(booking.id, 'CREATED');

    return booking;
  }

  async cancelBooking(eventId: string, bookingId: string) {
    const booking = await this.prisma.eventBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException(`EventBooking ${bookingId} no encontrada`);
    if (booking.eventId !== eventId) {
      throw new BadRequestException('La reserva no pertenece a este evento');
    }
    const updated = await this.prisma.eventBooking.update({
      where: { id: bookingId },
      data: { status: EventBookingStatus.CANCELLED },
    });

    void this.crmIntegrationService.syncEventBooking(updated.id, 'CANCELLED');

    return updated;
  }
}
