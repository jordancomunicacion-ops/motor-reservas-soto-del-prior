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

            // (Re)generar el accessToken del motor cuando haga falta (best-effort, no rompe la
            // sesión si falla). Dos casos:
            //   1. missingToken: la sesión no tiene accessToken (sesión creada antes de añadir el
            //      token motor, o por cualquier otro motivo). Sin esto, esa sesión da 401 en
            //      /api/proxy/* indefinidamente y el panel sale vacío (sin hoteles ni restaurantes)
            //      hasta que el usuario cierra sesión y vuelve a entrar.
            //   2. nearExpiry: el token existe pero está cerca de caducar.
            // Import dinámico: el callback jwt() corre en Node runtime (no edge), pero la `authConfig`
            // se importa también desde el middleware edge — el dynamic import evita bundlear jsonwebtoken allí.
            const now = Math.floor(Date.now() / 1000);
            const missingToken = !token.accessToken;
            const nearExpiry = !!token.accessTokenExpiresAt && token.accessTokenExpiresAt - now < REFRESH_WINDOW_SECONDS;
            // `bootstrap-admin` no es un usuario real en BD: el motor rechazaría su JWT igualmente,
            // así que no tiene sentido mintearlo.
            if (token.sub && token.sub !== 'bootstrap-admin' && (missingToken || nearExpiry)) {
                try {
                    const { signMotorToken } = await import('@/lib/motor-token');
                    const refreshed = signMotorToken(token.sub);
                    token.accessToken = refreshed.token;
                    token.accessTokenExpiresAt = refreshed.expiresAt;
                } catch (err) {
                    console.warn('[AUTH] Could not (re)mint motor JWT:', err instanceof Error ? err.message : err);
                }
            }
            return token;
        },
    },
    providers: [],
} satisfies NextAuthConfig;
