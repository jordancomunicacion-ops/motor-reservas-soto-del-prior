"use client"

// Types matching our Backend DTOs
export interface Reservation {
    id: string;
    customerName: string; // Simplified for MVP
    date: string;
    time: string;
    pax: number;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    venueId: string;
}

const STORAGE_KEY = 'mock_reservations';

export const MockApi = {
    getReservations: async (): Promise<Reservation[]> => {
        if (typeof window === 'undefined') return [];
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    createReservation: async (res: Omit<Reservation, 'id' | 'status'>) => {
        const reservations = await MockApi.getReservations();
        const newRes: Reservation = {
            ...res,
            id: `RES-${Date.now()}`,
            status: 'CONFIRMED',
        };

        reservations.push(newRes);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return newRes;
    },

    checkAvailability: async (date: string, pax: number): Promise<string[]> => {
        // Mock logic: randomly block some slots
        const allSlots = ["13:00", "13:30", "14:00", "14:30", "20:00", "20:30", "21:00"];
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return allSlots.filter(() => Math.random() > 0.2); // 80% chance available
    },

    login: async (username: string, pass: string) => {
        if (username === 'admin' && pass === 'password') {
            const token = 'mock-token-' + Date.now();
            localStorage.setItem('auth_token', token);
            return { success: true, token };
        }
        return { success: false, message: 'Invalid credentials' };
    },

    logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('auth_token');
    },

    isAuthenticated: () => {
        if (typeof window === 'undefined') return false;
        return !!localStorage.getItem('auth_token');
    },

    getAnalytics: async () => {
        // Mock Analytics Data
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
            occupancy: 78, // %
            revenue: {
                daily: 1250,
                weekly: 8400,
                monthly: 32000
            },
            popularSlots: [
                { time: "20:00", score: 95 },
                { time: "20:30", score: 90 },
                { time: "21:00", score: 85 },
                { time: "14:00", score: 80 },
                { time: "14:30", score: 75 }
            ]
        };
    }
};
