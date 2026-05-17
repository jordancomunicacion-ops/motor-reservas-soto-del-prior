/**
 * Tipos compartidos para respuestas del API que consumen las páginas
 * de /admin/restaurant y /admin/occupancy. Mínimos: solo los campos que
 * realmente se leen en el frontend. El servicio devuelve más.
 */

/** Reserva mínima vista desde el plano (más campos que en RestaurantBooking). */
export interface BookingOnTable {
    id: string;
    status: string;
    date: string | Date;
    guestName: string;
    visitCount?: number;
    notes?: string | null;
    tags?: string | null;
}

export interface TableSummary {
    id: string;
    name?: string;
    capacity?: number;
    resBookings?: BookingOnTable[];
}

/** Mesa con datos visuales para renderizar en el plano. */
export interface TableNodeData extends TableSummary {
    isActive?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    shape?: 'ROUND' | 'RECTANGLE' | string;
    minPax?: number;
    maxPax?: number;
    seatsLostPerJoin?: number;
    metadata?: { contiguousTableIds?: string[] } | null;
    /** legado: algunos shapes lo traen fuera de metadata */
    contiguousTableIds?: string[];
    zoneId?: string;
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
