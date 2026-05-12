const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const ids = ['b5d83aa8-8f8d-4f0e-b7d8-8c563e466e3b', 'b5d03aa8-8f8d-4f0e-b7d8-8c563e466e3b']; // Assuming they might have the same suffix if it was a typo
    // Actually, b5d03aa8 might be a different UUID entirely.
    
    // Let's just find all restaurants
    const restaurants = await prisma.restaurant.findMany({
        include: {
            _count: {
                select: { reservations: true, tables: true, zones: true }
            }
        }
    });

    console.log(JSON.stringify(restaurants, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
