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
            const existing = await (this.prisma as any).crmIntegration.findUnique({
                where: { hotelId }
            });

            if (existing) {
                return await (this.prisma as any).crmIntegration.update({
                    where: { id: existing.id },
                    data: {
                        ...config,
                        enabled: true
                    }
                });
            }

            return await (this.prisma as any).crmIntegration.create({
                data: {
                    hotelId,
                    ...config,
                    enabled: true
                }
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
            const existing = await (this.prisma as any).crmIntegration.findUnique({
                where: { restaurantId }
            });

            if (existing) {
                return await (this.prisma as any).crmIntegration.update({
                    where: { id: existing.id },
                    data: {
                        ...config,
                        enabled: true
                    }
                });
            }

            return await (this.prisma as any).crmIntegration.create({
                data: {
                    restaurantId,
                    ...config,
                    enabled: true
                }
            });
        } catch (error) {
            this.logger.error(`Failed to setup CRM for restaurant ${restaurantId}:`, error);
            throw error;
        }
    }

    async getCrmConfig(hotelId?: string, restaurantId?: string) {
        try {
            if (hotelId) {
                return await (this.prisma as any).crmIntegration.findUnique({
                    where: { hotelId }
                });
            }

            if (restaurantId) {
                return await (this.prisma as any).crmIntegration.findUnique({
                    where: { restaurantId }
                });
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
                return await (this.prisma as any).crmIntegration.update({
                    where: { hotelId },
                    data: { enabled: false }
                });
            }

            if (restaurantId) {
                return await (this.prisma as any).crmIntegration.update({
                    where: { restaurantId },
                    data: { enabled: false }
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
