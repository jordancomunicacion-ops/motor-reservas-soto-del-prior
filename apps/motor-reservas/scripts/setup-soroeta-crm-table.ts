import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupSoroetaCrmTable() {
    try {
        console.log('🔍 Verificando configuraciones CRM existentes...\n');

        const allCrm = await (prisma as any).crmIntegration.findMany({
            include: {
                hotel: { select: { name: true } },
                restaurant: { select: { name: true } }
            }
        });

        console.log('Configuraciones CRM actuales:');
        for (const c of allCrm) {
            const target = c.restaurant?.name || c.hotel?.name || 'SIN TARGET';
            console.log(`  - ${target}: ${c.url} [${c.enabled ? '✓ Activo' : '✗ Inactivo'}]`);
        }

        console.log('\n📋 Buscando Soto del Prior (referencia)...');
        const sotoPrior = await prisma.restaurant.findFirst({
            where: { name: { contains: 'SOTO', mode: 'insensitive' } }
        });

        if (!sotoPrior) {
            console.error('❌ Soto del Prior no encontrado');
            process.exit(1);
        }
        console.log(`✓ ${sotoPrior.name} (ID: ${sotoPrior.id})`);

        const sotoPriorCrm = await (prisma as any).crmIntegration.findUnique({
            where: { restaurantId: sotoPrior.id }
        });

        if (!sotoPriorCrm) {
            console.error('❌ Soto del Prior no tiene CRM en la tabla CrmIntegration');
            process.exit(1);
        }

        console.log('\n✅ CRM de Soto del Prior:');
        console.log(`   URL: ${sotoPriorCrm.url}`);
        console.log(`   Token: ${sotoPriorCrm.token ? '***' + sotoPriorCrm.token.slice(-4) : '(vacío)'}`);
        console.log(`   sourceLabel: ${sotoPriorCrm.sourceLabel}`);

        console.log('\n📋 Buscando Soroeta...');
        const soroeta = await prisma.restaurant.findFirst({
            where: { name: { contains: 'SOROETA', mode: 'insensitive' } }
        });

        if (!soroeta) {
            console.error('❌ Soroeta no encontrado');
            process.exit(1);
        }
        console.log(`✓ ${soroeta.name} (ID: ${soroeta.id})`);

        const soroetaCrm = await (prisma as any).crmIntegration.findUnique({
            where: { restaurantId: soroeta.id }
        });

        if (soroetaCrm) {
            console.log('\n📊 CRM de Soroeta (actual):');
            console.log(`   URL: ${soroetaCrm.url}`);
            console.log(`   Habilitado: ${soroetaCrm.enabled}`);
            console.log(`   Token: ${soroetaCrm.token ? '***' + soroetaCrm.token.slice(-4) : '(vacío)'}`);
        } else {
            console.log('\n⚠️  Soroeta NO tiene registro en CrmIntegration');
        }

        console.log('\n🔧 Aplicando configuración a Soroeta...');

        const newCrm = await (prisma as any).crmIntegration.upsert({
            where: { restaurantId: soroeta.id },
            create: {
                restaurantId: soroeta.id,
                enabled: true,
                url: sotoPriorCrm.url,
                token: sotoPriorCrm.token,
                sourceLabel: 'Web Soroeta',
                trackingId: sotoPriorCrm.trackingId,
                campaignSource: sotoPriorCrm.campaignSource,
                campaignMedium: sotoPriorCrm.campaignMedium,
                campaignName: sotoPriorCrm.campaignName
            },
            update: {
                enabled: true,
                url: sotoPriorCrm.url,
                token: sotoPriorCrm.token,
                sourceLabel: 'Web Soroeta'
            }
        });

        console.log('\n✅ Configuración aplicada:');
        console.log(`   URL: ${newCrm.url}`);
        console.log(`   Habilitado: ${newCrm.enabled}`);
        console.log(`   sourceLabel: ${newCrm.sourceLabel}`);

        console.log('\n✨ Soroeta listo para sincronizar con CRM');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setupSoroetaCrmTable();
