"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HotelAvailabilityResult {
    id: string;
    name: string;
    totalPrice: number;
    description?: string;
}
interface HotelWidgetConfig {
    primaryColor?: string | null;
    customCss?: string | null;
    restaurantId?: string | null;
}
interface HotelBookingResult {
    id?: string;
    referenceCode?: string;
    totalPrice?: number;
}

function StepHeader({ title, onBack }: { title: string; onBack?: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-medium tracking-tight">{title}</h3>
            {onBack && (
                <button
                    onClick={onBack}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="size-3" /> Atrás
                </button>
            )}
        </div>
    );
}

function WidgetContent() {
    const searchParams = useSearchParams();
    const hotelId = searchParams.get('hotelId') || "DEMO-HOTEL-ID";

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [stylesPrimary, setStylesPrimary] = useState<string | null>(null);
    const [customCss, setCustomCss] = useState<string>('');

    useEffect(() => {
        if (customCss) {
            const style = document.createElement('style');
            style.innerHTML = customCss;
            document.head.appendChild(style);
            return () => { document.head.removeChild(style); };
        }
    }, [customCss]);

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = new Date(); checkout.setDate(checkout.getDate() + 3);
    const [dates, setDates] = useState({
        from: tomorrow.toISOString().split('T')[0],
        to: checkout.toISOString().split('T')[0],
    });
    const [pax, setPax] = useState(2);

    const [results, setResults] = useState<HotelAvailabilityResult[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<HotelAvailabilityResult | null>(null);
    const [guest, setGuest] = useState({ name: '', email: '', phone: '' });
    const [config, setConfig] = useState<HotelWidgetConfig | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [bookingResult, setBookingResult] = useState<HotelBookingResult | null>(null);

    const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });
    const [lunchTime, setLunchTime] = useState("");
    const [dinnerTime, setDinnerTime] = useState("");
    const [lunchSlots, setLunchSlots] = useState<string[]>([]);
    const [dinnerSlots, setDinnerSlots] = useState<string[]>([]);

    useEffect(() => {
        fetchAPI<HotelWidgetConfig>(`/config/${hotelId}`).then(res => {
            setConfig(res);
            if (res?.primaryColor) setStylesPrimary(res.primaryColor);
            if (res?.customCss) setCustomCss(res.customCss);
        }).catch(() => { /* defaults */ });
    }, [hotelId]);

    useEffect(() => {
        if (meals.lunch && config?.restaurantId) {
            fetchAPI<{ slots?: string[] } | string[]>(`/restaurant/${config.restaurantId}/slots?date=${dates.from}&pax=${pax}&type=LUNCH`)
                .then(data => setLunchSlots(Array.isArray(data) ? data : (data.slots ?? [])))
                .catch(() => setLunchSlots(["13:30", "14:00", "14:30"]));
        }
    }, [meals.lunch, config?.restaurantId, dates.from, pax]);

    useEffect(() => {
        if (meals.dinner && config?.restaurantId) {
            fetchAPI<{ slots?: string[] } | string[]>(`/restaurant/${config.restaurantId}/slots?date=${dates.from}&pax=${pax}&type=DINNER`)
                .then(data => setDinnerSlots(Array.isArray(data) ? data : (data.slots ?? [])))
                .catch(() => setDinnerSlots(["20:30", "21:00", "21:30"]));
        }
    }, [meals.dinner, config?.restaurantId, dates.from, pax]);

    async function handleSearch() {
        setLoading(true);
        try {
            const res = await fetchAPI<HotelAvailabilityResult[]>(`/bookings/availability?hotelId=${hotelId}&from=${dates.from}&to=${dates.to}&pax=${pax}`);
            if (!Array.isArray(res)) throw new Error('API Error');
            setResults(res);
            setStep(2);
        } catch {
            setResults([
                { id: '1', name: 'Demo Deluxe Room', totalPrice: 250, description: 'Ocean view (Mock)' },
                { id: '2', name: 'Demo Standard Room', totalPrice: 150, description: 'Cozy stay (Mock)' }
            ]);
            setStep(2);
        } finally {
            setLoading(false);
        }
    }

    // Override --primary token per hotel (controlled, no inline styles in markup).
    const wrapperStyle = stylesPrimary
        ? ({ '--primary': stylesPrimary, '--ring': stylesPrimary } as React.CSSProperties)
        : undefined;

    const totalSteps = 5;

    return (
        <>
            <link rel="stylesheet" href="/custom-widget.css" />
            <div className="widget-container min-h-screen bg-background grid place-items-center p-4 sm:p-6" style={wrapperStyle}>
                <Card className="w-full max-w-lg border-border/60 shadow-lg gap-0 py-0 overflow-hidden">
                    {/* Progress */}
                    <div className="px-6 pt-6 pb-4 border-b border-border/60">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-eyebrow">Reserva tu estancia</p>
                            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                                Paso {Math.min(step, totalSteps)} / {totalSteps}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-colors",
                                        i < step ? "bg-primary" : "bg-muted",
                                    )}
                                />
                            ))}
                        </div>
                    </div>

                    <CardContent className="p-6">
                        {/* STEP 1: SEARCH */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkin" className="text-eyebrow">Entrada</Label>
                                        <Input
                                            id="checkin"
                                            type="date"
                                            className="h-11"
                                            value={dates.from}
                                            onChange={e => setDates({ ...dates, from: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="checkout" className="text-eyebrow">Salida</Label>
                                        <Input
                                            id="checkout"
                                            type="date"
                                            className="h-11"
                                            value={dates.to}
                                            onChange={e => setDates({ ...dates, to: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="pax" className="text-eyebrow">Huéspedes</Label>
                                    <Select value={String(pax)} onValueChange={v => setPax(Number(v))}>
                                        <SelectTrigger id="pax" className="w-full h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[1, 2, 3, 4].map(n => (
                                                <SelectItem key={n} value={String(n)}>
                                                    {n} {n === 1 ? 'Adulto' : 'Adultos'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    size="xl"
                                    className="w-full"
                                    onClick={handleSearch}
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="size-4 animate-spin" />}
                                    {loading ? 'Buscando disponibilidad…' : 'Ver disponibilidad'}
                                </Button>
                            </div>
                        )}

                        {/* STEP 2: SELECT ROOM */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <StepHeader title="Selecciona habitación" onBack={() => setStep(1)} />
                                <div className="space-y-2.5">
                                    {results.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            No hay disponibilidad para esas fechas.
                                        </p>
                                    ) : results.map(r => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => { setSelectedRoom(r); setStep(3); }}
                                            className="w-full text-left rounded-lg border border-border/70 bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm hover:bg-primary/[0.02] group"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="min-w-0">
                                                    <span className="block font-display text-base font-medium group-hover:text-primary transition-colors">
                                                        {r.name}
                                                    </span>
                                                    {r.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="block font-display text-xl font-medium tabular-nums">€{r.totalPrice}</span>
                                                    <span className="text-eyebrow">Total estancia</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: EXTRAS / SYNERGY */}
                        {step === 3 && (
                            <div className="space-y-5">
                                <StepHeader title="Personaliza tu estancia" onBack={() => setStep(2)} />

                                <div className="space-y-2.5">
                                    {/* Breakfast */}
                                    <ExtraOption
                                        selected={meals.breakfast}
                                        onClick={() => setMeals({ ...meals, breakfast: !meals.breakfast })}
                                        title="Desayuno buffet"
                                        subtitle="Soto del Prior · sin horario fijo"
                                        rightLabel="+€12/día"
                                    />

                                    {/* Lunch */}
                                    {config?.restaurantId && (
                                        <div
                                            className={cn(
                                                "rounded-lg border bg-card transition-all",
                                                meals.lunch ? "border-primary/60 bg-primary/[0.04]" : "border-border/70",
                                            )}
                                        >
                                            <ExtraOption
                                                selected={meals.lunch}
                                                onClick={() => setMeals({ ...meals, lunch: !meals.lunch })}
                                                title="Comida"
                                                subtitle="Turnos de mediodía"
                                                rightLabel="Cita previa"
                                                bare
                                            />
                                            {meals.lunch && (
                                                <div className="px-4 pb-4 pt-3 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <p className="text-eyebrow mb-2">Horario comida</p>
                                                    <SlotPicker slots={lunchSlots} value={lunchTime} onChange={setLunchTime} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Dinner */}
                                    {config?.restaurantId && (
                                        <div
                                            className={cn(
                                                "rounded-lg border bg-card transition-all",
                                                meals.dinner ? "border-primary/60 bg-primary/[0.04]" : "border-border/70",
                                            )}
                                        >
                                            <ExtraOption
                                                selected={meals.dinner}
                                                onClick={() => setMeals({ ...meals, dinner: !meals.dinner })}
                                                title="Cena"
                                                subtitle="Turnos de noche"
                                                rightLabel="Cita previa"
                                                bare
                                            />
                                            {meals.dinner && (
                                                <div className="px-4 pb-4 pt-3 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <p className="text-eyebrow mb-2">Horario cena</p>
                                                    <SlotPicker slots={dinnerSlots} value={dinnerTime} onChange={setDinnerTime} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    size="xl"
                                    className="w-full"
                                    onClick={() => setStep(4)}
                                    disabled={(meals.lunch && !lunchTime) || (meals.dinner && !dinnerTime)}
                                >
                                    Continuar
                                </Button>
                            </div>
                        )}

                        {/* STEP 4: GUEST INFO */}
                        {step === 4 && (
                            <div className="space-y-5">
                                <StepHeader title="Datos del huésped" onBack={() => setStep(3)} />
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="g-name" className="text-eyebrow">Nombre completo</Label>
                                        <Input
                                            id="g-name"
                                            type="text"
                                            className="h-11"
                                            value={guest.name}
                                            onChange={e => setGuest({ ...guest, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="g-email" className="text-eyebrow">Email</Label>
                                        <Input
                                            id="g-email"
                                            type="email"
                                            className="h-11"
                                            value={guest.email}
                                            onChange={e => setGuest({ ...guest, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="g-phone" className="text-eyebrow">Teléfono</Label>
                                        <Input
                                            id="g-phone"
                                            type="tel"
                                            className="h-11"
                                            placeholder="+34 600 000 000"
                                            value={guest.phone}
                                            onChange={e => setGuest({ ...guest, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button
                                    size="xl"
                                    className="w-full"
                                    disabled={submitting || !guest.name || !guest.email}
                                    onClick={async () => {
                                        if (!guest.name || !guest.email) { alert('Nombre y email son obligatorios'); return; }
                                        setSubmitting(true);
                                        try {
                                            const booking = await fetchAPI<HotelBookingResult>('/bookings', {
                                                method: 'POST',
                                                body: JSON.stringify({
                                                    hotelId,
                                                    guestName: guest.name,
                                                    guestEmail: guest.email,
                                                    guestPhone: guest.phone,
                                                    checkInDate: dates.from,
                                                    checkOutDate: dates.to,
                                                    roomTypeId: selectedRoom?.id,
                                                    pax
                                                })
                                            });
                                            setBookingResult(booking);
                                            if (config?.restaurantId && booking?.id) {
                                                if (meals.lunch && lunchTime) {
                                                    await fetchAPI('/restaurant/linked-reservation', {
                                                        method: 'POST',
                                                        body: JSON.stringify({ bookingId: booking.id, restaurantId: config.restaurantId, date: dates.from, time: lunchTime, pax, name: guest.name, email: guest.email })
                                                    }).catch(e => console.error('Synergy lunch error:', e));
                                                }
                                                if (meals.dinner && dinnerTime) {
                                                    await fetchAPI('/restaurant/linked-reservation', {
                                                        method: 'POST',
                                                        body: JSON.stringify({ bookingId: booking.id, restaurantId: config.restaurantId, date: dates.from, time: dinnerTime, pax, name: guest.name, email: guest.email })
                                                    }).catch(e => console.error('Synergy dinner error:', e));
                                                }
                                            }
                                            setStep(5);
                                        } catch (e) {
                                            console.error('Error creating booking:', e);
                                            alert('Error al crear la reserva. Inténtelo de nuevo.');
                                        } finally {
                                            setSubmitting(false);
                                        }
                                    }}
                                >
                                    {submitting && <Loader2 className="size-4 animate-spin" />}
                                    {submitting
                                        ? 'Procesando…'
                                        : `Confirmar reserva · €${(selectedRoom?.totalPrice ?? 0) + (meals.breakfast ? 12 * 4 : 0)}`}
                                </Button>
                            </div>
                        )}

                        {/* STEP 5: SUCCESS */}
                        {step === 5 && (
                            <div className="space-y-5 py-4 text-center">
                                <div className="mx-auto grid place-items-center size-16 rounded-full bg-success/10 text-success">
                                    <Check className="size-8" strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="font-display text-2xl font-medium tracking-tight">
                                        ¡Reserva confirmada!
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Ref: <span className="font-mono text-foreground">{bookingResult?.referenceCode || 'N/A'}</span>
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-left space-y-2">
                                    <SummaryRow label="Huésped" value={guest.name} />
                                    <SummaryRow label="Check-in" value={dates.from} />
                                    <SummaryRow label="Check-out" value={dates.to} />
                                    <SummaryRow label="Habitación" value={selectedRoom?.name ?? '—'} />
                                    <SummaryRow label="Total" value={`€${bookingResult?.totalPrice || selectedRoom?.totalPrice || 0}`} strong />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Recibirás un email de confirmación en breve.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function ExtraOption({
    selected,
    onClick,
    title,
    subtitle,
    rightLabel,
    bare,
}: {
    selected: boolean;
    onClick: () => void;
    title: string;
    subtitle: string;
    rightLabel: string;
    bare?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full text-left transition-all",
                bare
                    ? "px-4 py-4"
                    : cn(
                        "rounded-lg border bg-card p-4",
                        selected ? "border-primary/60 bg-primary/[0.04]" : "border-border/70 hover:border-primary/30",
                    ),
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <span
                        className={cn(
                            "size-4 rounded border grid place-items-center shrink-0 transition-all",
                            selected ? "bg-primary border-primary" : "border-input bg-background",
                        )}
                    >
                        {selected && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0">
                        <span className="block font-medium text-sm text-foreground">{title}</span>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
                <span className="text-xs font-semibold text-primary shrink-0">{rightLabel}</span>
            </div>
        </button>
    );
}

function SlotPicker({ slots, value, onChange }: { slots: string[]; value: string; onChange: (v: string) => void }) {
    if (slots.length === 0) {
        return <p className="text-xs text-muted-foreground">Sin disponibilidad.</p>;
    }
    return (
        <div className="grid grid-cols-4 gap-1.5">
            {slots.map(slot => (
                <button
                    key={slot}
                    type="button"
                    onClick={() => onChange(slot)}
                    className={cn(
                        "py-2 text-xs font-semibold rounded-md transition-all border tabular-nums",
                        value === slot
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border/70 hover:border-primary/40",
                    )}
                >
                    {slot}
                </button>
            ))}
        </div>
    );
}

function SummaryRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}</span>
            <span className={cn(strong ? "font-display text-base font-medium" : "font-medium")}>{value}</span>
        </div>
    );
}

export default function WidgetPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen grid place-items-center bg-background">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <WidgetContent />
        </Suspense>
    );
}
