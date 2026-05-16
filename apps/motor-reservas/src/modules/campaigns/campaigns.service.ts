import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CrmService } from '../crm/crm.service';
import { getUserScope } from '../../common/scope';

@Injectable()
export class CampaignsService {
    private readonly logger = new Logger(CampaignsService.name);

    constructor(
        private prisma: PrismaService,
        private crmService: CrmService
    ) { }

    async createCampaign(
        data: { name: string; type: string; subject?: string; content: string; hotelId?: string; restaurantId?: string },
        user?: any
    ) {
        const scope = await getUserScope(user, this.prisma);

        // Usuario scoped: la campaña hereda automáticamente su centro.
        // Super-admin: puede taggear manualmente vía body (hotelId/restaurantId).
        let hotelId: string | null;
        let restaurantId: string | null;
        if (scope.isGlobalAdmin) {
            hotelId = data.hotelId ?? null;
            restaurantId = data.restaurantId ?? null;
        } else {
            hotelId = scope.hotelIds?.[0] ?? null;
            restaurantId = scope.restaurantIds?.[0] ?? null;
        }

        return (this.prisma as any).campaign.create({
            data: {
                name: data.name,
                type: data.type, // EMAIL, WHATSAPP
                subject: data.subject,
                content: data.content,
                status: 'DRAFT',
                hotelId,
                restaurantId
            }
        });
    }

    async getCampaigns(user?: any) {
        const scope = await getUserScope(user, this.prisma);
        let where: any = {};

        if (!scope.isGlobalAdmin) {
            const orClauses: any[] = [];
            if (scope.hotelIds && scope.hotelIds.length > 0) {
                orClauses.push({ hotelId: { in: scope.hotelIds } });
            }
            if (scope.restaurantIds && scope.restaurantIds.length > 0) {
                orClauses.push({ restaurantId: { in: scope.restaurantIds } });
            }
            if (orClauses.length === 0) return [];
            where = { OR: orClauses };
        }

        return (this.prisma as any).campaign.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }

    async executeCampaign(id: string, user?: any) {
        const campaign = await (this.prisma as any).campaign.findUnique({ where: { id } });
        if (!campaign) throw new NotFoundException('Campaign not found');

        // Ownership: el usuario tiene que tener acceso a la campaña vía su scope.
        if (user) {
            const scope = await getUserScope(user, this.prisma);
            if (!scope.isGlobalAdmin) {
                const allowed =
                    (campaign.hotelId && scope.hotelIds?.includes(campaign.hotelId)) ||
                    (campaign.restaurantId && scope.restaurantIds?.includes(campaign.restaurantId));
                if (!allowed) throw new ForbiddenException('Sin acceso a esta campaña');
            }
        }

        if (campaign.status === 'SENT') throw new Error('Campaign already sent');

        // 1. Fetch Audience usando el SCOPE DE LA CAMPAÑA (no el del usuario).
        // Así un super-admin que dispara una campaña de Soroeta solo envía a clientes de Soroeta.
        // Si la campaña es legacy (hotelId y restaurantId nulos), getUserScope la trata como
        // global → getProfiles devolverá TODOS los perfiles (comportamiento anterior al scoping).
        const campaignScope = { hotelId: campaign.hotelId, restaurantId: campaign.restaurantId };
        const profiles = await this.crmService.getProfiles(1, 1000, campaignScope); // Limit 1000 for safety

        this.logger.log(`Executing Campaign ${campaign.name} for ${profiles.length} profiles...`);

        let sentCount = 0;

        // 2. Iterate and Send
        for (const profile of profiles) {
            // Check consent
            if (campaign.type === 'EMAIL' && !profile.consentEmail) continue;
            if (campaign.type === 'WHATSAPP' && !profile.consentWhatsApp) continue;

            try {
                await this.sendMessage(campaign.type, profile, campaign);
                sentCount++;
            } catch (e) {
                this.logger.error(`Failed to send to ${profile.email}`, e);
            }
        }

        // 3. Update Status
        return (this.prisma as any).campaign.update({
            where: { id },
            data: {
                status: 'SENT',
                sentCount,
                scheduledAt: new Date()
            }
        });
    }

    private async sendMessage(type: string, profile: any, campaign: any) {
        // MOCK SENDING
        this.logger.log(`[MOCK] Sending ${type} to ${profile.email || profile.phone}: ${campaign.subject || 'No Subject'}`);

        // In V2: Integrate SES / WhatsApp Cloud API here
        return true;
    }
}
