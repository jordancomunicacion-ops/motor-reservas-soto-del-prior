import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantService {
    constructor(private prisma: PrismaService) { }

    // --- Restaurant ---
    async createRestaurant(data: { name: string; currency: string }) {
        return this.prisma.restaurant.create({ data });
    }

    async getRestaurants() {
        return this.prisma.restaurant.findMany({ include: { zones: true } });
    }

    // --- Zones ---
    async createZone(restaurantId: string, name: string) {
        return this.prisma.zone.create({
            data: { restaurantId, name }
        });
    }

    // --- Tables ---
    async createTable(zoneId: string, name: string, capacity: number) {
        return this.prisma.table.create({
            data: { zoneId, name, capacity }
        });
    }

    async getTables(restaurantId: string) {
        return this.prisma.zone.findMany({
            where: { restaurantId },
            include: { tables: true }
        });
    }
}
