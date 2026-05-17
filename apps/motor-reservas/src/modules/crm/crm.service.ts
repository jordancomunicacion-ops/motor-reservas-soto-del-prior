import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getUserScope } from '../../common/scope';

@Injectable()
export class CrmService {
    private readonly logger = new Logger(CrmService.name);

    constructor(private prisma: PrismaService) { }

    async identify(data: { email?: string; phone?: string; firstName?: string; lastName?: string }) {
        // Email es @unique en CustomerProfile, así que lo usamos como clave idempotente
        // vía upsert: dos llamadas concurrentes con el mismo email no crean duplicados.
        if (data.email) {
            return (this.prisma as any).customerProfile.upsert({
                where: { email: data.email },
                update: {
                    firstName: data.firstName || undefined,
                    lastName: data.lastName || undefined,
                    phone: data.phone || undefined
                },
                create: {
                    email: data.email,
                    phone: data.phone,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    lifecycleStage: 'LEAD'
                }
            });
        }

        // Sin email: phone no es @unique. Lookup + update | create (no idempotente, sin protección
        // contra duplicados; CustomerProfile.phone debería ser @unique en el futuro).
        let profile: any = null;
        if (data.phone) {
            profile = await (this.prisma as any).customerProfile.findFirst({
                where: { phone: data.phone },
                orderBy: { updatedAt: 'desc' }
            });
        }

        if (profile) {
            const updateData: any = {};
            if (!profile.firstName && data.firstName) updateData.firstName = data.firstName;
            if (!profile.lastName && data.lastName) updateData.lastName = data.lastName;
            if (Object.keys(updateData).length > 0) {
                return (this.prisma as any).customerProfile.update({
                    where: { id: profile.id },
                    data: updateData
                });
            }
            return profile;
        }

        return (this.prisma as any).customerProfile.create({
            data: {
                phone: data.phone,
                firstName: data.firstName,
                lastName: data.lastName,
                lifecycleStage: 'LEAD'
            }
        });
    }

    async trackVisit(data: {
        sessionId: string;
        url: string;
        visitorId?: string;
        email?: string;
        referrer?: string;
        userAgent?: string;
        duration?: number;
    }) {
        let customerProfileId: string | undefined;

        if (data.email) {
            const profile = await this.identify({ email: data.email });
            customerProfileId = profile.id;
        }

        const webVisit = await (this.prisma as any).webVisit.create({
            data: {
                sessionId: data.sessionId,
                url: data.url,
                visitorId: data.visitorId,
                referrer: data.referrer,
                userAgent: data.userAgent,
                duration: data.duration || 0,
                customerProfileId,
            }
        });

        // Update customer profile stats
        if (customerProfileId) {
            await (this.prisma as any).customerProfile.update({
                where: { id: customerProfileId },
                data: {
                    visitCount: { increment: 1 },
                    lastInteraction: new Date()
                }
            });
        }

        return webVisit;
    }

    async getProfiles(page = 1, limit = 50, user?: any) {
        // Opción B: scopeamos perfiles por HISTORIAL.
        // Un usuario de restaurante X solo ve perfiles que tengan al menos una reserva
        // (ResBooking) en X, identificados por coincidencia de guestEmail o guestPhone.
        // Super-admin global ve todos los perfiles.
        const scope = await getUserScope(user, this.prisma);

        let where: any = {};
        let scopedRestaurantIds: string[] | null = null; // null = sin filtro (global)

        if (!scope.isGlobalAdmin) {
            // Si el usuario no tiene restaurantes en scope (p.ej. user atado solo a un hotel
            // sin sinergia con restaurante), no debe ver ningún perfil — la lista de clientes
            // es por reservas y un hotel sin restaurante no genera reservas en este motor.
            if (!scope.restaurantIds || scope.restaurantIds.length === 0) {
                return [];
            }
            scopedRestaurantIds = scope.restaurantIds;

            // Recogemos los emails/teléfonos de invitados que tienen reservas en los restaurantes accesibles.
            const bookingsInScope = await this.prisma.resBooking.findMany({
                where: { restaurantId: { in: scope.restaurantIds } },
                select: { guestEmail: true, guestPhone: true }
            });

            const emails = [...new Set(bookingsInScope.map(b => b.guestEmail).filter((e): e is string => !!e))];
            const phones = [...new Set(bookingsInScope.map(b => b.guestPhone).filter((p): p is string => !!p))];

            if (emails.length === 0 && phones.length === 0) {
                return [];
            }

            const orClauses: any[] = [];
            if (emails.length > 0) orClauses.push({ email: { in: emails } });
            if (phones.length > 0) orClauses.push({ phone: { in: phones } });
            where = { OR: orClauses };
        }

        const profiles = await (this.prisma as any).customerProfile.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { identityLinks: true, webVisits: true } } }
        });

        // Overlay per-scope: las cifras del perfil (visitCount, lastInteraction, etc.) se recomputan
        // SOLO con reservas de los restaurantes accesibles. Esto significa que el mismo cliente,
        // visto desde Soroeta o desde Soto del Prior, muestra estadísticas distintas.
        return this.overlayScopedStats(profiles, scopedRestaurantIds);
    }

    /**
     * Recomputa stats per-perfil basándose en las reservas de los restaurantes en `restaurantIds`.
     * Si `restaurantIds` es null se computan stats globales (todas las reservas).
     *
     * Sobrescribe `visitCount` y `lastInteraction` del perfil con valores per-scope, y añade un
     * objeto `scopedStats` con el desglose completo (totalBookings, seated, cancelled, etc.).
     *
     * Nota: `totalSpend` se deja como está (valor global) porque ResBooking no tiene precio.
     */
    private async overlayScopedStats(profiles: any[], restaurantIds: string[] | null): Promise<any[]> {
        if (profiles.length === 0) return profiles;

        const emails = [...new Set(profiles.map(p => p.email).filter((e: any): e is string => !!e))];
        const phones = [...new Set(profiles.map(p => p.phone).filter((p: any): p is string => !!p))];

        if (emails.length === 0 && phones.length === 0) {
            return profiles.map(p => ({
                ...p,
                scopedStats: {
                    totalBookings: 0, seatedCount: 0, cancelledCount: 0,
                    cancelledOrNoShowRate: 0, lastReservation: null, firstReservation: null, totalPax: 0
                }
            }));
        }

        const orClauses: any[] = [];
        if (emails.length > 0) orClauses.push({ guestEmail: { in: emails } });
        if (phones.length > 0) orClauses.push({ guestPhone: { in: phones } });

        const bookingsWhere: any = { OR: orClauses };
        if (restaurantIds !== null) {
            bookingsWhere.restaurantId = { in: restaurantIds };
        }

        const bookings = await this.prisma.resBooking.findMany({
            where: bookingsWhere,
            select: {
                guestEmail: true,
                guestPhone: true,
                status: true,
                date: true,
                pax: true
            }
        });

        return profiles.map(profile => {
            const matching = bookings.filter(b =>
                (profile.email && b.guestEmail === profile.email) ||
                (profile.phone && b.guestPhone === profile.phone)
            );

            const committed = matching.filter(b => b.status !== 'PENDING_CONFIRMATION');
            const totalBookings = committed.length;
            const seatedCount = committed.filter(b => b.status === 'SEATED').length;
            const cancelledCount = committed.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW').length;
            const totalPax = committed.reduce((sum, b) => sum + (b.pax || 0), 0);

            let firstReservation: Date | null = null;
            let lastReservation: Date | null = null;
            if (matching.length > 0) {
                const ts = matching.map(b => b.date.getTime());
                firstReservation = new Date(Math.min(...ts));
                lastReservation = new Date(Math.max(...ts));
            }

            return {
                ...profile,
                // Sobrescribir los campos "globales" con la vista per-scope:
                visitCount: seatedCount,
                lastInteraction: lastReservation ?? profile.lastInteraction,
                // Bloque explícito con stats per-scope para que la UI pueda mostrarlas sin ambigüedad:
                scopedStats: {
                    totalBookings,
                    seatedCount,
                    cancelledCount,
                    cancelledOrNoShowRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0,
                    lastReservation,
                    firstReservation,
                    totalPax
                }
            };
        });
    }
}
