import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RestaurantAccessService } from './restaurant-access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../common/enums';
import type { AuthenticatedUser } from '../../common/scope';

type PrismaMock = {
    user: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        update: jest.Mock;
        create: jest.Mock;
    };
    accessProfile: {
        findMany: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
    };
    restaurant: { findUnique: jest.Mock };
    hotel: { findUnique: jest.Mock };
};

const makePrisma = (): PrismaMock => ({
    user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
    },
    accessProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    restaurant: { findUnique: jest.fn() },
    hotel: { findUnique: jest.fn() },
});

const globalAdmin: AuthenticatedUser = {
    id: 'super',
    email: 'super@x',
    role: 'ADMIN',
    hotelId: null,
    restaurantId: null,
};

const restaurantAdmin = (restaurantId: string): AuthenticatedUser => ({
    id: 'admin1',
    email: 'a@x',
    role: 'ADMIN',
    hotelId: null,
    restaurantId,
});

describe('RestaurantAccessService', () => {
    let prisma: PrismaMock;
    let service: RestaurantAccessService;

    beforeEach(() => {
        prisma = makePrisma();
        service = new RestaurantAccessService(prisma as unknown as PrismaService);
    });

    describe('getAuthorizedUsers', () => {
        it('devuelve los usuarios de un restaurante con campos seguros (sin password)', async () => {
            prisma.user.findMany.mockResolvedValue([
                { id: 'u1', email: 'a@x', name: 'A', role: 'ADMIN', permissions: 'r1,r2' },
            ]);
            const result = await service.getAuthorizedUsers('r1', globalAdmin);
            expect(result).toEqual([
                { id: 'u1', email: 'a@x', name: 'A', role: 'ADMIN', permissions: 'r1,r2' },
            ]);
            expect(prisma.user.findMany).toHaveBeenCalledWith({
                where: { restaurantId: 'r1' },
                select: { id: true, email: true, name: true, role: true, permissions: true },
            });
        });

        it('omite la verificación de acceso si user es undefined (uso interno)', async () => {
            prisma.user.findMany.mockResolvedValue([]);
            await expect(service.getAuthorizedUsers('r1')).resolves.toEqual([]);
        });
    });

    describe('authorizeUser', () => {
        it('rechaza email vacío con BadRequestException', async () => {
            await expect(
                service.authorizeUser('r1', { email: '   ' }, globalAdmin),
            ).rejects.toThrow(BadRequestException);
        });

        it('crea un nuevo user con password hasheada cuando no existe', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data }));

            const result = await service.authorizeUser(
                'r1',
                { email: 'NEW@X', password: 'p4ssw0rd', role: 'STAFF', permissions: ['r1', 'r2'] },
                globalAdmin,
            );

            expect(prisma.user.create).toHaveBeenCalledTimes(1);
            const createArg = prisma.user.create.mock.calls[0][0];
            expect(createArg.data.email).toBe('new@x');
            expect(createArg.data.restaurantId).toBe('r1');
            expect(createArg.data.role).toBe('STAFF');
            expect(createArg.data.permissions).toBe('r1,r2');
            // bcrypt hash != plaintext
            expect(createArg.data.password).not.toBe('p4ssw0rd');
            expect(await bcrypt.compare('p4ssw0rd', createArg.data.password)).toBe(true);
            expect(result).toMatchObject({ id: 'new' });
        });

        it('rechaza crear nuevo user sin password', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            await expect(
                service.authorizeUser('r1', { email: 'new@x' }, globalAdmin),
            ).rejects.toThrow(BadRequestException);
            expect(prisma.user.create).not.toHaveBeenCalled();
        });

        it('actualiza user existente preservando password si no llega una nueva', async () => {
            const existing = {
                id: 'u1',
                email: 'a@x',
                role: UserRole.STAFF,
                permissions: 'old',
            };
            prisma.user.findUnique.mockResolvedValue(existing);
            prisma.user.update.mockImplementation(({ data }) =>
                Promise.resolve({ ...existing, ...data }),
            );

            await service.authorizeUser('r2', { email: 'A@X', role: 'MANAGER' }, globalAdmin);

            const updateArg = prisma.user.update.mock.calls[0][0];
            expect(updateArg.where).toEqual({ email: 'a@x' });
            expect(updateArg.data.restaurantId).toBe('r2');
            expect(updateArg.data.role).toBe('MANAGER');
            expect(updateArg.data).not.toHaveProperty('password');
            // permissions preservadas porque no llegan en el payload
            expect(updateArg.data.permissions).toBe('old');
        });

        it('rota la password del user existente si llega una nueva', async () => {
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1',
                email: 'a@x',
                role: UserRole.STAFF,
                permissions: null,
            });
            prisma.user.update.mockImplementation(({ data }) => Promise.resolve(data));

            await service.authorizeUser('r1', { email: 'a@x', password: 'newOne!' }, globalAdmin);

            const updateArg = prisma.user.update.mock.calls[0][0];
            expect(await bcrypt.compare('newOne!', updateArg.data.password)).toBe(true);
        });
    });

    describe('deauthorizeUser', () => {
        it('limpia restaurantId y permisos del user', async () => {
            prisma.user.update.mockResolvedValue({ id: 'u1', restaurantId: null });
            await service.deauthorizeUser('r1', 'u1', globalAdmin);
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'u1' },
                data: { restaurantId: null, permissions: null },
            });
        });
    });

    describe('createAccessProfile', () => {
        it('rechaza nombre vacío', async () => {
            await expect(
                service.createAccessProfile('r1', { name: '   ', permissions: [] }, globalAdmin),
            ).rejects.toThrow(BadRequestException);
        });

        it('crea el perfil con permissions como CSV y baseRole por defecto STAFF', async () => {
            prisma.accessProfile.create.mockImplementation(({ data }) =>
                Promise.resolve({ id: 'p1', ...data }),
            );
            await service.createAccessProfile(
                'r1',
                { name: 'Camarero  ', permissions: ['r1', 'r2'] },
                globalAdmin,
            );
            const createArg = prisma.accessProfile.create.mock.calls[0][0];
            expect(createArg.data).toEqual({
                restaurantId: 'r1',
                name: 'Camarero',
                baseRole: 'STAFF',
                permissions: 'r1,r2',
            });
        });

        it('respeta baseRole cuando se especifica', async () => {
            prisma.accessProfile.create.mockImplementation(({ data }) =>
                Promise.resolve({ id: 'p1', ...data }),
            );
            await service.createAccessProfile(
                'r1',
                { name: 'Gerente', baseRole: 'MANAGER', permissions: [] },
                globalAdmin,
            );
            expect(prisma.accessProfile.create.mock.calls[0][0].data.baseRole).toBe('MANAGER');
            expect(prisma.accessProfile.create.mock.calls[0][0].data.permissions).toBe('');
        });
    });

    describe('updateAccessProfile', () => {
        it('lanza NotFoundException si el perfil no existe (verificación de scope)', async () => {
            prisma.accessProfile.findUnique.mockResolvedValue(null);
            await expect(
                service.updateAccessProfile(
                    'pX',
                    { name: 'Nuevo' },
                    restaurantAdmin('r1'),
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it('solo actualiza los campos presentes en el payload', async () => {
            prisma.accessProfile.findUnique.mockResolvedValue({ restaurantId: 'r1' });
            prisma.hotel.findUnique.mockResolvedValue(null);
            prisma.accessProfile.update.mockImplementation(({ data }) => Promise.resolve(data));

            await service.updateAccessProfile(
                'p1',
                { permissions: ['x', 'y'] },
                restaurantAdmin('r1'),
            );

            const updateArg = prisma.accessProfile.update.mock.calls[0][0];
            expect(updateArg.where).toEqual({ id: 'p1' });
            expect(updateArg.data).toEqual({ permissions: 'x,y' });
            expect(updateArg.data).not.toHaveProperty('name');
            expect(updateArg.data).not.toHaveProperty('baseRole');
        });
    });

    describe('deleteAccessProfile', () => {
        it('verifica scope antes de borrar', async () => {
            prisma.accessProfile.findUnique.mockResolvedValue(null);
            await expect(
                service.deleteAccessProfile('pX', restaurantAdmin('r1')),
            ).rejects.toThrow(NotFoundException);
            expect(prisma.accessProfile.delete).not.toHaveBeenCalled();
        });

        it('borra cuando el perfil existe y el user tiene scope', async () => {
            prisma.accessProfile.findUnique.mockResolvedValue({ restaurantId: 'r1' });
            prisma.hotel.findUnique.mockResolvedValue(null);
            prisma.accessProfile.delete.mockResolvedValue({ id: 'p1' });
            await service.deleteAccessProfile('p1', restaurantAdmin('r1'));
            expect(prisma.accessProfile.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
        });
    });
});
