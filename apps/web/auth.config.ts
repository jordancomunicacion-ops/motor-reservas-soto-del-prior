import type { NextAuthConfig } from 'next-auth';

const REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 7; // refresca el accessToken si quedan <7 días

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAdmin = nextUrl.pathname.startsWith('/admin');
            if (isOnAdmin) {
                // Cualquier usuario autenticado entra al panel. Lo que ve dentro lo
                // determinan restaurantId/hotelId del usuario y el scope server-side.
                return isLoggedIn;
            }
            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/admin', nextUrl));
            }
            return true;
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            if (session.user) {
                if (token.role) session.user.role = token.role as string;
                session.user.permissions = (token.permissions as string | null | undefined) ?? null;
                session.user.restaurantId = (token.restaurantId as string | null | undefined) ?? null;
                session.user.hotelId = (token.hotelId as string | null | undefined) ?? null;
            }
            // accessToken expuesto en la sesion. El proxy server-side lo lee con auth().
            // Tecnicamente llega tambien al cliente via /api/auth/session — riesgo aceptable
            // porque la cookie de sesion (HttpOnly) ya da equivalente acceso.
            if (token.accessToken) {
                (session as unknown as { accessToken?: string }).accessToken = token.accessToken as string;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.permissions = (user as { permissions?: string | null }).permissions ?? null;
                token.restaurantId = (user as { restaurantId?: string | null }).restaurantId ?? null;
                token.hotelId = (user as { hotelId?: string | null }).hotelId ?? null;
                const t = (user as { accessToken?: string }).accessToken;
                if (t) {
                    token.accessToken = t;
                    // best-effort decode de exp; si no es válido, lo dejamos sin expirarAt
                    try {
                        const payload = JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString('utf8'));
                        if (typeof payload?.exp === 'number') token.accessTokenExpiresAt = payload.exp;
                    } catch {
                        // ignore
                    }
                }
            }

            // Refrescar accessToken si estamos cerca de expiración (best-effort, no rompe la sesión si falla).
            // Import dinámico: el callback jwt() corre en Node runtime (no edge), pero la `authConfig`
            // se importa también desde el middleware edge — el dynamic import evita bundlear jsonwebtoken allí.
            const now = Math.floor(Date.now() / 1000);
            if (token.sub && token.accessTokenExpiresAt && token.accessTokenExpiresAt - now < REFRESH_WINDOW_SECONDS) {
                try {
                    const { signMotorToken } = await import('@/lib/motor-token');
                    const refreshed = signMotorToken(token.sub);
                    token.accessToken = refreshed.token;
                    token.accessTokenExpiresAt = refreshed.expiresAt;
                } catch (err) {
                    console.warn('[AUTH] Could not refresh motor JWT:', err instanceof Error ? err.message : err);
                }
            }
            return token;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
