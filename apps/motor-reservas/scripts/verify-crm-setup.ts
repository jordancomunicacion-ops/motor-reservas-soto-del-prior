import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCrmSetup() {
    try {
        console.log('🔍 VERIFICACIÓN DE CONFIGURACIÓN CRM\n');
        console.log('=' .repeat(60));

        // Get all restaurants
        const restaurants = await prisma.restaurant.findMany({
            select: { id: true, name: true, integrations: true }
        });

        console.log('\n📍 RESTAURANTES Y CONFIGURACIÓN CRM:\n');
        for (const restaurant of restaurants) {
            const integrations = (restaurant.integrations as any) || {};
            const crm = integrations.crm;

            console.log(`\n${restaurant.name} (ID: ${restaurant.id})`);
            console.log('-'.repeat(40));

            if (crm && crm.enabled) {
                console.log('✅ CRM HABILITADO');
                console.log(`   URL: ${crm.url}`);
                console.log(`   Token: ${crm.token ? '***' + crm.token.slice(-4) : '(sin token)'}`);
                console.log(`   Estado: ${crm.enabled ? 'Activo' : 'Inactivo'}`);

                // Test connection
                console.log('\n   🧪 Probando conexión...');
                try {
                    const response = await fetch(crm.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(crm.token ? { 'Authorization': `Bearer ${crm.token}` } : {})
                        },
                        body: JSON.stringify({
                            source: 'TEST',
                            event: 'CONNECTION_TEST',
                            timestamp: new Date().toISOString()
                        }),
                        signal: AbortSignal.timeout(5000)
                    });

                    if (response.ok) {
                        console.log(`   ✓ Conexión exitosa (Status: ${response.status})`);
                    } else {
                        console.log(`   ✗ Respuesta no OK (Status: ${response.status})`);
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.log(`   ✗ Error de conexión: ${errorMsg}`);
                }
            } else {
                console.log('❌ CRM NO CONFIGURADO');
            }
        }

        // Check recent bookings for Soroeta
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 ÚLTIMAS RESERVAS EN SOROETA:\n');

        const soroeta = restaurants.find(r => r.name?.toLowerCase().includes('soroeta'));
        if (soroeta) {
            const recentBookings = await prisma.resBooking.findMany({
                where: { restaurantId: soroeta.id },
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: {
                    id: true,
                    guestName: true,
                    guestEmail: true,
                    guestPhone: true,
                    date: true,
                    status: true,
                    createdAt: true
                }
            });

            if (recentBookings.length === 0) {
                console.log('⚠️  No hay reservas recientes en Soroeta');
            } else {
                recentBookings.forEach((booking, i) => {
                    console.log(`${i + 1}. ${booking.guestName}`);
                    console.log(`   Email: ${booking.guestEmail || '(sin email)'}`);
                    console.log(`   Teléfono: ${booking.guestPhone || '(sin teléfono)'}`);
                    console.log(`   Fecha: ${booking.date?.toLocaleDateString('es-ES')}`);
                    console.log(`   Estado: ${booking.status}`);
                    console.log(`   Creada: ${booking.createdAt.toLocaleString('es-ES')}`);
                    console.log();
                });
            }
        }

        console.log('=' .repeat(60));
        console.log('\n✅ VERIFICACIÓN COMPLETADA');
        console.log('\nRecomendaciones:');
        console.log('1. Si el CRM está habilitado, las nuevas reservas deberían sincronizarse automáticamente');
        console.log('2. Consulta los logs del API para más detalles: [CRM-DEBUG]');
        console.log('3. Verifica que las reservas aparezcan en tu CRM');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verifyCrmSetup();
