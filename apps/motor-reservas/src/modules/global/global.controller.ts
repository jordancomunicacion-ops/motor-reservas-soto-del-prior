import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('global')
export class GlobalController {
    constructor(private prisma: PrismaService) { }

    @Get('contexts')
    async getContexts() {
        const [hotels, restaurants] = await Promise.all([
            this.prisma.hotel.findMany({
                select: { id: true, name: true, restaurantId: true }
            }),
            this.prisma.restaurant.findMany({
                select: { id: true, name: true }
            })
        ]);

        console.log(`[DEBUG] Contexts requested. Found ${hotels.length} hotels and ${restaurants.length} restaurants.`);
        console.log('[DEBUG] Hotels:', hotels.map(h => h.name));
        console.log('[DEBUG] Restaurants:', restaurants.map(r => r.name));

        return {
            hotels,
            restaurants
        };
    }
}
