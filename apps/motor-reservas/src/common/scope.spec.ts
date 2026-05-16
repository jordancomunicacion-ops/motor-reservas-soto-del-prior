import { ForbiddenException } from '@nestjs/common';
import {
    assertHotelAccess,
    assertRestaurantAccess,
    getUserScope,
    type AuthenticatedUser,
    type UserScope,
} from './scope';
import { PrismaService } from '../prisma/prisma.service';

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
    id: 'u1',
    email: 'u@x',
    role: 'ADMIN',
    hotelId: null,
    restaurantId: null,
    ...overrides,
});

// Mock parcial de PrismaService — solo la única consulta que hace getUserScope.
const prismaFor = (hotelLookup: { restaurantId: string | null } | null) =>
    ({
        hotel: { findUnique: jest.fn().mockResolvedValue(hotelLookup) },
    } as unknown as PrismaService);

describe('getUserScope', () => {
    it('sin hotelId ni restaurantId → super-admin global', async () => {
        const scope = await getUserScope(user(), prismaFor(null));
        expect(scope).toEqual({ hotelIds: null, restaurantIds: null, isGlobalAdmin: true });
    });

    it('null/undefined user → super-admin global (no rompe)', async () => {
        expect(await getUserScope(null, prismaFor(null))).toEqual({
            hotelIds: null,
            restaurantIds: null,
            isGlobalAdmin: true,
        });
        expect(await getUserScope(undefined, prismaFor(null))).toEqual({
            hotelIds: null,
            restaurantIds: null,
            isGlobalAdmin: true,
        });
    });

    it('con hotelId resuelve también el restaurante de sinergia', async () => {
        const scope = await getUserScope(
            user({ hotelId: 'h1' }),
            prismaFor({ restaurantId: 'r-synergy' }),
        );
        expect(scope).toEqual({
            hotelIds: ['h1'],
            restaurantIds: ['r-synergy'],
            isGlobalAdmin: false,
        });
    });

    it('con hotelId pero sin sinergia → restaurantIds vacío (no null)', async () => {
        const scope = await getUserScope(user({ hotelId: 'h1' }), prismaFor({ restaurantId: null }));
        expect(scope).toEqual({
            hotelIds: ['h1'],
            restaurantIds: [],
            isGlobalAdmin: false,
        });
    });

    it('con restaurantId → solo ese restaurante, sin hoteles', async () => {
        const scope = await getUserScope(user({ restaurantId: 'r1' }), prismaFor(null));
        expect(scope).toEqual({
            hotelIds: [],
            restaurantIds: ['r1'],
            isGlobalAdmin: false,
        });
    });

    it('hotelId tiene prioridad sobre restaurantId si llegan ambos', async () => {
        const scope = await getUserScope(
            user({ hotelId: 'h1', restaurantId: 'r-direct' }),
            prismaFor({ restaurantId: 'r-synergy' }),
        );
        // Mantenemos el comportamiento actual: gana la rama del hotel y se usa el de sinergia,
        // no el restaurantId que vino en el JWT.
        expect(scope.restaurantIds).toEqual(['r-synergy']);
    });
});

describe('assertHotelAccess', () => {
    const globalScope: UserScope = { hotelIds: null, restaurantIds: null, isGlobalAdmin: true };
    const limitedScope: UserScope = { hotelIds: ['h1'], restaurantIds: [], isGlobalAdmin: false };

    it('global admin pasa siempre', () => {
        expect(() => assertHotelAccess(globalScope, 'cualquier-id')).not.toThrow();
    });

    it('usuario con acceso a ese hotel pasa', () => {
        expect(() => assertHotelAccess(limitedScope, 'h1')).not.toThrow();
    });

    it('usuario sin acceso lanza ForbiddenException', () => {
        expect(() => assertHotelAccess(limitedScope, 'h2')).toThrow(ForbiddenException);
    });
});

describe('assertRestaurantAccess', () => {
    const globalScope: UserScope = { hotelIds: null, restaurantIds: null, isGlobalAdmin: true };
    const limitedScope: UserScope = { hotelIds: [], restaurantIds: ['r1'], isGlobalAdmin: false };

    it('global admin pasa siempre', () => {
        expect(() => assertRestaurantAccess(globalScope, 'cualquier-id')).not.toThrow();
    });

    it('usuario con acceso a ese restaurante pasa', () => {
        expect(() => assertRestaurantAccess(limitedScope, 'r1')).not.toThrow();
    });

    it('usuario sin acceso lanza ForbiddenException', () => {
        expect(() => assertRestaurantAccess(limitedScope, 'r2')).toThrow(ForbiddenException);
    });
});
