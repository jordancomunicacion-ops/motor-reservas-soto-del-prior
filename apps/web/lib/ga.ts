// Google Analytics configuration and utilities
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

export const pageview = (url: string) => {
    if (!window.gtag || !GA_ID) return;

    window.gtag('config', GA_ID, {
        page_path: url
    });
};

export const event = (action: string, params?: Record<string, any>) => {
    if (!window.gtag || !GA_ID) return;

    window.gtag('event', action, {
        ...params
    });
};

// Track custom conversions
export const trackConversion = (conversionId: string, data?: Record<string, any>) => {
    event('conversion', {
        conversion_id: conversionId,
        ...data
    });
};

// Track form submissions
export const trackFormSubmission = (formName: string, data?: Record<string, any>) => {
    event('form_submit', {
        form_name: formName,
        ...data
    });
};

// Track booking
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

// Track search/filter
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

// Track user properties
export const trackUserProperties = (properties: Record<string, any>) => {
    if (!window.gtag || !GA_ID) return;

    window.gtag('config', GA_ID, {
        user_properties: properties
    });
};

declare global {
    interface Window {
        gtag?: (
            command: string,
            targetId: string | null,
            config: Record<string, any>
        ) => void;
        dataLayer?: any[];
    }
}
