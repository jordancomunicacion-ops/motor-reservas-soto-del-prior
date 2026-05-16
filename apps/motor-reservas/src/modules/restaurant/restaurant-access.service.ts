import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../common/enums';
import { ensureRestaurantAccess, type AuthenticatedUser } from '../../common/scope';

interface AuthorizedUserPayload {
    email: string;
    password?: string;
    role?: string;
    permissions?: string[];
}

interface AccessProfilePayload {
    name: string;
    baseRole?: string;
    permissions: string[];
}

interface AccessProfileUpdatePayload {
    name?: string;
    baseRole?: string;
    permissions?: string[];
}

@Injectable()
export class RestaurantAccessService {
    constructor(private readonly prisma: PrismaService) {}

    async getAuthorizedUsers(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.user.findMany({
            where: { restaurantId },
            select: { id: true, email: true, name: true, role: true, permissions: true },
        });
    }

    async authorizeUser(restaurantId: string, data: AuthorizedUserPayload, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const email = data.email?.trim().toLowerCase();
        if (!email) throw new BadRequestException('Email obligatorio');

        const hashedPassword = data.password && data.password.length > 0
            ? await bcrypt.hash(data.password, 10)
            : undefined;

        const existing = await this.prisma.user.findUnique({ where: { email } });

        if (existing) {
            return this.prisma.user.update({
                where: { email },
                data: {
                    restaurantId,
                    role: (data.role as UserRole) || existing.role,
                    ...(hashedPassword ? { password: hashedPassword } : {}),
                    permissions: data.permissions?.join(',') || existing.permissions,
                },
            });
        }

        if (!hashedPassword) {
            throw new BadRequestException('Se requiere contraseña para crear un nuevo usuario');
        }

        return this.prisma.user.create({
            data: {
                email,
                restaurantId,
                password: hashedPassword,
                role: (data.role as UserRole) || UserRole.STAFF,
                permissions: data.permissions?.join(','),
            },
        });
    }

    async deauthorizeUser(restaurantId: string, userId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.user.update({
            where: { id: userId },
            data: { restaurantId: null, permissions: null },
        });
    }

    async getAccessProfiles(restaurantId: string, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        return this.prisma.accessProfile.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createAccessProfile(restaurantId: string, data: AccessProfilePayload, user?: AuthenticatedUser) {
        if (user) await ensureRestaurantAccess(user, this.prisma, restaurantId);
        const name = data.name?.trim();
        if (!name) throw new BadRequestException('Nombre del perfil obligatorio');
        return this.prisma.accessProfile.create({
            data: {
                restaurantId,
                name,
                baseRole: (data.baseRole as UserRole) || UserRole.STAFF,
                permissions: (data.permissions || []).join(','),
            },
        });
    }

    async updateAccessProfile(profileId: string, data: AccessProfileUpdatePayload, user?: AuthenticatedUser) {
        if (user) {
            const restaurantId = await this.restaurantIdForProfile(profileId);
            await ensureRestaurantAccess(user, this.prisma, restaurantId);
        }
        const update: { name?: string; baseRole?: UserRole; permissions?: string } = {};
        if (data.name !== undefined) update.name = data.name.trim();
        if (data.baseRole !== undefined) update.baseRole = data.baseRole as UserRole;
        if (data.permissions !== undefined) update.permissions = data.permissions.join(',');
        return this.prisma.accessProfile.update({ where: { id: profileId }, data: update });
    }

    async deleteAccessProfile(profileId: string, user?: AuthenticatedUser) {
        if (user) {
            const restaurantId = await this.restaurantIdForProfile(profileId);
            await ensureRestaurantAccess(user, this.prisma, restaurantId);
        }
        return this.prisma.accessProfile.delete({ where: { id: profileId } });
    }

    private async restaurantIdForProfile(profileId: string): Promise<string> {
        const profile = await this.prisma.accessProfile.findUnique({
            where: { id: profileId },
            select: { restaurantId: true },
        });
        if (!profile) throw new NotFoundException('Perfil de acceso no encontrado');
        return profile.restaurantId;
    }
}
