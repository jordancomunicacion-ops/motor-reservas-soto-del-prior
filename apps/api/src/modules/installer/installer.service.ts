import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class InstallerService {
    constructor(private prisma: PrismaService) { }

    async getStatus() {
        // Check if any booking exists as a proxy for "is installed and used"
        // Or better, check if any HOTEL exists.
        const hotelCount = await this.prisma.hotel.count();
        return {
            isInstalled: hotelCount > 0,
            setupRequired: hotelCount === 0
        };
    }

    async setupSystem(data: {
        hotelName: string;
        currency: string;
        adminEmail: string; // Ideally create a User model, but for now we simplify
    }) {
        const existing = await this.prisma.hotel.count();
        if (existing > 0) {
            throw new BadRequestException('System already installed');
        }

        // 1. Create Hotel
        const hotel = await this.prisma.hotel.create({
            data: {
                name: data.hotelName,
                currency: data.currency,
                timezone: 'UTC', // Default
            }
        });

        // 2. Create Default Inventory (Demo Data)
        const doubleRoom = await this.prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Standard Double',
                basePrice: 100,
                capacity: 2,
                rooms: {
                    createMany: {
                        data: [
                            { name: '101' }, { name: '102' }, { name: '103' }
                        ]
                    }
                }
            }
        });

        const suiteRoom = await this.prisma.roomType.create({
            data: {
                hotelId: hotel.id,
                name: 'Luxury Suite',
                basePrice: 250,
                capacity: 4,
                rooms: {
                    createMany: {
                        data: [
                            { name: '201' }, { name: '202' }
                        ]
                    }
                }
            }
        });

        return { success: true, hotelId: hotel.id, message: 'System setup complete. Default rooms created.' };
    }
}
