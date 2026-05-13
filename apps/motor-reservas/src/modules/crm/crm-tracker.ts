// CRM Tracker - Cliente para enviar eventos de tracking al backend
export class CrmTracker {
    private sessionId: string;
    private visitorId: string;
    private apiUrl: string;
    private pageStartTime: number;

    constructor(apiUrl: string = '/api') {
        this.apiUrl = apiUrl;
        this.sessionId = this.getOrCreateSessionId();
        this.visitorId = this.getOrCreateVisitorId();
        this.pageStartTime = Date.now();

        // Track page view on initialization
        this.trackPageView();

        // Track page duration before leaving
        window.addEventListener('beforeunload', () => this.trackPageExit());
    }

    // Get or create session ID (stored in session storage)
    private getOrCreateSessionId(): string {
        let sessionId = sessionStorage.getItem('crm_sessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('crm_sessionId', sessionId);
        }
        return sessionId;
    }

    // Get or create visitor ID (stored in local storage)
    private getOrCreateVisitorId(): string {
        let visitorId = localStorage.getItem('crm_visitorId');
        if (!visitorId) {
            visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('crm_visitorId', visitorId);
        }
        return visitorId;
    }

    // Track page view
    private trackPageView(): void {
        const data = {
            sessionId: this.sessionId,
            url: window.location.pathname + window.location.search,
            visitorId: this.visitorId,
            referrer: document.referrer || undefined,
            userAgent: navigator.userAgent,
            duration: 0
        };

        this.sendEvent('/crm/track', data);
    }

    // Track page exit (duration)
    private trackPageExit(): void {
        const duration = Math.round((Date.now() - this.pageStartTime) / 1000);
        const data = {
            sessionId: this.sessionId,
            url: window.location.pathname + window.location.search,
            visitorId: this.visitorId,
            referrer: document.referrer || undefined,
            userAgent: navigator.userAgent,
            duration
        };

        // Use sendBeacon for reliability on page unload
        navigator.sendBeacon(
            `${this.apiUrl}/crm/track`,
            JSON.stringify(data)
        );
    }

    // Identify user
    identify(data: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
    }): void {
        this.sendEvent('/crm/identify', data);
    }

    // Track custom event
    trackEvent(eventName: string, data: any = {}): void {
        const payload = {
            sessionId: this.sessionId,
            visitorId: this.visitorId,
            event: eventName,
            data,
            timestamp: new Date().toISOString()
        };

        this.sendEvent('/crm/event', payload);
    }

    // Send event to backend
    private sendEvent(endpoint: string, data: any): void {
        fetch(`${this.apiUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).catch((error) => {
            console.warn(`CRM tracking failed for ${endpoint}:`, error);
        });
    }

    // Get current session ID
    getSessionId(): string {
        return this.sessionId;
    }

    // Get current visitor ID
    getVisitorId(): string {
        return this.visitorId;
    }
}

// Export singleton instance
export const crmTracker = typeof window !== 'undefined' ? new CrmTracker() : null;
