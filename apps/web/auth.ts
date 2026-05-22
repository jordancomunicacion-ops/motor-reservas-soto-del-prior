import NextAuth, { type User } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signMotorToken } from '@/lib/motor-token';
import { authConfig } from './auth.config';

const BOOTSTRAP_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const BOOTSTRAP_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const BOOTSTRAP_ENABLED = Boolean(BOOTSTRAP_EMAIL && BOOTSTRAP_PASSWORD && BOOTSTRAP_PASSWORD.length >= 8);

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
                        const { token } = signMotorToken(user.id);
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            restaurantId: user.restaurantId,
                            hotelId: user.hotelId,
                            accessToken: token,
                        } satisfies User;
                    }

                    // Bootstrap super-admin: only valid while there are zero users in DB AND
                    // BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD are explicitly set in env.
                    // No motor JWT — bootstrap solo opera contra endpoints públicos (/installer/*).
                    if (BOOTSTRAP_ENABLED) {
                        const userCount = await prisma.user.count();
                        if (userCount === 0 && email === BOOTSTRAP_EMAIL && password === BOOTSTRAP_PASSWORD) {
                            console.warn('[AUTH] Using bootstrap admin login. Finish the installer to create a real admin.');
                            return {
                                id: 'bootstrap-admin',
                                name: 'Bootstrap Admin',
                                email: BOOTSTRAP_EMAIL!,
                                role: 'ADMIN',
                                restaurantId: null,
                                hotelId: null,
                            } satisfies User;
                        }
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
