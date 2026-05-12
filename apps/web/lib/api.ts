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
        // Only use mock data for GET requests in development. 
        // Mutations and production environment should fail explicitly.
        const isProduction = typeof window !== 'undefined' && window.location.host === 'reservas.sotodelprior.com';
        
        if (method === 'GET' && !isProduction) {
            console.warn(`Network/API Error ${endpoint}: Returning mock data.`, err);
            return getMockData(endpoint);
        }
        
        console.error(`API Failure on ${endpoint}:`, err);
        throw err;
    }
}

// Simple mock data router for standalone mode
function getMockData(endpoint: string) {
    if (endpoint.includes('global/contexts')) {
        return {
            hotels: [
                { id: 'hotel-soto', name: 'SOTO del PRIOR', restaurantId: '47dc0a72-3379-46ab-bd5b-01a20c7ae58f' }
            ],
            restaurants: [
                { id: '47dc0a72-3379-46ab-bd5b-01a20c7ae58f', name: 'SOTO del PRIOR' },
                { id: 'edee3086-71d8-43d4-938d-f6baf643ace4', name: 'MONTAGU' },
                { id: '01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2', name: 'SOROETA' }
            ]
        };
    }

    if (endpoint.includes('property/hotels')) {
        return [
            { id: 'hotel-soto', name: 'SOTO del PRIOR', currency: 'EUR', timezone: 'Europe/Madrid' }
        ];
    }

    if (endpoint.includes('restaurant')) {
        if (endpoint.includes('tables') || endpoint.includes('zones') || endpoint.includes('waitlist') || endpoint.includes('bookings')) {
            return [];
        }
        
        // Only return restaurant list for the base endpoint
        if (endpoint.endsWith('restaurant') || endpoint.includes('/restaurant?')) {
            return [
                { id: '47dc0a72-3379-46ab-bd5b-01a20c7ae58f', name: 'SOTO del PRIOR' },
                { id: 'edee3086-71d8-43d4-938d-f6baf643ace4', name: 'MONTAGU' },
                { id: '01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2', name: 'SOROETA' }
            ];
        }
        
        return [];
    }

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
        const parts = endpoint.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart !== 'event' && lastPart !== '') {
            return events.find(e => e.id === lastPart) || events[0];
        }
        return events;
    }

    return [];
}
