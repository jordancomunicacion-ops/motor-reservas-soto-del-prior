import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class RestaurantService {
    private readonly ENGINE_URL = 'http://localhost:4001';

    constructor() { }

    private async callEngine(method: string, endpoint: string, body?: any) {
        try {
            const res = await fetch(`${this.ENGINE_URL}${endpoint}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined
            });

            if (!res.ok) {
                // Propagate error
                throw new HttpException(await res.text(), res.status);
            }

            return await res.json();
        } catch (error) {
            console.error(`Gateway Error [${method} ${endpoint}]:`, error);
            if (error instanceof HttpException) throw error;
            throw new HttpException('Error communicating with Booking Engine', HttpStatus.BAD_GATEWAY);
        }
    }

    // --- Proxy Methods ---

    async getRestaurants() {
        return this.callEngine('GET', '/restaurant');
    }

    async createRestaurant(data: any) {
        return this.callEngine('POST', '/restaurant', data);
    }

    // --- Zones ---
    async syncZones(restaurantId: string, zones: any[]) {
        return this.callEngine('POST', `/restaurant/${restaurantId}/zones/sync`, zones);
    }

    async createZone(restaurantId: string, name: string) {
        return this.callEngine('POST', '/restaurant/zones', { restaurantId, name });
    }

    // --- Tables ---
    async syncTables(zoneId: string, tables: any[]) {
        return this.callEngine('POST', `/restaurant/zones/${zoneId}/tables/sync`, tables);
    }

    async getTables(restaurantId: string) {
        return this.callEngine('GET', `/restaurant/${restaurantId}/tables`);
    }

    async createTable(zoneId: string, name: string, capacity: number) {
        return this.callEngine('POST', '/restaurant/tables', { zoneId, name, capacity });
    }

    // --- Bookings (Public & Internal) ---
    async createPublicReservation(data: any) {
        return this.callEngine('POST', '/restaurant/public/reservation', data);
    }

    async confirmReservation(id: string) {
        return this.callEngine('POST', `/restaurant/reservation/${id}/confirm`);
    }

    async cancelReservation(id: string) {
        return this.callEngine('POST', `/restaurant/reservation/${id}/cancel`);
    }

    async getBookings(restaurantId: string, date: string) {
        return this.callEngine('GET', `/restaurant/${restaurantId}/bookings?date=${date}`);
    }

    async createBooking(data: any) {
        return this.callEngine('POST', '/restaurant/bookings', data);
    }

    // --- Waitlist ---
    async getWaitlist(restaurantId: string) {
        return this.callEngine('GET', `/restaurant/${restaurantId}/waitlist`);
    }

    async addToWaitlist(restaurantId: string, data: any) {
        return this.callEngine('POST', `/restaurant/${restaurantId}/waitlist`, data);
    }
}
