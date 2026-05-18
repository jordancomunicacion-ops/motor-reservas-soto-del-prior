import { Injectable, Logger } from '@nestjs/common';
import * as ical from 'node-ical';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tipos de integración OTA + Stripe gestionados desde la UI de connections del hotel.
 * El sufijo OTA_ coincide con la convención usada en `IntegrationConnection.type`.
 */
export const HOTEL_INTEGRATION_KINDS = [
    'booking',
    'airbnb',
    'expedia',
    'agoda',
    'hostelworld',
    'stripe'
] as const;
export type HotelIntegrationKind = typeof HOTEL_INTEGRATION_KINDS[number];

/** Mapeo kind (JSON key en Hotel.integrations) → type en IntegrationConnection. */
function kindToType(kind: HotelIntegrationKind): string {
    if (kind === 'stripe') return 'STRIPE';
    return `OTA_${kind.toUpperCase()}`;
}

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

    /**
     * Devuelve la configuración de una integración OTA/Stripe para un hotel.
     * Estrategia dual-source (igual que el CRM):
     *   1. tabla IntegrationConnection (fuente preferente)
     *   2. fallback a Hotel.integrations[kind] (JSON legacy)
     */
    async getOtaConfig(hotelId: string, kind: HotelIntegrationKind): Promise<any | null> {
        const type = kindToType(kind);
        const row = await (this.prisma as any).integrationConnection.findFirst({
            where: { type, hotelId, enabled: true }
        });
        if (row?.credentials) return row.credentials;

        const hotel = await this.prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { integrations: true }
        });
        const integrations = (hotel?.integrations as any) || {};
        const json = integrations[kind];
        if (json && json.enabled) return json;
        return null;
    }

    /**
     * Replica el JSON `Hotel.integrations` (booking/airbnb/expedia/agoda/hostelworld/stripe)
     * en filas de IntegrationConnection. Se llama desde PropertyService.updateHotel cada vez
     * que la UI guarda integraciones.
     *
     * Por cada kind:
     *  - si `enabled === true` → upsert con credentials = subobjeto JSON
     *  - si `enabled === false` o vacío → marca la fila como disabled (no la borra para no perder histórico)
     */
    async syncFromHotelIntegrations(hotelId: string, integrations: Record<string, any> | null | undefined) {
        if (!integrations) return;
        for (const kind of HOTEL_INTEGRATION_KINDS) {
            const cfg = integrations[kind];
            const type = kindToType(kind);
            if (!cfg) continue;
            const enabled = !!cfg.enabled;

            const existing = await (this.prisma as any).integrationConnection.findFirst({
                where: { type, hotelId }
            });

            if (existing) {
                await (this.prisma as any).integrationConnection.update({
                    where: { id: existing.id },
                    data: { credentials: cfg, enabled }
                });
            } else if (enabled) {
                await (this.prisma as any).integrationConnection.create({
                    data: {
                        type,
                        name: `${kind} (${hotelId.slice(0, 6)})`,
                        hotelId,
                        credentials: cfg,
                        enabled: true
                    }
                });
            }
        }
    }

    /**
     * Valida credenciales de una OTA según el kind. No persiste nada.
     *  - booking / airbnb / vrbo / etc con `icalUrl` → parse del iCal
     *  - stripe con `secretKey` → ping a Stripe (HEAD /v1/customers)
     *  - resto → solo comprueba que las credenciales no estén vacías
     */
    async testOtaCredentials(kind: HotelIntegrationKind, credentials: any): Promise<{ ok: boolean; message: string }> {
        if (!credentials) return { ok: false, message: 'Credenciales vacías' };

        // Caminos iCal: airbnb (icalUrl) y feeds genéricos
        if (credentials.icalUrl) {
            return this.testICalUrl(credentials.icalUrl);
        }

        if (kind === 'stripe') {
            const key = credentials.secretKey || credentials.apiKey;
            if (!key) return { ok: false, message: 'Falta secretKey de Stripe' };
            return this.testStripeKey(key);
        }

        // OTAs con apiKey (booking/expedia/agoda/hostelworld) — sin API pública sin Partner Connectivity,
        // solo validamos formato mínimo.
        if (credentials.apiKey) {
            if (typeof credentials.apiKey !== 'string' || credentials.apiKey.length < 4) {
                return { ok: false, message: 'apiKey demasiado corta' };
            }
            return { ok: true, message: `Credenciales ${kind} guardadas (validación remota no soportada vía iCal)` };
        }

        return { ok: false, message: 'No se ha podido determinar cómo validar este tipo de credencial' };
    }

    private async testICalUrl(url: string): Promise<{ ok: boolean; message: string }> {
        if (!/^https?:\/\//i.test(url)) {
            return { ok: false, message: 'La URL debe empezar por http(s)://' };
        }
        try {
            const events = await ical.async.fromURL(url);
            const count = Object.values(events).filter((e: any) => e?.type === 'VEVENT').length;
            return { ok: true, message: `iCal OK (${count} eventos)` };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error desconocido';
            return { ok: false, message: `iCal inválido: ${msg}` };
        }
    }

    private async testStripeKey(secretKey: string): Promise<{ ok: boolean; message: string }> {
        if (!/^sk_(test|live)_/.test(secretKey)) {
            return { ok: false, message: 'Formato de clave Stripe no reconocido (debe empezar por sk_test_ o sk_live_)' };
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const res = await fetch('https://api.stripe.com/v1/customers?limit=1', {
                method: 'GET',
                headers: { Authorization: `Bearer ${secretKey}` },
                signal: controller.signal
            });
            if (res.ok) return { ok: true, message: 'Stripe conectado correctamente' };
            if (res.status === 401) return { ok: false, message: 'Stripe rechazó la clave (401)' };
            return { ok: false, message: `Stripe respondió ${res.status}` };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error de red';
            return { ok: false, message: `Error contactando Stripe: ${msg}` };
        } finally {
            clearTimeout(timeout);
        }
    }
}
