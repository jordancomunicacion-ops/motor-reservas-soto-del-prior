"use client";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fetchAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

type PublicReservation = {
    id: string;
    status: string;
    date: string;
    pax: number;
    notes: string | null;
    guestName: string;
    guestEmail: string | null;
    restaurantId: string;
    restaurantName: string;
    restaurantTimezone: string;
    editable: boolean;
    editCutoffMinutes: number;
};

type SlotsResponse = { slots: string[] };

const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function ModifyReservation() {
    const sp = useSearchParams();
    const id = sp.get('id') || '';
    const token = sp.get('token') || '';

    const [reservation, setReservation] = useState<PublicReservation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [pax, setPax] = useState(2);
    const [notes, setNotes] = useState('');
    const [slots, setSlots] = useState<{ lunch: string[]; dinner: string[] } | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        if (!id || !token) {
            setError('Enlace inválido. Faltan parámetros.');
            setLoading(false);
            return;
        }
        fetchAPI<PublicReservation | { error: boolean; message: string }>(
            `/restaurant/public/reservation/${id}?token=${encodeURIComponent(token)}`
        ).then(data => {
            if ('error' in data && data.error) {
                setError(data.message || 'No se pudo cargar la reserva.');
            } else {
                const r = data as PublicReservation;
                setReservation(r);
                const d = new Date(r.date);
                setSelectedDate(d);
                setSelectedTime(format(d, 'HH:mm'));
                setCurrentMonth(d);
                setPax(r.pax);
                setNotes(r.notes || '');
                if (r.status === 'CANCELLED') setCancelled(true);
            }
        }).catch(() => setError('No se pudo cargar la reserva.'))
            .finally(() => setLoading(false));
    }, [id, token]);

    useEffect(() => {
        if (!reservation || !selectedDate) return;
        let aborted = false;
        setLoadingSlots(true);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        Promise.all([
            fetchAPI<SlotsResponse>(`/restaurant/${reservation.restaurantId}/slots?date=${dateStr}&pax=${pax}&type=LUNCH`).catch(() => ({ slots: [] })),
            fetchAPI<SlotsResponse>(`/restaurant/${reservation.restaurantId}/slots?date=${dateStr}&pax=${pax}&type=DINNER`).catch(() => ({ slots: [] }))
        ]).then(([lunch, dinner]) => {
            if (aborted) return;
            setSlots({ lunch: lunch?.slots || [], dinner: dinner?.slots || [] });
        }).finally(() => { if (!aborted) setLoadingSlots(false); });
        return () => { aborted = true; };
    }, [reservation, selectedDate, pax]);

    const originalDate = useMemo(() => reservation ? new Date(reservation.date) : null, [reservation]);
    const originalTime = useMemo(() => originalDate ? format(originalDate, 'HH:mm') : '', [originalDate]);

    const slotChanged = !!(originalDate && selectedDate && (
        format(originalDate, 'yyyy-MM-dd') !== format(selectedDate, 'yyyy-MM-dd') ||
        originalTime !== selectedTime
    ));
    const paxChanged = !!(reservation && pax !== reservation.pax);
    const notesChanged = !!(reservation && (notes || '') !== (reservation.notes || ''));
    const hasChanges = slotChanged || paxChanged || notesChanged;

    const availableTimes = useMemo(() => {
        const set = new Set<string>([...(slots?.lunch || []), ...(slots?.dinner || [])]);
        if (originalTime && selectedDate && originalDate && format(originalDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) {
            set.add(originalTime);
        }
        return set;
    }, [slots, originalTime, originalDate, selectedDate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="max-w-md text-center space-y-3">
                    <AlertCircle className="size-12 mx-auto text-destructive" />
                    <h1 className="font-display text-xl font-medium tracking-tight">No se pudo cargar tu reserva</h1>
                    <p className="text-sm text-muted-foreground">{error || 'Enlace inválido o caducado.'}</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!reservation) return;
        setSaving(true);
        try {
            const body: Record<string, unknown> = {};
            if (slotChanged && selectedDate && selectedTime) {
                body.date = format(selectedDate, 'yyyy-MM-dd');
                body.time = selectedTime;
            }
            if (paxChanged) body.pax = pax;
            if (notesChanged) body.notes = notes;

            type SaveResponse = {
                error?: boolean;
                message?: string;
                date?: string;
                pax?: number;
                notes?: string | null;
            };
            const res = await fetchAPI<SaveResponse>(`/restaurant/public/reservation/${reservation.id}?token=${encodeURIComponent(token)}`, {
                method: 'PATCH',
                body: JSON.stringify(body),
            });
            if (res?.error) {
                alert(res.message || 'No se pudieron guardar los cambios.');
            } else {
                setReservation({ ...reservation, date: res.date ?? reservation.date, pax: res.pax ?? reservation.pax, notes: res.notes ?? reservation.notes });
                setSavedAt(new Date());
            }
        } catch (e) {
            alert((e instanceof Error && e.message) || 'Error al guardar los cambios.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!reservation) return;
        if (!confirm('¿Seguro que quieres cancelar tu reserva? Esta acción no se puede deshacer.')) return;
        setCancelling(true);
        try {
            type CancelResponse = { error?: boolean; message?: string };
            const res = await fetchAPI<CancelResponse>(`/restaurant/public/reservation/${reservation.id}/cancel?token=${encodeURIComponent(token)}`, {
                method: 'POST',
            });
            if (res?.error) {
                alert(res.message || 'No se pudo cancelar la reserva.');
            } else {
                setCancelled(true);
            }
        } catch (e) {
            alert((e instanceof Error && e.message) || 'Error al cancelar la reserva.');
        } finally {
            setCancelling(false);
        }
    };

    const renderCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const startDay = monthStart.getDay();
        const padding = Array((startDay === 0 ? 6 : startDay - 1)).fill(null);
        const today = startOfDay(new Date());

        return (
            <div className="max-w-[280px] mx-auto w-full">
                <div className="flex justify-between items-center mb-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Mes anterior">
                        <ChevronLeft className="size-4" />
                    </Button>
                    <h3 className="font-display text-base font-medium tracking-tight capitalize">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h3>
                    <Button variant="ghost" size="icon-sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Mes siguiente">
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2 text-center border-b border-border pb-2">
                    {WEEK_DAYS.map(d => <div key={d} className="text-eyebrow text-primary">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {padding.map((_, i) => <div key={`p${i}`} />)}
                    {days.map(d => {
                        const isPast = isBefore(d, today);
                        const isSel = selectedDate && isSameDay(d, selectedDate);
                        return (
                            <button
                                type="button"
                                key={d.toISOString()}
                                onClick={() => { if (!isPast) { setSelectedDate(d); setSelectedTime(null); } }}
                                disabled={isPast}
                                className={cn(
                                    "size-8 rounded-full flex items-center justify-center text-xs font-semibold mx-auto transition-all tabular-nums",
                                    isPast
                                        ? 'cursor-not-allowed text-muted-foreground/40'
                                        : 'cursor-pointer hover:bg-muted',
                                    isSel && 'bg-primary text-primary-foreground hover:bg-primary'
                                )}
                            >
                                {format(d, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (cancelled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <div className="max-w-md text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Check className="size-7 text-muted-foreground" />
                    </div>
                    <h1 className="font-display text-2xl font-medium tracking-tight mb-2">Reserva cancelada</h1>
                    <p className="text-sm text-muted-foreground">Hemos cancelado tu reserva en {reservation.restaurantName}. Esperamos verte pronto.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <header className="text-center mb-6">
                    <p className="text-eyebrow mb-1">{reservation.restaurantName}</p>
                    <h1 className="font-display text-3xl font-medium tracking-tight">Tu reserva</h1>
                    <p className="text-sm text-muted-foreground mt-1">Hola {reservation.guestName.split(' ')[0]}, aquí puedes modificar o cancelar tu reserva.</p>
                </header>

                <section className="bg-muted/30 p-4 border-l-4 border-primary mb-6 rounded-r-md">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" /><span>{format(new Date(reservation.date), "dd/MM/yyyy", { locale: es })}</span></div>
                        <div className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /><span>{format(new Date(reservation.date), 'HH:mm')}h</span></div>
                        <div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><span>{reservation.pax} personas</span></div>
                    </div>
                </section>

                {!reservation.editable && (
                    <div className="mb-6 p-4 bg-warning/10 border border-warning/30 text-sm text-warning-foreground flex items-start gap-2 rounded-md">
                        <AlertCircle className="size-4 mt-0.5 text-warning" />
                        <span>Tu reserva ya no se puede modificar ni cancelar online (faltan menos de {Math.round(reservation.editCutoffMinutes / 60)}h). Llámanos si necesitas cambios.</span>
                    </div>
                )}

                <fieldset disabled={!reservation.editable || saving || cancelling} className="space-y-6 disabled:opacity-60">
                    <div className="border border-border p-4 rounded-md">
                        <h2 className="text-eyebrow mb-3">Personas</h2>
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" size="icon" onClick={() => setPax(Math.max(1, pax - 1))} aria-label="Menos personas">−</Button>
                            <span className="font-display text-xl font-medium w-12 text-center tabular-nums">{pax}</span>
                            <Button type="button" variant="outline" size="icon" onClick={() => setPax(pax + 1)} aria-label="Más personas">+</Button>
                        </div>
                    </div>

                    <div className="border border-border p-4 rounded-md">
                        <h2 className="text-eyebrow mb-3">Fecha y hora</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {renderCalendar()}
                            <div>
                                {loadingSlots ? (
                                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                                        <Loader2 className="size-4 animate-spin mr-2" /> Cargando horarios…
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(['lunch', 'dinner'] as const).map(meal => {
                                            const list = slots?.[meal] || [];
                                            if (list.length === 0) return null;
                                            return (
                                                <div key={meal}>
                                                    <h4 className="text-eyebrow mb-2 border-b border-border pb-1">
                                                        {meal === 'lunch' ? 'Comida' : 'Cena'}
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {list.map(t => (
                                                            <Button
                                                                key={t}
                                                                type="button"
                                                                variant={selectedTime === t ? 'default' : 'outline'}
                                                                size="sm"
                                                                onClick={() => setSelectedTime(t)}
                                                                className="tabular-nums"
                                                            >
                                                                {t}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {availableTimes.size === 0 && (
                                            <p className="text-sm text-muted-foreground italic">No hay horarios disponibles en este día.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border border-border p-4 rounded-md">
                        <h2 className="text-eyebrow mb-3">Comentarios / Alergias</h2>
                        <Textarea
                            className="resize-none"
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ej.: alergia a frutos secos, mesa tranquila…"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={!hasChanges || saving || !reservation.editable}
                            size="lg"
                            className="flex-1"
                        >
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCancel}
                            disabled={cancelling || !reservation.editable}
                            variant="outline"
                            size="lg"
                            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            {cancelling ? 'Cancelando…' : 'Cancelar reserva'}
                        </Button>
                    </div>

                    {savedAt && (
                        <p className="text-xs text-success text-center mt-2 flex items-center justify-center gap-1">
                            <Check className="size-3" /> Cambios guardados a las {format(savedAt, 'HH:mm')}
                        </p>
                    )}
                </fieldset>
            </div>
        </div>
    );
}
