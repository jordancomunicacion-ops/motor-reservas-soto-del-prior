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
};

export type DayStatus = 'closed' | 'event' | 'available';

export const BASE_STEPS: Step[] = [
    { id: 1, label: 'Encontrar' },
    { id: 2, label: 'Información' },
    { id: 3, label: 'Garantía' },
    { id: 4, label: 'Confirmación' },
];
