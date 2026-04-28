'use server';

import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
        // 1. Check Hardcoded Bypass
        const isAdmin = email?.toLowerCase().trim() === 'gerencia@sotodelprior.com' && password === '123456';
        let authorized = isAdmin;

        // 2. Check Database
        if (!authorized) {
            const user = await prisma.user.findFirst({
                where: {
                    email: { equals: email, mode: 'insensitive' }
                }
            });
            if (user && user.password) {
                const passwordsMatch = await bcrypt.compare(password, user.password);
                if (passwordsMatch) {
                    authorized = true;
                }
            }
        }

        if (authorized) {
            const cookieStore = await cookies();
            const oneDay = 24 * 60 * 60 * 1000;
            
            cookieStore.set('session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: oneDay
            });

            cookieStore.set('session_email', email, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: oneDay
            });

            return undefined; // Success (redirect handled by middleware or client)
        }

        return 'Credenciales inválidas.';
    } catch (error) {
        console.error('Auth Error:', error);
        return 'Algo salió mal.';
    }
}

export async function signOutAction() {
    await signOut();
}
