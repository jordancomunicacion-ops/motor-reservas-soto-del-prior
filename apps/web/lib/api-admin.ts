/**
 * Cliente HTTP para el panel admin. Va siempre a /api/proxy (Next.js route handler)
 * que adjunta el Bearer del JWT motor-compatible desde la sesión server-side.
 *
 * Usar este cliente desde:
 *   - apps/web/app/admin/**
 *   - apps/web/components/admin/**
 *
 * Para llamadas públicas (widget, install) usar `fetchAPI` de `lib/api.ts`.
 */

const isDev = process.env.NODE_ENV !== 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAPIAdmin<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const path = endpoint.replace(/^\//, '');
    const url = `/api/proxy/${path}`;

    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        if (isDev) console.warn(`[api-admin] ${options.method || 'GET'} /${path} → ${res.status}`);
        throw new Error(`Server returned ${res.status}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return res.json() as Promise<T>;
    }

    return { success: true } as T;
}
