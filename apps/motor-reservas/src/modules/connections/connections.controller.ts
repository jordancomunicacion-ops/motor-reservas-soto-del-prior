import { Controller, Post, Get, Delete, Body, Param, Query, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConnectionsService, HOTEL_INTEGRATION_KINDS, type HotelIntegrationKind } from './connections.service';
import { Roles } from '../../auth/roles.decorator';
import { ensureHotelAccess, type AuthenticatedRequest } from '../../common/scope';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('connections')
export class ConnectionsController {
    constructor(
        private readonly connectionsService: ConnectionsService,
        private readonly prisma: PrismaService
    ) { }

    /**
     * Si el usuario no es super-admin global, ignora los params y fuerza a usar su propio
     * hotelId/restaurantId del JWT. Si es global, deja pasar los params tal cual.
     * También rechaza si el usuario intenta mezclar hotel/restaurante distintos al suyo.
     */
    private resolveScopedParams(user: any, hotelId?: string, restaurantId?: string) {
        const userHotelId: string | null = user?.hotelId ?? null;
        const userRestaurantId: string | null = user?.restaurantId ?? null;
        const isGlobal = !userHotelId && !userRestaurantId;

        if (isGlobal) {
            return { hotelId, restaurantId };
        }

        if (hotelId && userHotelId && hotelId !== userHotelId) {
            throw new ForbiddenException('Sin acceso a este hotel');
        }
        if (restaurantId && userRestaurantId && restaurantId !== userRestaurantId) {
            throw new ForbiddenException('Sin acceso a este restaurante');
        }
        if (hotelId && !userHotelId) {
            throw new ForbiddenException('Sin acceso a hoteles');
        }
        if (restaurantId && !userRestaurantId) {
            throw new ForbiddenException('Sin acceso a restaurantes');
        }

        return {
            hotelId: userHotelId ?? undefined,
            restaurantId: userRestaurantId ?? undefined
        };
    }

    @Post()
    async saveConnection(
        @Req() req: AuthenticatedRequest,
        @Body() body: {
            type: string;
            name: string;
            hotelId?: string;
            restaurantId?: string;
            credentials: any;
        }
    ) {
        const scoped = this.resolveScopedParams(req?.user, body.hotelId, body.restaurantId);
        return this.connectionsService.saveConnection({
            ...body,
            hotelId: scoped.hotelId,
            restaurantId: scoped.restaurantId
        });
    }

    @Get()
    async getConnections(
        @Req() req: AuthenticatedRequest,
        @Query('hotelId') hotelId?: string,
        @Query('restaurantId') restaurantId?: string
    ) {
        const scoped = this.resolveScopedParams(req?.user, hotelId, restaurantId);
        return this.connectionsService.getConnections(scoped.hotelId, scoped.restaurantId);
    }

    @Get(':type')
    async getConnection(
        @Param('type') type: string,
        @Req() req: AuthenticatedRequest,
        @Query('hotelId') hotelId?: string,
        @Query('restaurantId') restaurantId?: string
    ) {
        const scoped = this.resolveScopedParams(req?.user, hotelId, restaurantId);
        return this.connectionsService.getConnection(type, scoped.hotelId, scoped.restaurantId);
    }

    @Post('test/:connectionId')
    async testConnection(@Param('connectionId') connectionId: string) {
        // Testing Google Analytics as example
        return this.connectionsService.testConnection(
            connectionId,
            async (credentials) => {
                // Verify Google Analytics credentials
                if (!credentials.propertyId) return false;
                // TODO: Implement actual Google Analytics API test
                return true;
            }
        );
    }

    @Delete(':connectionId')
    async deleteConnection(@Param('connectionId') connectionId: string) {
        return this.connectionsService.deleteConnection(connectionId);
    }

    /**
     * Test específico por tipo OTA/Stripe.
     * - Si llega `credentials` en el body, se testean esas (útil para "probar antes de guardar").
     * - Si no, se cargan del hotel con dual-source (tabla → JSON fallback).
     */
    @Post('test-ota')
    async testOta(
        @Req() req: AuthenticatedRequest,
        @Body() body: { hotelId: string; kind: HotelIntegrationKind; credentials?: any }
    ) {
        if (!body?.hotelId) throw new BadRequestException('hotelId requerido');
        if (!HOTEL_INTEGRATION_KINDS.includes(body.kind)) {
            throw new BadRequestException(`kind inválido. Permitidos: ${HOTEL_INTEGRATION_KINDS.join(', ')}`);
        }
        if (req?.user) await ensureHotelAccess(req.user, this.prisma, body.hotelId);

        const credentials = body.credentials ?? await this.connectionsService.getOtaConfig(body.hotelId, body.kind);
        if (!credentials) return { ok: false, message: `No hay configuración para ${body.kind} en este hotel` };
        return this.connectionsService.testOtaCredentials(body.kind, credentials);
    }
}
