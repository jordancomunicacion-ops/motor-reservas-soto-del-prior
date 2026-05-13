// Google Analytics utilities - safe for SSR
export const pageview = (url: string) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag('config', '', { page_path: url });
};

export const event = (action: string, params?: Record<string, any>) => {
    if (typeof window === 'undefined' || !window.gtag) return;
    window.gtag('event', action, { ...params });
};

export const trackConversion = (conversionId: string, data?: Record<string, any>) => {
    event('conversion', { conversion_id: conversionId, ...data });
};

export const trackFormSubmission = (formName: string, data?: Record<string, any>) => {
    event('form_submit', { form_name: formName, ...data });
};

export const trackBooking = (bookingData: {
    bookingId: string;
    value: number;
    currency: string;
    type: 'hotel' | 'restaurant' | 'event';
}) => {
    event('purchase', {
        transaction_id: bookingData.bookingId,
        value: bookingData.value,
        currency: bookingData.currency,
        booking_type: bookingData.type
    });
};

export const trackSearch = (searchParams: {
    searchTerm?: string;
    category?: string;
    filters?: Record<string, any>;
}) => {
    event('search', {
        search_term: searchParams.searchTerm,
        category: searchParams.category,
        ...searchParams.filters
    });
};

declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
        dataLayer?: any[];
    }
}
