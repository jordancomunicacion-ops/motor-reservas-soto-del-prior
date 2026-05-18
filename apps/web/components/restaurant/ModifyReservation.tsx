"use client";
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';

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

const ACCENT = '#C59D5F';
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
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error || !reservation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>No se pudo cargar tu reserva</h1>
                    <p className="text-sm text-gray-600">{error || 'Enlace inválido o caducado.'}</p>
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!reservation) return;
        setSaving(true);
        try {
            const body: any = {};
            if (slotChanged && selectedDate && selectedTime) {
                body.date = format(selectedDate, 'yyyy-MM-dd');
                body.time = selectedTime;
            }
            if (paxChanged) body.pax = pax;
            if (notesChanged) body.notes = notes;

            const res = await fetchAPI<any>(`/restaurant/public/reservation/${reservation.id}?token=${encodeURIComponent(token)}`, {
                method: 'PATCH',
                body: JSON.stringify(body)
            });
            if (res?.error) {
                alert(res.message || 'No se pudieron guardar los cambios.');
            } else {
                setReservation({ ...reservation, date: res.date, pax: res.pax, notes: res.notes });
                setSavedAt(new Date());
            }
        } catch (e: any) {
            alert(e?.message || 'Error al guardar los cambios.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        if (!reservation) return;
        if (!confirm('¿Seguro que quieres cancelar tu reserva? Esta acción no se puede deshacer.')) return;
        setCancelling(true);
        try {
            const res = await fetchAPI<any>(`/restaurant/public/reservation/${reservation.id}/cancel?token=${encodeURIComponent(token)}`, {
                method: 'POST'
            });
            if (res?.error) {
                alert(res.message || 'No se pudo cancelar la reserva.');
            } else {
                setCancelled(true);
            }
        } catch (e: any) {
            alert(e?.message || 'Error al cancelar la reserva.');
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
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full" aria-label="Mes anterior">
                        <ChevronLeft className="w-4 h-4 text-gray-400" />
                    </button>
                    <h3 className="font-bold text-base uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </h3>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full" aria-label="Mes siguiente">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2 text-center border-b pb-2">
                    {WEEK_DAYS.map(d => <div key={d} className="font-black text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {padding.map((_, i) => <div key={`p${i}`} />)}
                    {days.map(d => {
                        const isPast = isBefore(d, today);
                        const isSel = selectedDate && isSameDay(d, selectedDate);
                        return (
                            <div
                                key={d.toISOString()}
                                onClick={() => { if (!isPast) { setSelectedDate(d); setSelectedTime(null); } }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mx-auto transition-all ${isPast ? 'cursor-not-allowed text-gray-300' : 'cursor-pointer hover:bg-gray-50'}`}
                                style={isSel ? { backgroundColor: ACCENT, color: 'white' } : {}}
                            >
                                {format(d, 'd')}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (cancelled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Reserva cancelada</h1>
                    <p className="text-sm text-gray-600">Hemos cancelado tu reserva en {reservation.restaurantName}. Esperamos verte pronto.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-[#0A0A0A]" style={{ fontFamily: "'Lato', sans-serif" }}>
            <div className="max-w-3xl mx-auto px-4 py-8">
                <header className="text-center mb-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {reservation.restaurantName}
                    </p>
                    <h1 className="text-3xl font-bold uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>Tu reserva</h1>
                    <p className="text-sm text-gray-500 mt-1">Hola {reservation.guestName.split(' ')[0]}, aquí puedes modificar o cancelar tu reserva.</p>
                </header>

                <section className="bg-gray-50 p-4 border-l-4 mb-6 shadow-sm" style={{ borderColor: ACCENT }}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /><span>{format(new Date(reservation.date), "dd/MM/yyyy", { locale: es })}</span></div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span>{format(new Date(reservation.date), 'HH:mm')}h</span></div>
                        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /><span>{reservation.pax} personas</span></div>
                    </div>
                </section>

                {!reservation.editable && (
                    <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-100 text-sm text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5" />
                        <span>Tu reserva ya no se puede modificar ni cancelar online (faltan menos de {Math.round(reservation.editCutoffMinutes / 60)}h). Llámanos si necesitas cambios.</span>
                    </div>
                )}

                <fieldset disabled={!reservation.editable || saving || cancelling} className="space-y-6 disabled:opacity-60">
                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Personas</h2>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={() => setPax(Math.max(1, pax - 1))} className="w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50">−</button>
                            <span className="text-xl font-bold w-12 text-center" style={{ fontFamily: "'Oswald', sans-serif" }}>{pax}</span>
                            <button type="button" onClick={() => setPax(pax + 1)} className="w-9 h-9 rounded-full border border-gray-200 hover:bg-gray-50">+</button>
                        </div>
                    </div>

                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Fecha y hora</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {renderCalendar()}
                            <div>
                                {loadingSlots ? (
                                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando horarios…
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(['lunch', 'dinner'] as const).map(meal => {
                                            const list = slots?.[meal] || [];
                                            if (list.length === 0) return null;
                                            return (
                                                <div key={meal}>
                                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 border-b pb-1">
                                                        {meal === 'lunch' ? 'Comida' : 'Cena'}
                                                    </h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {list.map(t => (
                                                            <Button
                                                                key={t}
                                                                type="button"
                                                                onClick={() => setSelectedTime(t)}
                                                                className="text-sm py-2 h-auto font-bold tracking-wider"
                                                                style={{
                                                                    backgroundColor: selectedTime === t ? ACCENT : 'transparent',
                                                                    color: selectedTime === t ? 'white' : '#0A0A0A',
                                                                    border: `1px solid ${selectedTime === t ? ACCENT : '#E5E7EB'}`
                                                                }}
                                                            >
                                                                {t}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {availableTimes.size === 0 && (
                                            <p className="text-sm text-gray-400 italic">No hay horarios disponibles en este día.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-100 p-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest mb-3 text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Comentarios / Alergias</h2>
                        <textarea
                            className="w-full border border-gray-200 p-3 text-sm focus:outline-none focus:border-[#C59D5F] bg-white resize-none"
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
                            className="flex-1 h-12 text-sm font-bold uppercase tracking-widest text-white"
                            style={{ backgroundColor: ACCENT, fontFamily: "'Oswald', sans-serif" }}
                        >
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleCancel}
                            disabled={cancelling || !reservation.editable}
                            variant="ghost"
                            className="flex-1 h-12 text-sm font-bold uppercase tracking-widest border border-red-200 text-red-600 hover:bg-red-50"
                            style={{ fontFamily: "'Oswald', sans-serif" }}
                        >
                            {cancelling ? 'Cancelando…' : 'Cancelar reserva'}
                        </Button>
                    </div>

                    {savedAt && (
                        <p className="text-xs text-green-700 text-center mt-2 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Cambios guardados a las {format(savedAt, 'HH:mm')}
                        </p>
                    )}
                </fieldset>
            </div>
        </div>
    );
}
