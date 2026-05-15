import { format, isBefore, startOfDay } from 'date-fns';
import type { Closure, DayStatus, Shift } from './widget-types';

export function computeDayStatus(
    date: Date,
    closures: Closure[],
    shifts: Shift[],
    eventDates: string[],
): DayStatus {
    if (isBefore(date, startOfDay(new Date()))) return 'closed';

    const dateStr = format(date, 'yyyy-MM-dd');

    const isClosed = closures.some(c => {
        const startStr = format(new Date(c.date), 'yyyy-MM-dd');
        const endStr = c.endDate ? format(new Date(c.endDate), 'yyyy-MM-dd') : startStr;
        return dateStr >= startStr && dateStr <= endStr;
    });
    if (isClosed) return 'closed';

    const dayOfWeek = date.getDay();
    const hasShift = shifts.some(s => {
        const days = s.daysOfWeek.split(',').map(d => d.trim());
        return days.includes(dayOfWeek.toString());
    });
    if (!hasShift) return 'closed';

    if (eventDates.includes(dateStr)) return 'event';

    return 'available';
}

export function shouldRequireStripe(
    widgetConfig: { stripeEnabled?: boolean; noShowFeeAll?: boolean; noShowFeeGroups?: boolean; noShowFeeEvents?: boolean; noShowGroupMinPax?: number } | null | undefined,
    pax: number,
    hasEvent: boolean,
): boolean {
    if (!widgetConfig?.stripeEnabled) return false;
    if (widgetConfig.noShowFeeAll) return true;
    if (widgetConfig.noShowFeeGroups && pax >= (widgetConfig.noShowGroupMinPax ?? 0)) return true;
    if (widgetConfig.noShowFeeEvents && hasEvent) return true;
    return false;
}
