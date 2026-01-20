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
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
