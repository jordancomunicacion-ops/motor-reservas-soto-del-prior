const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    try {
        const res = await fetch(`${API_URL}/${endpoint.replace(/^\//, '')}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!res.ok) {
            console.warn(`API Error ${endpoint}: Server might be offline. Returning backup data.`);
            throw new Error(`Server returned ${res.status}`);
        }

        return res.json();
    } catch (err) {
        console.warn(`Network Error ${endpoint}: Server offline. Using mock data.`, err);
        return getMockData(endpoint);
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

    // Restaurant Utilities Recovery
    if (endpoint.includes('restaurant')) {
        if (endpoint.includes('tables') || endpoint.includes('zones')) {
            return [
                { id: 'z1', name: 'Terraza Principal', tables: [{ id: 't1', name: 'Mesa 1', capacity: 4 }] },
                { id: 'z2', name: 'Salón Interior', tables: [] }
            ];
        }
    }

    return [];
}
