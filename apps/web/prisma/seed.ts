import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error(
            'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD env vars are required to run the seed.',
        );
    }
    if (password.length < 8) {
        throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters long.');
    }

    // Only create user if it doesn't exist — never reset password of existing admin
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                name: process.env.SEED_ADMIN_NAME?.trim() || 'Admin',
                password: passwordHash,
                role: 'ADMIN',
            },
        });
        console.log(`Admin user CREATED: ${user.email}`);
    } else {
        console.log(`Admin user ${email} already exists. Skipping (password preserved).`);
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
