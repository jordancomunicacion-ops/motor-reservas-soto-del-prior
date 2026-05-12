import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

    console.log(`✅ User created/updated: ${user.email} (id: ${user.id})`);

    // Create Restaurants
    const restaurants = [
        { id: 'res-soto', name: 'SOTO del PRIOR' },
        { id: 'res1', name: 'MONTAGU' },
        { id: 'res2', name: 'SOROETA' }
    ];

    for (const res of restaurants) {
        // First check by name to avoid duplicates with different IDs
        const existingByName = await prisma.restaurant.findFirst({
            where: { name: res.name }
        });

        if (existingByName) {
            console.log(`ℹ️ Restaurant ${res.name} already exists with ID ${existingByName.id}. Updating...`);
            await prisma.restaurant.update({
                where: { id: existingByName.id },
                data: { name: res.name }
            });
        } else {
            await prisma.restaurant.upsert({
                where: { id: res.id },
                update: { name: res.name },
                create: { id: res.id, name: res.name }
            });
            console.log(`✅ Restaurant created/updated: ${res.name} (${res.id})`);
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
