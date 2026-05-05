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
    try {
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        // Use NextAuth signIn
        await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        // Keep manual cookies for legacy middleware compatibility (optional, but safer for now)
        const cookieStore = await cookies();
        const oneDay = 24 * 60 * 60 * 1000;
        
        cookieStore.set('session', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: oneDay
        });

        return undefined;
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Credenciales inválidas.';
                default:
                    return 'Algo salió mal.';
            }
        }
        throw error;
    }
}

export async function signOutAction() {
    await signOut();
}
