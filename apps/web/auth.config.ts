import type { NextAuthConfig } from 'next-auth';

const REFRESH_WINDOW_SECONDS = 60 * 60 * 24 * 7; // refresca el accessToken si quedan <7 días
const PERMS_SYNC_TTL_SECONDS = 60; // re-lee permisos/rol/scope desde la DB como mucho cada 60s

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
                token.permsSyncedAt = Math.floor(Date.now() / 1000);
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

            const now = Math.floor(Date.now() / 1000);

            // Re-sincronizar permisos/rol/scope desde la DB sin esperar a un re-login.
            // Sin esto, los cambios que hace el admin en el editor de accesos no surten
            // efecto hasta que el usuario cierra sesión y vuelve a entrar (el JWT los
            // congela en el login). Import dinámico para no bundlear Prisma en el edge;
            // si corre en un runtime sin DB, el try/catch deja el token intacto.
            const lastSync = (token.permsSyncedAt as number | undefined) ?? 0;
            if (token.sub && token.sub !== 'bootstrap-admin' && now - lastSync >= PERMS_SYNC_TTL_SECONDS) {
                try {
                    const { prisma } = await import('@/lib/prisma');
                    const fresh = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { role: true, permissions: true, restaurantId: true, hotelId: true },
                    });
                    if (fresh) {
                        token.role = fresh.role;
                        token.permissions = fresh.permissions ?? null;
                        token.restaurantId = fresh.restaurantId ?? null;
                        token.hotelId = fresh.hotelId ?? null;
                    }
                    token.permsSyncedAt = now;
                } catch (err) {
                    console.warn('[AUTH] Could not re-sync user permissions:', err instanceof Error ? err.message : err);
                }
            }

            // Refrescar accessToken si estamos cerca de expiración (best-effort, no rompe la sesión si falla).
            // Import dinámico: el callback jwt() corre en Node runtime (no edge), pero la `authConfig`
            // se importa también desde el middleware edge — el dynamic import evita bundlear jsonwebtoken allí.
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
