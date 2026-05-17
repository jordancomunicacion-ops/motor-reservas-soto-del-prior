/**
 * Forma del documento de WidgetConfig devuelto por GET /config/:id.
 * Misma estructura para hoteles y restaurantes — el backend devuelve un
 * shape común.
 */
export interface WidgetConfigResponse {
    primaryColor?: string | null;
    customCss?: string | null;
    showLogo?: boolean;
    stripeEnabled?: boolean;
    noShowFeeAmount?: number;
    noShowFeeAll?: boolean;
    noShowFeeGroups?: boolean;
    noShowGroupMinPax?: number;
    noShowFeeEvents?: boolean;
    showCrmFields?: boolean;
    skipGuaranteeStep?: boolean;
}
