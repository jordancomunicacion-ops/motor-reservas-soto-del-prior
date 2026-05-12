const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Limpieza de Restaurantes Duplicados ---');
    
    const restaurants = await prisma.restaurant.findMany({
        include: {
            _count: {
                select: {
                    zones: true,
                    bookings: true,
                    shifts: true
                }
            }
        }
    });

    console.log(`Encontrados ${restaurants.length} restaurantes.`);

    const byName = {};
    restaurants.forEach(r => {
        if (!byName[r.name]) byName[r.name] = [];
        byName[r.name].push(r);
    });

    for (const name in byName) {
        const group = byName[name];
        if (group.length > 1) {
            console.log(`\nDuplicados detectados para: "${name}" (${group.length} copias)`);
            
            // Sort by "importance": has bookings > has zones > has shifts > is linked to hotel
            // We want to keep the "most used" one.
            group.sort((a, b) => {
                const aScore = a._count.bookings * 100 + a._count.zones * 10 + a._count.shifts;
                const bScore = b._count.bookings * 100 + b._count.zones * 10 + b._count.shifts;
                return bScore - aScore;
            });

            const toKeep = group[0];
            const toDelete = group.slice(1);

            console.log(`Manteniendo: ${toKeep.id} (Reservas: ${toKeep._count.bookings}, Zonas: ${toKeep._count.zones})`);
            
            for (const d of toDelete) {
                console.log(`Eliminando: ${d.id} (Reservas: ${d._count.bookings}, Zonas: ${d._count.zones})`);
                
                // Unlink from hotel if necessary
                await prisma.hotel.updateMany({
                    where: { restaurantId: d.id },
                    data: { restaurantId: toKeep.id }
                });

                // Delete it (using transaction if possible, but here we just call delete)
                // Note: we might need to delete dependencies first if FKs are not cascade
                try {
                    await prisma.restaurant.delete({ where: { id: d.id } });
                    console.log(`✅ Eliminado ${d.id}`);
                } catch (e) {
                    console.error(`❌ Error eliminando ${d.id}: ${e.message}`);
                }
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
