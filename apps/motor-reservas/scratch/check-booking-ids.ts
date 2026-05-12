import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const ids = await prisma.resBooking.findMany({
        select: { restaurantId: true },
        distinct: ['restaurantId']
    });
    console.log('Restaurant IDs in Bookings:', JSON.stringify(ids, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
