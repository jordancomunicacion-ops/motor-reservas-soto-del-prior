import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const zones = await prisma.zone.findMany({
        include: { _count: { select: { tables: true } } }
    });
    console.log('Zones in DB:', JSON.stringify(zones, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
