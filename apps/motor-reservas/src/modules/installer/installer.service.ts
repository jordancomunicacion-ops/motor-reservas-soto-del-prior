import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class InstallerService {
    private readonly logger = new Logger(InstallerService.name);

    constructor(private prisma: PrismaService) { }

    async getStatus() {
        const hotelCount = await this.prisma.hotel.count();
        const userCount = await this.prisma.user.count();
        return {
            isInstalled: hotelCount > 0 && userCount > 0,
            setupRequired: hotelCount === 0 || userCount === 0,
            hasUsers: userCount > 0
        };
    }

    async setupSystem(data: {
        hotelName: string;
        currency: string;
        adminEmail: string;
        adminPassword?: string;
        createRestaurant?: boolean;
        restaurantName?: string;
        zones?: { name: string; tables: number }[];
    }) {
        const existingHotels = await this.prisma.hotel.count();
        const existingUsers = await this.prisma.user.count();
        if (existingHotels > 0 && existingUsers > 0) {
            throw new BadRequestException('System already installed');
        }

        if (!data.adminEmail || !data.adminPassword) {
            throw new BadRequestException('adminEmail y adminPassword son obligatorios');
        }
        if (data.adminPassword.length < 8) {
            throw new BadRequestException('La contraseña del administrador debe tener al menos 8 caracteres');
        }

        const normalizedEmail = data.adminEmail.trim().toLowerCase();
        const passwordHash = await bcrypt.hash(data.adminPassword, 10);

        // 1. Create Hotel (only if missing — allows re-running install when hotel exists but user doesn't)
        let hotel = await this.prisma.hotel.findFirst();
        if (!hotel) {
            hotel = await this.prisma.hotel.create({
                data: {
                    name: data.hotelName,
                    currency: data.currency,
                    timezone: 'Europe/Madrid',
                }
            });

            // Default Inventory
            await this.prisma.roomType.create({
                data: {
                    hotelId: hotel.id,
                    name: 'Habitación Doble',
                    basePrice: 100,
                    capacity: 2,
                    rooms: {
                        createMany: {
                            data: [{ name: '101' }, { name: '102' }, { name: '103' }]
                        }
                    }
                }
            });

            await this.prisma.roomType.create({
                data: {
                    hotelId: hotel.id,
                    name: 'Suite de Lujo',
                    basePrice: 250,
                    capacity: 4,
                    rooms: {
                        createMany: {
                            data: [{ name: '201' }, { name: '202' }]
                        }
                    }
                }
            });
        }

        // 2. Create Restaurant (Optional)
        if (data.createRestaurant && data.restaurantName) {
            const existingRestaurant = await this.prisma.restaurant.findFirst({
                where: { name: data.restaurantName }
            });
            if (!existingRestaurant) {
                const restaurant = await this.prisma.restaurant.create({
                    data: {
                        name: data.restaurantName,
                        currency: data.currency
                    }
                });

                const zonesToCreate = data.zones && data.zones.length > 0
                    ? data.zones
                    : [
                        { name: 'Salón Principal', tables: 6 },
                        { name: 'Terraza', tables: 4 }
                    ];

                const tables: any[] = [];

                let zoneIndex = 0;
                for (const z of zonesToCreate) {
                    const zone = await this.prisma.zone.create({
                        data: { restaurantId: restaurant.id, name: z.name, index: zoneIndex++ }
                    });

                    for (let i = 1; i <= z.tables; i++) {
                        tables.push({
                            zoneId: zone.id,
                            name: i <= 9 ? `M-${i}` : `${i}`,
                            capacity: 4,
                            x: (i - 1) % 4 * 100,
                            y: Math.floor((i - 1) / 4) * 100
                        });
                    }
                }

                if (tables.length > 0) {
                    await this.prisma.table.createMany({ data: tables });
                }
            }
        }

        // 3. Create / promote admin user (idempotent by email)
        const existingAdmin = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingAdmin) {
            await this.prisma.user.update({
                where: { email: normalizedEmail },
                data: {
                    password: passwordHash,
                    role: 'ADMIN',
                    hotelId: hotel.id
                }
            });
        } else {
            await this.prisma.user.create({
                data: {
                    email: normalizedEmail,
                    password: passwordHash,
                    role: 'ADMIN',
                    name: 'Administrador',
                    hotelId: hotel.id
                }
            });
        }

        this.logger.log(`Install/recovery completed. Admin user ready: ${normalizedEmail}`);
        return { success: true, hotelId: hotel.id, message: 'System setup complete.' };
    }
}
