import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupSoroetaCrm() {
    try {
        console.log('📋 Buscando restaurantes...\n');

        const allRestaurants = await prisma.restaurant.findMany({
            select: { id: true, name: true, integrations: true }
        });

        console.log('Restaurantes disponibles:');
        allRestaurants.forEach(r => {
            const integrations = (r.integrations as any) || {};
            const hasCrm = integrations.crm ? '✓ CRM' : '✗ Sin CRM';
            console.log(`  - ${r.id}: ${r.name} [${hasCrm}]`);
        });

        console.log('\n📋 Buscando Soto del Prior...');
        const sotoPrior = allRestaurants.find(r =>
            r.name?.toLowerCase().includes('soto') && r.name?.toLowerCase().includes('prior')
        );

        if (!sotoPrior) {
            console.error('❌ No se encontró ningún restaurante con "Soto del Prior" en su nombre');
            process.exit(1);
        }

        console.log(`✓ Encontrado: ${sotoPrior.name} (ID: ${sotoPrior.id})`);

        const sotoPriorIntegrations = (sotoPrior.integrations as any) || {};
        const crmConfig = sotoPriorIntegrations.crm;

        if (!crmConfig) {
            console.error('❌ Soto del Prior no tiene CRM configurado');
            process.exit(1);
        }

        console.log('\n✅ Configuración de Soto del Prior:');
        console.log(`   URL: ${crmConfig.url}`);
        console.log(`   Token: ${crmConfig.token ? '***' + crmConfig.token.slice(-4) : '(vacío)'}`);
        console.log(`   Habilitado: ${crmConfig.enabled}`);

        console.log('\n📋 Buscando Soroeta...');
        const soroeta = allRestaurants.find(r =>
            r.name?.toLowerCase().includes('soroeta') || r.name?.toLowerCase().includes('montagu')
        );

        if (!soroeta) {
            console.error('❌ No se encontró Soroeta o Montagu en los restaurantes');
            process.exit(1);
        }

        console.log(`✓ Encontrado: ${soroeta.name} (ID: ${soroeta.id})`);

        const soroetaIntegrations = (soroeta.integrations as any) || {};
        const currentCrm = soroetaIntegrations.crm;

        console.log('\n📊 Estado actual de Soroeta:');
        if (currentCrm) {
            console.log('⚠️  Ya tiene CRM configurado:');
            console.log(`   URL: ${currentCrm.url}`);
            console.log(`   Habilitado: ${currentCrm.enabled}`);
        } else {
            console.log('⚠️  Sin CRM configurado');
        }

        console.log('\n🔧 Aplicando configuración de Soto del Prior a Soroeta...');

        const updatedSoroeta = await prisma.restaurant.update({
            where: { id: soroeta.id },
            data: {
                integrations: {
                    ...soroetaIntegrations,
                    crm: {
                        ...crmConfig,
                        enabled: true
                    }
                }
            }
        });

        const updatedIntegrations = (updatedSoroeta.integrations as any) || {};
        const updatedCrm = updatedIntegrations.crm;

        console.log('✅ Configuración aplicada exitosamente:');
        console.log(`   URL: ${updatedCrm.url}`);
        console.log(`   Token: ${updatedCrm.token ? '***' + updatedCrm.token.slice(-4) : '(vacío)'}`);
        console.log(`   Habilitado: ${updatedCrm.enabled}`);

        console.log('\n✨ Soroeta ahora está configurado para sincronizar con el CRM');
        console.log('📝 Las nuevas reservas en Soroeta deberían aparecer en el CRM');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

setupSoroetaCrm();
