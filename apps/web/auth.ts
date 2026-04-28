import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    trustHost: true,
    debug: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({
                        email: z.string().transform(v => v.trim().toLowerCase()),
                        password: z.string().min(4)
                    })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    console.log(`[AUTH DEBUG] Attempting login for: "${email}" with password length: ${password?.length}`);

                    try {
                        // Hardcoded super-admin fallback
                        if (email === 'gerencia@sotodelprior.com' && password === '123456') {
                            return {
                                id: 'admin-id',
                                name: 'Gerencia',
                                email: 'gerencia@sotodelprior.com',
                                role: 'ADMIN',
                            } as any;
                        }

                        const user = await prisma.user.findUnique({ where: { email } });
                        if (!user) return null;

                        const passwordsMatch = await bcrypt.compare(password, user.password);

                        if (passwordsMatch) {
                            return {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role,
                            } as any;
                        }
                    } catch (dbError) {
                        return null;
                    }
                }
                return null;
            },
        }),
    ],
});
