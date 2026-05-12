const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
    try {
        console.log('--- SYNC LOGS (MOTOR-RESERVAS) ---');
        const logs = await prisma.syncLog.findMany({
            orderBy: { timestamp: 'desc' },
            take: 20
        });

        console.log(JSON.stringify(logs, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
