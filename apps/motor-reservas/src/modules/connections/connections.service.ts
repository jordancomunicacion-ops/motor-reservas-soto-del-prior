import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConnectionsService {
    private readonly logger = new Logger(ConnectionsService.name);

    constructor(private prisma: PrismaService) { }

    // Save or update connection
    async saveConnection(data: {
        type: string;
        name: string;
        hotelId?: string;
        restaurantId?: string;
        credentials: any;
    }) {
        try {
            const existing = await (this.prisma as any).integrationConnection.findFirst({
                where: {
                    type: data.type,
                    hotelId: data.hotelId,
                    restaurantId: data.restaurantId
                }
            });

            if (existing) {
                return await (this.prisma as any).integrationConnection.update({
                    where: { id: existing.id },
                    data: {
                        name: data.name,
                        credentials: data.credentials,
                        enabled: true
                    }
                });
            }

            return await (this.prisma as any).integrationConnection.create({
                data: {
                    type: data.type,
                    name: data.name,
                    hotelId: data.hotelId,
                    restaurantId: data.restaurantId,
                    credentials: data.credentials,
                    enabled: true
                }
            });
        } catch (error) {
            this.logger.error(`Failed to save connection:`, error);
            throw error;
        }
    }

    // Get connection
    async getConnection(type: string, hotelId?: string, restaurantId?: string) {
        return (this.prisma as any).integrationConnection.findFirst({
            where: {
                type,
                hotelId,
                restaurantId
            }
        });
    }

    // Get all connections for a hotel/restaurant
    async getConnections(hotelId?: string, restaurantId?: string) {
        return (this.prisma as any).integrationConnection.findMany({
            where: {
                OR: [
                    { hotelId },
                    { restaurantId }
                ].filter(Boolean)
            }
        });
    }

    // Test connection (verify credentials work)
    async testConnection(connectionId: string, testFn: (credentials: any) => Promise<boolean>) {
        try {
            const connection = await (this.prisma as any).integrationConnection.findUnique({
                where: { id: connectionId }
            });

            if (!connection) {
                throw new Error('Connection not found');
            }

            const isValid = await testFn(connection.credentials);

            await (this.prisma as any).integrationConnection.update({
                where: { id: connectionId },
                data: {
                    isActive: isValid,
                    lastTestedAt: new Date(),
                    testError: isValid ? null : 'Test failed'
                }
            });

            return { success: isValid, connection };
        } catch (error) {
            this.logger.error(`Failed to test connection:`, error);

            // Update connection with error
            await (this.prisma as any).integrationConnection.update({
                where: { id: connectionId },
                data: {
                    isActive: false,
                    lastTestedAt: new Date(),
                    testError: error instanceof Error ? error.message : 'Test failed'
                }
            });

            return { success: false, error: error instanceof Error ? error.message : 'Test failed' };
        }
    }

    // Delete connection
    async deleteConnection(connectionId: string) {
        return (this.prisma as any).integrationConnection.delete({
            where: { id: connectionId }
        });
    }

    // Decrypt credentials (in production, use proper encryption)
    decryptCredentials(encrypted: any) {
        // TODO: Implement proper encryption/decryption
        return encrypted;
    }

    // Encrypt credentials (in production, use proper encryption)
    encryptCredentials(data: any) {
        // TODO: Implement proper encryption/decryption
        return data;
    }
}
