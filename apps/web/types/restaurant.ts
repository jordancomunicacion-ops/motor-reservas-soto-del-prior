/**
 * Tipos compartidos para respuestas del API que consumen las páginas
 * de /admin/restaurant y /admin/occupancy. Mínimos: solo los campos que
 * realmente se leen en el frontend. El servicio devuelve más.
 */

export interface TableSummary {
    id: string;
    name?: string;
    capacity?: number;
    resBookings?: Array<{ id: string; status?: string }>;
}

export interface ZoneWithTables {
    id: string;
    name?: string;
    tables: TableSummary[];
}

export interface TableWithZone extends TableSummary {
    zoneId: string;
}

export interface RestaurantBooking {
    id: string;
    guestName?: string;
    guestEmail?: string | null;
    guestPhone?: string | null;
    pax?: number;
    date?: string | Date;
    status: string;
    tableId?: string | null;
}

export interface WaitlistEntry {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    pax?: number;
    date?: string;
    status?: string;
    createdAt?: string;
}
