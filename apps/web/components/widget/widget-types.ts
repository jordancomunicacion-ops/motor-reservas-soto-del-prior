export type Step = {
    id: number;
    label: string;
};

export type WidgetColors = {
    accent: string;
    bg: string;
    text: string;
    white: string;
};

export type Closure = {
    date: string;
    endDate?: string | null;
};

export type Opening = {
    date: string;
    endDate?: string | null;
    shiftIds: string;
};

export type Shift = {
    daysOfWeek: string;
};

export type WidgetConfig = {
    primaryColor?: string | null;
    customCss?: string | null;
    stripeEnabled?: boolean;
    skipGuaranteeStep?: boolean;
    noShowFeeAll?: boolean;
    noShowFeeGroups?: boolean;
    noShowFeeEvents?: boolean;
    noShowGroupMinPax?: number;
    noShowFeeAmount?: number;
    showCrmFields?: boolean;
};

export type RestaurantEvent = {
    id: string;
    name: string;
    date: string;
    duration?: number;
    description: string | null;
    price: number;
    capacity: number;
    _count: { bookings: number };
};

export type DayStatus = 'closed' | 'event' | 'available';

export const BASE_STEPS: Step[] = [
    { id: 1, label: 'Encontrar' },
    { id: 2, label: 'Información' },
    { id: 3, label: 'Garantía' },
    { id: 4, label: 'Confirmación' },
];

export interface RestaurantResponse {
    id: string;
    name: string;
    widgetConfig?: WidgetConfig | null;
    integrations?: {
        stripe?: { enabled?: boolean; publicKey?: string };
    } | null;
    shifts?: Shift[];
}

export interface ShiftSlots {
    id?: string;
    name: string;
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | string;
    startTime: string;
    endTime: string;
    slots: string[];
}

export interface SlotsResponse {
    slots: string[];
    /** Slots agrupados por turno; cada turno con su nombre real (ej. "Almuerzo" custom de una apertura). */
    shiftSlots?: ShiftSlots[];
    closed?: boolean;
    message?: string;
    /** Lista de eventos del día (puede haber más de uno). */
    events?: RestaurantEvent[];
    /** @deprecated Se mantiene por compatibilidad: usar `events` en su lugar. */
    event?: RestaurantEvent | null;
}

export interface CreatedBooking {
    id?: string;
    isWaitlist?: boolean;
}
