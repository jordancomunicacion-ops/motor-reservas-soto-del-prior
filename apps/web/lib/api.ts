const API_URL = 'http://localhost:3000';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}/${endpoint.replace(/^\//, '')}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'An error occurred');
    }

    return res.json();
}
