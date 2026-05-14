import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserScope {
    /** IDs de hoteles a los que el usuario puede acceder. `null` = sin restricción (super-admin). */
    hotelIds: string[] | null;
    /** IDs de restaurantes a los que el usuario puede acceder. `null` = sin restricción (super-admin). */
    restaurantIds: string[] | null;
    /** true si el usuario no tiene restricción por tenant (super-admin global). */
    isGlobalAdmin: boolean;
}

/**
 * Calcula el alcance multi-tenant del usuario autenticado a partir de `req.user`
 * (que ya viene poblado por JwtStrategy.validate con hotelId/restaurantId).
 *
 * Reglas:
 * - user.hotelId set → acceso a ese hotel + restaurante de sinergia (si existe).
 * - user.restaurantId set → acceso a ese restaurante.
 * - ambos null → super-admin global, ve todo.
 *
 * Hace una consulta a Hotel solo si el usuario está atado a un hotel, para resolver
 * el restaurante de sinergia.
 */
export async function getUserScope(user: any, prisma: PrismaService): Promise<UserScope> {
    const hotelId: string | null = user?.hotelId ?? null;
    const restaurantId: string | null = user?.restaurantId ?? null;

    if (!hotelId && !restaurantId) {
        return { hotelIds: null, restaurantIds: null, isGlobalAdmin: true };
    }

    if (hotelId) {
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { restaurantId: true }
        });
        return {
            hotelIds: [hotelId],
            restaurantIds: hotel?.restaurantId ? [hotel.restaurantId] : [],
            isGlobalAdmin: false
        };
    }

    return {
        hotelIds: [],
        restaurantIds: [restaurantId!],
        isGlobalAdmin: false
    };
}

/**
 * Lanza ForbiddenException si el hotelId solicitado no entra en el alcance del usuario.
 * Útil para endpoints `GET /hotels/:id`, `POST /hotels/:id/...`.
 */
export function assertHotelAccess(scope: UserScope, hotelId: string): void {
    if (scope.isGlobalAdmin) return;
    if (!scope.hotelIds?.includes(hotelId)) {
        throw new ForbiddenException('Sin acceso a este hotel');
    }
}

/**
 * Lanza ForbiddenException si el restaurantId solicitado no entra en el alcance del usuario.
 */
export function assertRestaurantAccess(scope: UserScope, restaurantId: string): void {
    if (scope.isGlobalAdmin) return;
    if (!scope.restaurantIds?.includes(restaurantId)) {
        throw new ForbiddenException('Sin acceso a este restaurante');
    }
}

/** Calcula el scope y verifica acceso a un hotel en una sola llamada. */
export async function ensureHotelAccess(user: any, prisma: PrismaService, hotelId: string): Promise<void> {
    const scope = await getUserScope(user, prisma);
    assertHotelAccess(scope, hotelId);
}

/** Calcula el scope y verifica acceso a un restaurante en una sola llamada. */
export async function ensureRestaurantAccess(user: any, prisma: PrismaService, restaurantId: string): Promise<void> {
    const scope = await getUserScope(user, prisma);
    assertRestaurantAccess(scope, restaurantId);
}
