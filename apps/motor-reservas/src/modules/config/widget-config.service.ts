import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WidgetConfigService {
    constructor(private prisma: PrismaService) { }

    async getConfig(id: string) {
        // Try to find by hotelId first, then by restaurantId
        let config = await this.prisma.widgetConfig.findFirst({ 
            where: { 
                OR: [
                    { hotelId: id },
                    { restaurantId: id }
                ]
            } 
        });

        // If no config found, return defaults
        if (!config) {
            config = {
                id: '',
                hotelId: null,
                restaurantId: null,
                primaryColor: '#3b82f6',
                secondaryColor: '#1e40af',
                customCss: '',
                showLogo: true,
                title: null,
                showCrmFields: true,
                skipGuaranteeStep: false
            } as any;
        }

        return config;
    }


    async updateConfig(id: string, data: any) {
        // Determine if id is for a hotel or restaurant
        // For simplicity, we check if it exists in Hotel table first
        const isHotel = await this.prisma.hotel.findUnique({ where: { id } });
        
        const where = isHotel ? { hotelId: id } : { restaurantId: id };
        const create = isHotel ? { hotelId: id, ...data } : { restaurantId: id, ...data };

        return this.prisma.widgetConfig.upsert({
            where: where as any,
            update: { ...data },
            create: create as any
        });
    }
}
