import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CrmConfigService {
    private readonly logger = new Logger(CrmConfigService.name);

    constructor(private prisma: PrismaService) { }

    async setupHotelCrm(hotelId: string, config: {
        url: string;
        token?: string;
        sourceLabel?: string;
        trackingId?: string;
        campaignSource?: string;
        campaignMedium?: string;
        campaignName?: string;
    }) {
        try {
            const hotel = await this.prisma.hotel.findUnique({
                where: { id: hotelId }
            });

            if (!hotel) {
                throw new Error(`Hotel ${hotelId} not found`);
            }

            const integrations = (hotel.integrations as any) || {};
            integrations.crm = {
                ...config,
                enabled: true
            };

            return await this.prisma.hotel.update({
                where: { id: hotelId },
                data: { integrations }
            });
        } catch (error) {
            this.logger.error(`Failed to setup CRM for hotel ${hotelId}:`, error);
            throw error;
        }
    }

    async setupRestaurantCrm(restaurantId: string, config: {
        url: string;
        token?: string;
        sourceLabel?: string;
        trackingId?: string;
        campaignSource?: string;
        campaignMedium?: string;
        campaignName?: string;
    }) {
        try {
            const restaurant = await this.prisma.restaurant.findUnique({
                where: { id: restaurantId }
            });

            if (!restaurant) {
                throw new Error(`Restaurant ${restaurantId} not found`);
            }

            const integrations = (restaurant.integrations as any) || {};
            integrations.crm = {
                ...config,
                enabled: true
            };

            return await this.prisma.restaurant.update({
                where: { id: restaurantId },
                data: { integrations }
            });
        } catch (error) {
            this.logger.error(`Failed to setup CRM for restaurant ${restaurantId}:`, error);
            throw error;
        }
    }

    async getCrmConfig(hotelId?: string, restaurantId?: string) {
        try {
            if (restaurantId) {
                const restaurant = await this.prisma.restaurant.findUnique({
                    where: { id: restaurantId }
                });
                if (!restaurant) return null;
                const integrations = (restaurant.integrations as any) || {};
                return integrations.crm || null;
            }

            if (hotelId) {
                const hotel = await this.prisma.hotel.findUnique({
                    where: { id: hotelId }
                });
                if (!hotel) return null;
                const integrations = (hotel.integrations as any) || {};
                return integrations.crm || null;
            }

            return null;
        } catch (error) {
            this.logger.error(`Failed to get CRM config:`, error);
            return null;
        }
    }

    async disableCrm(hotelId?: string, restaurantId?: string) {
        try {
            if (hotelId) {
                const hotel = await this.prisma.hotel.findUnique({
                    where: { id: hotelId }
                });
                if (!hotel) return null;
                const integrations = (hotel.integrations as any) || {};
                if (integrations.crm) {
                    integrations.crm.enabled = false;
                }
                return await this.prisma.hotel.update({
                    where: { id: hotelId },
                    data: { integrations }
                });
            }

            if (restaurantId) {
                const restaurant = await this.prisma.restaurant.findUnique({
                    where: { id: restaurantId }
                });
                if (!restaurant) return null;
                const integrations = (restaurant.integrations as any) || {};
                if (integrations.crm) {
                    integrations.crm.enabled = false;
                }
                return await this.prisma.restaurant.update({
                    where: { id: restaurantId },
                    data: { integrations }
                });
            }
        } catch (error) {
            this.logger.error(`Failed to disable CRM:`, error);
        }
    }

    async testConnection(url: string, token?: string) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    source: 'TEST',
                    event: 'CONNECTION_TEST',
                    timestamp: new Date().toISOString()
                })
            });

            return {
                success: response.ok,
                status: response.status,
                message: response.ok ? 'Connection successful' : await response.text()
            };
        } catch (error) {
            return {
                success: false,
                status: 0,
                message: error instanceof Error ? error.message : 'Connection failed'
            };
        }
    }
}
