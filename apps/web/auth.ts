import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

const BOOTSTRAP_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || 'gerencia@sotodelprior.com';
const BOOTSTRAP_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD || '123456';

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    trustHost: true,
    debug: false,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({
                        email: z.string().transform(v => v.trim().toLowerCase()),
                        password: z.string().min(4)
                    })
                    .safeParse(credentials);

                if (!parsedCredentials.success) return null;
                const { email, password } = parsedCredentials.data;

                try {
                    const user = await prisma.user.findUnique({ where: { email } });
                    if (user) {
                        const passwordsMatch = await bcrypt.compare(password, user.password);
                        if (!passwordsMatch) return null;
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        } as any;
                    }

                    // Bootstrap super-admin: only valid while there are zero users in DB.
                    // As soon as the installer creates the first admin, this path becomes unreachable.
                    const userCount = await prisma.user.count();
                    if (userCount === 0 && email === BOOTSTRAP_EMAIL && password === BOOTSTRAP_PASSWORD) {
                        console.warn('[AUTH] Using bootstrap admin login. Finish the installer to create a real admin.');
                        return {
                            id: 'bootstrap-admin',
                            name: 'Bootstrap Admin',
                            email: BOOTSTRAP_EMAIL,
                            role: 'ADMIN',
                        } as any;
                    }

                    return null;
                } catch (err) {
                    console.error('[AUTH] authorize() error:', err instanceof Error ? err.message : err);
                    return null;
                }
            },
        }),
    ],
});
