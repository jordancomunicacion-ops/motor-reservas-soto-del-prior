import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STRIP_REQUEST_HEADERS = new Set([
    'host',
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'authorization',
    'cookie',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-for',
]);

const STRIP_RESPONSE_HEADERS = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'content-encoding',
]);

function buildRequestHeaders(req: NextRequest, accessToken: string): Headers {
    const out = new Headers();
    for (const [key, value] of req.headers) {
        if (STRIP_REQUEST_HEADERS.has(key.toLowerCase())) continue;
        out.set(key, value);
    }
    out.set('Authorization', `Bearer ${accessToken}`);
    return out;
}

function buildResponseHeaders(res: Response): Headers {
    const out = new Headers();
    for (const [key, value] of res.headers) {
        if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
        out.set(key, value);
    }
    return out;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
    const session = await auth();
    const accessToken = (session as unknown as { accessToken?: string } | null)?.accessToken;

    if (!session?.user || !accessToken) {
        return new Response(JSON.stringify({ error: 'Unauthorized', reason: !session?.user ? 'no-session' : 'no-token' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { path } = await ctx.params;
    const target = `${API_URL}/${(path ?? []).join('/')}${req.nextUrl.search}`;
    const method = req.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let response: Response;
    try {
        const init: RequestInit & { duplex?: 'half' } = {
            method,
            headers: buildRequestHeaders(req, accessToken),
            redirect: 'manual',
            signal: req.signal,
        };
        if (hasBody) {
            init.body = req.body;
            init.duplex = 'half';
        }
        response = await fetch(target, init);
    } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
            console.error(`[proxy] fetch failed ${method} ${target}:`, err);
        }
        return new Response(JSON.stringify({ error: 'Bad Gateway', detail: err instanceof Error ? err.message : String(err) }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: buildResponseHeaders(response),
    });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx); }
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx); }
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx); }
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx); }
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx); }
export async function OPTIONS(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) { return proxy(req, ctx); }
