import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const restaurants = await prisma.restaurant.findMany({
        include: {
            _count: {
                select: {
                    bookings: true,
                    shifts: true,
                    closures: true,
                    users: true,
                }
            },
            hotel: {
                select: {
                    id: true,
                    name: true
                }
            },
            widgetConfig: {
                select: {
                    id: true
                }
            }
        }
    });

    console.log('--- LISTADO DE RESTAURANTES Y USO ---');
    const report = restaurants.map(r => ({
        id: r.id,
        nombre: r.name,
        vinculado_a_hotel: r.hotel ? r.hotel.name : 'NO',
        reservas_count: r._count.bookings,
        turnos_count: r._count.shifts,
        cierres_count: r._count.closures,
        usuarios_count: r._count.users,
        tiene_widget_custom: r.widgetConfig ? 'SÍ' : 'NO'
    }));

    console.table(report);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
