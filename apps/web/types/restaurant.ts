/**
 * Tipos compartidos para respuestas del API que consumen las páginas
 * de /admin/restaurant y /admin/occupancy. Mínimos: solo los campos que
 * realmente se leen en el frontend. El servicio devuelve más.
 */

export interface ZoneWithTables {
    id: string;
    name?: string;
    tables: Array<{
        id: string;
        name?: string;
        resBookings?: Array<{ id: string; status?: string }>;
        [key: string]: unknown;
    }>;
}

export interface TableWithZone {
    id: string;
    zoneId: string;
    name?: string;
    resBookings?: Array<{ id: string; status?: string }>;
    [key: string]: unknown;
}

export interface RestaurantBooking {
    id: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    pax?: number;
    date?: string;
    status?: string;
    tableId?: string | null;
    [key: string]: unknown;
}

export interface WaitlistEntry {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    pax?: number;
    date?: string;
    status?: string;
    [key: string]: unknown;
}
