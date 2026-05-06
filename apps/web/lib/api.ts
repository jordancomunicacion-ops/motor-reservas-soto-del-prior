let API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Enforce HTTPS if we are in a secure context and the API URL is HTTP but targetting the same domain
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http:')) {
    API_URL = API_URL.replace('http:', 'https:');
}

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const method = options.method || 'GET';
    try {
        const res = await fetch(`${API_URL}/${endpoint.replace(/^\//, '')}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!res.ok) {
            console.warn(`API Error ${endpoint}: Server returned ${res.status}`);
            throw new Error(`Server returned ${res.status}`);
        }

        // Check if there's content to parse
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return res.json();
        }

        // Handle empty or non-JSON responses
        return { success: true };
    } catch (err) {
        // Only use mock data for GET requests. Mutations should fail explicitly.
        if (method === 'GET') {
            console.warn(`Network/API Error ${endpoint}: Returning mock data.`, err);
            return getMockData(endpoint);
        }
        throw err;
    }
}

// Simple mock data router for standalone mode
function getMockData(endpoint: string) {
    if (endpoint.includes('hotels')) return [{ id: '1', name: 'Soto del Prior', description: 'Hotel Rural' }];
    if (endpoint.includes('room-types')) return [
        { id: 'rt1', name: 'Doble Deluxe', price: 120, capacity: 2 },
        { id: 'rt2', name: 'Suite Familiar', price: 200, capacity: 4 }
    ];
    if (endpoint.includes('bookings')) return [];
    if (endpoint.includes('channels')) return [];
    if (endpoint.includes('event')) {
        const events = [
            { id: 'ev1', name: 'Cata de Vinos Ribera', date: new Date().toISOString(), capacity: 20, price: 35, _count: { bookings: 2 }, isActive: true, bookings: [] },
            { id: 'ev2', name: 'Cena de Gala Verano', date: new Date(Date.now() + 86400000 * 7).toISOString(), capacity: 100, price: 85, _count: { bookings: 45 }, isActive: true, bookings: [] }
        ];
        // If it's a detail request (e.g. /event/ev1), return just the object
        const parts = endpoint.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart !== 'event' && lastPart !== '') {
            return events.find(e => e.id === lastPart) || events[0];
        }
        return events;
    }

    // Restaurant Utilities Recovery
    if (endpoint.includes('restaurant')) {
        if (endpoint.includes('tables') || endpoint.includes('zones')) {
            return [
                { id: 'z1', name: 'Terraza Principal', tables: [{ id: 't1', name: 'Mesa 1', capacity: 4 }] },
                { id: 'z2', name: 'Salón Interior', tables: [] }
            ];
        }
        return [
            { id: 'res1', name: 'MONTAGU', currency: 'EUR' },
            { id: 'res2', name: 'SOROETA', currency: 'EUR' },
            { id: 'res3', name: 'SOTO del PRIOR', currency: 'EUR' }
        ];
    }

    return [];
}
