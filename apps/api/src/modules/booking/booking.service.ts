import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, BookingSource } from '@prisma/client';

@Injectable()
export class BookingService {
    constructor(private prisma: PrismaService) { }

    async createBooking(data: {
        hotelId: string;
        guestName: string;
        checkInDate: string;
        checkOutDate: string;
        roomTypeId: string;
        pax: number;
        totalPrice: number;
    }) {
        // 1. Get available room for this type
        const room = await this.findAvailableRoom(data.hotelId, data.roomTypeId, data.checkInDate, data.checkOutDate);

        if (!room) {
            throw new BadRequestException('No availability for this room type');
        }

        // 2. Create Booking
        return this.prisma.booking.create({
            data: {
                hotelId: data.hotelId,
                guestName: data.guestName,
                checkInDate: new Date(data.checkInDate),
                checkOutDate: new Date(data.checkOutDate),
                totalPrice: data.totalPrice,
                nights: this.calculateNights(new Date(data.checkInDate), new Date(data.checkOutDate)),
                referenceCode: `RES-${Date.now()}`,
                status: BookingStatus.CONFIRMED,
                source: BookingSource.MANUAL,
                bookingRooms: {
                    create: {
                        roomId: room.id,
                        rateSnapshot: data.totalPrice,
                        date: new Date(data.checkInDate) // Simplified
                    }
                }
            },
            include: { bookingRooms: true }
        });
    }

    async getBookings(hotelId: string) {
        return this.prisma.booking.findMany({
            where: { hotelId },
            include: { bookingRooms: { include: { room: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // PUBLIC AVAILABILITY
    async checkAvailability(hotelId: string, from: string, to: string, pax: number) {
        const roomTypes = await this.prisma.roomType.findMany({
            where: { hotelId, capacity: { gte: +pax } } // Ensure capacity
        });

        const availableTypes: any[] = [];

        for (const type of roomTypes) {
            const room = await this.findAvailableRoom(hotelId, type.id, from, to);
            if (room) {
                availableTypes.push({
                    ...type,
                    totalPrice: Number(type.basePrice) * this.calculateNights(new Date(from), new Date(to))
                });
            }
        }

        return availableTypes;
    }

    // --- Availability Logic (Simplified) ---
    private async findAvailableRoom(hotelId: string, roomTypeId: string, startStr: string, endStr: string) {
        const start = new Date(startStr);
        const end = new Date(endStr);

        const allRooms = await this.prisma.room.findMany({
            where: { roomTypeId, isActive: true }
        });

        for (const room of allRooms) {
            // Check if ANY confirmed booking overlaps
            // Overlap: (A_start < B_end) && (A_end > B_start)
            const isBusy = await this.prisma.bookingRoom.findFirst({
                where: {
                    roomId: room.id,
                    booking: {
                        status: BookingStatus.CONFIRMED,
                        checkInDate: { lt: end },
                        checkOutDate: { gt: start }
                    }
                }
            });

            if (!isBusy) return room;
        }

        return null;
    }

    private calculateNights(start: Date, end: Date) {
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
}
