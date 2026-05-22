/**
 * Cliente HTTP público — llamadas directas al motor-reservas SIN autenticación.
 *
 * Usar desde:
 *   - apps/web/app/widget/**     (widgets embebidos)
 *   - apps/web/app/install/**    (installer público)
 *   - Otras páginas públicas sin sesión
 *
 * Para el panel admin usar `fetchAPIAdmin` en `lib/api-admin.ts`.
 */

let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Production environment detection and URL fixing
if (typeof window !== 'undefined') {
    const host = window.location.host;
    if (host === 'reservas.sotodelprior.com') {
        API_URL = 'https://api.reservas.sotodelprior.com';
    } else if (window.location.protocol === 'https:' && API_URL.startsWith('http:')) {
        API_URL = API_URL.replace('http:', 'https:');
    }
}

const isDev = process.env.NODE_ENV !== 'production';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_URL}/${endpoint.replace(/^\//, '')}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        if (isDev) console.warn(`[api] ${options.method || 'GET'} ${endpoint} → ${res.status}`);
        throw new Error(`Server returned ${res.status}`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return res.json() as Promise<T>;
    }

    return { success: true } as T;
}
