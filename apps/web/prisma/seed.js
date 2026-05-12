const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'gerencia@sotodelprior.com';
    const password = '123456';
    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert to handle both creation and update
    const user = await prisma.user.upsert({
        where: { email },
        update: { password: passwordHash },
        create: {
            email,
            name: 'Gerencia',
            password: passwordHash,
            role: 'ADMIN',
        },
    });

    console.log(`✅ Reservas Admin created/updated: ${user.email}`);

    // 1. Cleanup old legacy IDs to avoid duplicates
    await prisma.restaurant.deleteMany({
        where: { id: { in: ['res1', 'res2', 'res-soto'] } }
    });

    // 2. Correct Restaurants with their real UUIDs
    const restaurants = [
        { id: 'b5d83aa8-8f8d-4f0e-b7d8-8c563e466e3b', name: 'SOTO del PRIOR' },
        { id: 'dc48599b-85d3-40e0-9732-c3c3a241c606', name: 'MONTAGU' },
        { id: '01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2', name: 'SOROETA' }
    ];

    for (const res of restaurants) {
        await prisma.restaurant.upsert({
            where: { id: res.id },
            update: { name: res.name },
            create: { id: res.id, name: res.name, currency: 'EUR' }
        });
        console.log(`✅ Restaurant synchronized: ${res.name} (${res.id})`);

        // Handle specific links (e.g., SOTO del PRIOR Synergy)
        if (res.name === 'SOTO del PRIOR') {
            const hotel = await prisma.hotel.findFirst({
                where: { name: { contains: 'SOTO', mode: 'insensitive' } }
            });
            if (hotel) {
                await prisma.hotel.update({
                    where: { id: hotel.id },
                    data: { restaurantId: res.id }
                });
                console.log(`🔗 Link established: Hotel ${hotel.name} <-> Restaurant ${res.name}`);
            }
        }
    }
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
