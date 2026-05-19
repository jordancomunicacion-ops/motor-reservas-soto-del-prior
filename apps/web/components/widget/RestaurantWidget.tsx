"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Check,
    Users,
    PartyPopper,
    Info,
    Clock,
    ArrowLeft,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fetchAPI } from '@/lib/api';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { WidgetCardForm } from './WidgetCardForm';
import { BASE_STEPS, type WidgetConfig, type RestaurantResponse, type SlotsResponse, type CreatedBooking, type RestaurantEvent, type Closure } from './widget-types';
import { computeDayStatus, shouldRequireStripe } from './widget-helpers';

const logWidgetError = (context: string, err: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[widget] ${context}`, err);
    }
};

export function RestaurantWidget() {
    const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
    const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
    const searchParams = useSearchParams();
    const restaurantId = searchParams.get('id') || '';

    useEffect(() => {
        if (!restaurantId) return;
        fetchAPI<RestaurantResponse>(`/restaurant/${restaurantId}`)
            .then(data => {
                if (data?.widgetConfig) {
                    setWidgetConfig(data.widgetConfig);
                }
                const stripe = data?.integrations?.stripe;
                if (stripe?.enabled && stripe.publicKey) {
                    setStripePromise(loadStripe(stripe.publicKey));
                }
            })
            .catch(err => logWidgetError('load restaurant', err));
    }, [restaurantId]);

    if (stripePromise && widgetConfig) {
        return (
            <Elements stripe={stripePromise}>
                <RestaurantWidgetContent widgetConfig={widgetConfig} />
            </Elements>
        );
    }

    return <RestaurantWidgetContent widgetConfig={widgetConfig} />;
}

function RestaurantWidgetContent({ widgetConfig }: { widgetConfig: WidgetConfig | null }) {
    const searchParams = useSearchParams();
    const restaurantId = searchParams.get('id') || searchParams.get('hotelId') || '';
    const mode = searchParams.get('mode') || 'popup';

    const [currentStep, setCurrentStep] = useState(1);

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [timeSlots, setTimeSlots] = useState<{ lunch: string[]; dinner: string[] } | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', surname: '', email: '', phone: '', prefix: '+34' });
    const [pax, setPax] = useState(2);
    const [comment, setComment] = useState('');
    const [bonusCode] = useState('');
    const [hasAllergy, setHasAllergy] = useState<boolean | null>(null);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptData, setAcceptData] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [closures, setClosures] = useState<{ date: string; endDate?: string | null }[]>([]);
    const [restaurantName, setRestaurantName] = useState('');
    const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<RestaurantEvent | null>(null);
    const [eventDates, setEventDates] = useState<string[]>([]);

    const [additionalData, setAdditionalData] = useState({
        surname2: '',
        age: '',
        gender: '',
        whatsapp: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        linkedin: '',
        xTwitter: '',
    });

    const stripeRequired = shouldRequireStripe(widgetConfig, pax, !!selectedEvent);
    const isStep3Skipped = widgetConfig?.skipGuaranteeStep && !stripeRequired;
    const displaySteps = isStep3Skipped ? BASE_STEPS.filter(s => s.id !== 3) : BASE_STEPS;

    const handleBack = () => {
        if (currentStep === 5) { setCurrentStep(1); return; }
        const currentIndex = displaySteps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) setCurrentStep(displaySteps[currentIndex - 1].id);
        else setCurrentStep(1);
    };

    useEffect(() => {
        if (!widgetConfig?.customCss) return;
        const styleTag = document.createElement('style');
        styleTag.innerHTML = widgetConfig.customCss;
        document.head.appendChild(styleTag);
        return () => {
            if (document.head.contains(styleTag)) document.head.removeChild(styleTag);
        };
    }, [widgetConfig?.customCss]);

    const [restaurantShifts, setRestaurantShifts] = useState<{ daysOfWeek: string }[]>([]);

    useEffect(() => {
        if (!restaurantId) return;
        fetchAPI<RestaurantResponse>(`/restaurant/${restaurantId}`)
            .then(data => {
                if (data?.name) setRestaurantName(data.name);
                if (data?.shifts) setRestaurantShifts(data.shifts);
            })
            .catch(err => logWidgetError('load restaurant info', err));
        fetchAPI<Closure[]>(`/restaurant/${restaurantId}/closures`)
            .then(data => {
                if (Array.isArray(data)) setClosures(data);
            })
            .catch(err => logWidgetError('load closures', err));
        fetchAPI<RestaurantEvent[]>(`/event?restaurantId=${restaurantId}`)
            .then(data => {
                if (Array.isArray(data)) {
                    setEventDates(data.map(e => format(new Date(e.date), 'yyyy-MM-dd')));
                }
            })
            .catch(err => logWidgetError('load events', err));
    }, [restaurantId]);

    useEffect(() => {
        if (selectedDate) handleDateSelect(selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pax]);

    const getDayStatus = (date: Date) => computeDayStatus(date, closures, restaurantShifts, eventDates);

    const handleDateSelect = async (date: Date) => {
        const status = getDayStatus(date);
        if (status !== 'available') return;
        setSelectedDate(date);
        setSelectedTime(null);
        setLoadingSlots(true);

        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const lunchData = await fetchAPI<SlotsResponse>(`/restaurant/${restaurantId}/slots?date=${dateStr}&pax=${pax}&type=LUNCH`);
            const dinnerData = await fetchAPI<SlotsResponse>(`/restaurant/${restaurantId}/slots?date=${dateStr}&pax=${pax}&type=DINNER`);

            setTimeSlots({
                lunch: lunchData?.slots || [],
                dinner: dinnerData?.slots || [],
            });
            setSelectedEvent(lunchData?.event || dinnerData?.event || null);
        } catch (e) {
            console.error('Error fetching slots:', e);
            setTimeSlots({ lunch: [], dinner: [] });
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setCurrentStep(2);
    };

    const handleSubmitReservation = async (paymentMethodId?: string) => {
        if (!selectedDate || !selectedTime || !formData.name || !formData.email) {
            alert('Por favor, complete todos los campos obligatorios.');
            return;
        }
        if (!acceptTerms || !acceptData) {
            alert('Debe aceptar las condiciones de uso y el tratamiento de datos.');
            return;
        }

        setSubmitting(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const result = await fetchAPI<CreatedBooking>('/restaurant/public/reservation', {
                method: 'POST',
                body: JSON.stringify({
                    restaurantId,
                    date: dateStr,
                    time: selectedTime,
                    pax,
                    name: `${formData.name} ${formData.surname} ${additionalData.surname2}`.trim(),
                    email: formData.email,
                    phone: formData.prefix + formData.phone,
                    notes: [comment, bonusCode ? `Bono: ${bonusCode}` : '', hasAllergy ? 'Tiene alergias/intolerancias' : ''].filter(Boolean).join(' | ') || undefined,
                    surname2: additionalData.surname2 || undefined,
                    age: (additionalData.age && !isNaN(parseInt(additionalData.age))) ? parseInt(additionalData.age) : undefined,
                    gender: additionalData.gender || undefined,
                    whatsapp: additionalData.whatsapp || undefined,
                    instagram: additionalData.instagram || undefined,
                    facebook: additionalData.facebook || undefined,
                    tiktok: additionalData.tiktok || undefined,
                    linkedin: additionalData.linkedin || undefined,
                    xTwitter: additionalData.xTwitter || undefined,
                    paymentMethodId,
                }),
            });
            setCreatedBooking(result);
            setCurrentStep(4);
        } catch (e) {
            console.error('Error creating reservation:', e);
            alert('Error al crear la reserva. Inténtelo de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoinWaitlist = async () => {
        if (!formData.name || !formData.email) {
            alert('Nombre y email son obligatorios');
            return;
        }
        setSubmitting(true);
        try {
            await fetchAPI(`/restaurant/${restaurantId}/waitlist`, {
                method: 'POST',
                body: JSON.stringify({
                    date: format(selectedDate!, 'yyyy-MM-dd'),
                    pax,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.prefix + formData.phone,
                    notes: comment,
                }),
            });
            setCreatedBooking({ isWaitlist: true });
            setCurrentStep(4);
        } catch {
            alert('Error al apuntarse a la lista de espera');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMainSubmit = () => {
        if (stripeRequired) {
            document.getElementById('stripe-submit-btn')?.click();
        } else {
            handleSubmitReservation();
        }
    };

    // Calendar generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
    const paddingDays = Array(adjustedStartDay).fill(null);
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    // Override --primary token per restaurant when configured
    const wrapperStyle = widgetConfig?.primaryColor && widgetConfig.primaryColor !== '#3b82f6'
        ? ({ '--primary': widgetConfig.primaryColor, '--ring': widgetConfig.primaryColor } as React.CSSProperties)
        : undefined;

    return (
        <div
            className={cn(
                "min-h-screen bg-background text-foreground",
                mode === 'inline' ? "py-6" : "py-10",
            )}
            style={wrapperStyle}
        >
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                {currentStep > 1 && currentStep < 4 && (
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={handleBack}
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="size-3" /> Volver
                        </button>
                        <p className="text-eyebrow">{restaurantName || 'Reservas'}</p>
                    </div>
                )}

                {/* Stepper */}
                <Stepper steps={displaySteps} currentStep={currentStep} />

                <Card className="border-border/60 shadow-sm mt-6 overflow-hidden gap-0 py-0">
                    <CardContent className="p-5 sm:p-6">
                        {/* STEP 1 — Calendar + slots */}
                        {currentStep === 1 && (
                            <div className={cn(
                                "grid grid-cols-1 gap-6",
                                mode === 'inline' ? 'min-[600px]:grid-cols-2' : 'sm:grid-cols-2',
                            )}>
                                <div className="space-y-5">
                                    <PaxSelector pax={pax} setPax={setPax} />

                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <button
                                                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                                className="grid place-items-center size-7 rounded-md hover:bg-accent transition-colors"
                                                aria-label="Mes anterior"
                                            >
                                                <ChevronLeft className="size-4 text-muted-foreground" />
                                            </button>
                                            <h3 className="font-display text-base font-medium tracking-tight capitalize">
                                                {format(currentMonth, 'MMMM yyyy', { locale: es })}
                                            </h3>
                                            <button
                                                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                                className="grid place-items-center size-7 rounded-md hover:bg-accent transition-colors"
                                                aria-label="Mes siguiente"
                                            >
                                                <ChevronRight className="size-4 text-muted-foreground" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 mb-2 text-center pb-1.5 border-b border-border/60">
                                            {weekDays.map(d => (
                                                <div key={d} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d}</div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                                            {daysInMonth.map(date => {
                                                const status = getDayStatus(date);
                                                const isSelected = selectedDate && isSameDay(date, selectedDate);
                                                const isPast = isBefore(date, startOfDay(new Date()));
                                                const disabled = isPast || status === 'closed';

                                                return (
                                                    <button
                                                        key={date.toString()}
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => !disabled && handleDateSelect(date)}
                                                        className={cn(
                                                            "size-9 grid place-items-center text-xs font-medium rounded-md transition-all",
                                                            isSelected && "bg-primary text-primary-foreground shadow-sm",
                                                            !isSelected && disabled && "text-muted-foreground/40 cursor-not-allowed",
                                                            !isSelected && !disabled && status === 'event' && "bg-info/10 text-info border border-info/20 hover:bg-info/20",
                                                            !isSelected && !disabled && status === 'available' && "text-foreground hover:bg-primary/10 hover:text-primary border border-transparent",
                                                        )}
                                                    >
                                                        {format(date, 'd')}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col border-t pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6 border-border/60">
                                    <Legend />

                                    {!selectedDate && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-md mt-4">
                                            <Play className="size-8 mb-3 text-muted-foreground/50" />
                                            <p className="text-sm text-muted-foreground italic max-w-xs">
                                                Selecciona un día del calendario para ver la disponibilidad.
                                            </p>
                                        </div>
                                    )}

                                    {selectedDate && loadingSlots && (
                                        <div className="flex-1 flex items-center justify-center py-12">
                                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                        </div>
                                    )}

                                    {selectedDate && !loadingSlots && timeSlots && (
                                        <div className="animate-in fade-in slide-in-from-right-2 duration-300 mt-4">
                                            <h3 className="font-display text-base font-medium tracking-tight mb-3">
                                                <span className="text-primary">Disponibilidad · </span>
                                                <span className="capitalize">{format(selectedDate, "d 'de' MMMM", { locale: es })}</span>
                                            </h3>

                                            {selectedEvent && (
                                                <EventCard event={selectedEvent} onReserve={() => handleTimeSelect(format(new Date(selectedEvent.date), 'HH:mm'))} />
                                            )}

                                            <SlotsGroup label="Comida" slots={timeSlots.lunch} onPick={handleTimeSelect} />
                                            <SlotsGroup label="Cena" slots={timeSlots.dinner} onPick={handleTimeSelect} />

                                            {timeSlots.lunch.length === 0 && timeSlots.dinner.length === 0 && (
                                                <div className="mt-5 p-5 bg-warning/10 border border-warning/30 rounded-md text-center">
                                                    <Info className="size-6 text-warning mx-auto mb-2" />
                                                    <h4 className="font-medium mb-1">No queda sitio</h4>
                                                    <p className="text-xs text-muted-foreground mb-4">
                                                        Apúntate a la lista de espera y te avisaremos si se libera una mesa.
                                                    </p>
                                                    <Button
                                                        variant="warning"
                                                        className="w-full"
                                                        onClick={() => setCurrentStep(5)}
                                                    >
                                                        Apuntarse a la lista de espera
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 2 — Information */}
                        {currentStep === 2 && selectedDate && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-300 max-w-2xl mx-auto space-y-6">
                                <SummaryStrip
                                    date={selectedDate}
                                    time={selectedTime}
                                    pax={pax}
                                    place={restaurantName}
                                />

                                <div className="grid gap-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <Field id="r-name" label="Nombre">
                                            <Input
                                                id="r-name"
                                                className="h-10"
                                                placeholder="Nombre"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </Field>
                                        <Field id="r-surname" label="Primer apellido">
                                            <Input
                                                id="r-surname"
                                                className="h-10"
                                                placeholder="Apellido"
                                                value={formData.surname}
                                                onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                            />
                                        </Field>
                                        <Field id="r-surname2" label="Segundo apellido">
                                            <Input
                                                id="r-surname2"
                                                className="h-10"
                                                placeholder="Opcional"
                                                value={additionalData.surname2}
                                                onChange={e => setAdditionalData({ ...additionalData, surname2: e.target.value })}
                                            />
                                        </Field>
                                    </div>
                                    <Field id="r-email" label="Email">
                                        <Input
                                            id="r-email"
                                            type="email"
                                            className="h-10"
                                            placeholder="ejemplo@email.com"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </Field>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                        <Field id="r-prefix" label="Prefijo">
                                            <Select value={formData.prefix} onValueChange={v => setFormData({ ...formData, prefix: v })}>
                                                <SelectTrigger id="r-prefix" className="w-full h-10">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="+34">🇪🇸 +34</SelectItem>
                                                    <SelectItem value="+33">🇫🇷 +33</SelectItem>
                                                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <div className="sm:col-span-3">
                                            <Field id="r-phone" label="Teléfono">
                                                <Input
                                                    id="r-phone"
                                                    type="tel"
                                                    className="h-10"
                                                    placeholder="000 000 000"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </Field>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-eyebrow">¿Alergias?</Label>
                                        <div className="flex gap-5">
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={hasAllergy === true}
                                                    onCheckedChange={() => setHasAllergy(true)}
                                                />
                                                <span className="text-sm">Sí</span>
                                            </label>
                                            <label className="inline-flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={hasAllergy === false}
                                                    onCheckedChange={() => setHasAllergy(false)}
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                        </div>
                                    </div>

                                    <Field id="r-comment" label="Comentario">
                                        <Textarea
                                            id="r-comment"
                                            rows={2}
                                            className="resize-none"
                                            placeholder="Opcional"
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                        />
                                    </Field>

                                    <div className="space-y-2 pt-2">
                                        <label className="inline-flex items-start gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={acceptTerms}
                                                onCheckedChange={(v) => setAcceptTerms(!!v)}
                                                className="mt-0.5"
                                            />
                                            <span className="text-xs text-muted-foreground leading-snug">
                                                Acepto las condiciones de uso.
                                            </span>
                                        </label>
                                        <label className="inline-flex items-start gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={acceptData}
                                                onCheckedChange={(v) => setAcceptData(!!v)}
                                                className="mt-0.5"
                                            />
                                            <span className="text-xs text-muted-foreground leading-snug">
                                                Consiento el tratamiento de mis datos.
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <Button
                                    size="xl"
                                    className="w-full"
                                    onClick={() => {
                                        if (isStep3Skipped) handleSubmitReservation();
                                        else setCurrentStep(3);
                                    }}
                                >
                                    Continuar
                                </Button>
                            </div>
                        )}

                        {/* STEP 3 — Additional / Stripe */}
                        {currentStep === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-2 duration-300 max-w-2xl mx-auto py-2 space-y-6">
                                <div className="text-center space-y-1.5">
                                    <p className="text-eyebrow">Garantía de reserva</p>
                                    <h3 className="font-display text-2xl font-medium tracking-tight">
                                        Asegura tu mesa
                                    </h3>
                                </div>

                                {widgetConfig?.showCrmFields !== false && (
                                    <div className="border-b border-border/60 pb-5 space-y-3">
                                        <p className="text-eyebrow text-primary">Datos opcionales</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                type="number"
                                                placeholder="Edad"
                                                className="h-10"
                                                value={additionalData.age}
                                                onChange={e => setAdditionalData({ ...additionalData, age: e.target.value })}
                                            />
                                            <Select value={additionalData.gender || 'none'} onValueChange={v => setAdditionalData({ ...additionalData, gender: v === 'none' ? '' : v })}>
                                                <SelectTrigger className="w-full h-10">
                                                    <SelectValue placeholder="Sexo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sin especificar</SelectItem>
                                                    <SelectItem value="M">Hombre</SelectItem>
                                                    <SelectItem value="F">Mujer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Input placeholder="WhatsApp" className="h-10" value={additionalData.whatsapp} onChange={e => setAdditionalData({ ...additionalData, whatsapp: e.target.value })} />
                                            <Input placeholder="Instagram" className="h-10" value={additionalData.instagram} onChange={e => setAdditionalData({ ...additionalData, instagram: e.target.value })} />
                                            <Input placeholder="TikTok" className="h-10" value={additionalData.tiktok} onChange={e => setAdditionalData({ ...additionalData, tiktok: e.target.value })} />
                                            <Input placeholder="Facebook" className="h-10" value={additionalData.facebook} onChange={e => setAdditionalData({ ...additionalData, facebook: e.target.value })} />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    {stripeRequired ? (
                                        <WidgetCardForm
                                            onSuccess={(pmId) => handleSubmitReservation(pmId)}
                                            submitting={submitting}
                                            amount={widgetConfig?.noShowFeeAmount || 20}
                                        />
                                    ) : (
                                        <div className="rounded-md bg-muted/50 border border-border p-4 text-center text-sm text-muted-foreground italic">
                                            No se requiere garantía con tarjeta para esta reserva.
                                        </div>
                                    )}
                                </div>

                                <Button
                                    size="xl"
                                    className="w-full"
                                    onClick={handleMainSubmit}
                                    disabled={submitting}
                                >
                                    {submitting && <Loader2 className="size-4 animate-spin" />}
                                    {submitting ? 'Procesando…' : 'Reservar ahora'}
                                </Button>
                            </div>
                        )}

                        {/* STEP 4 — Confirmation */}
                        {currentStep === 4 && (
                            <div className="animate-in fade-in zoom-in-95 duration-300 py-6 text-center space-y-6">
                                <div className={cn(
                                    "mx-auto grid place-items-center size-16 rounded-full",
                                    createdBooking?.isWaitlist
                                        ? "bg-warning/15 text-warning-foreground"
                                        : "bg-success/10 text-success",
                                )}>
                                    {createdBooking?.isWaitlist
                                        ? <Clock className="size-7" />
                                        : <Check className="size-8" strokeWidth={2.5} />}
                                </div>
                                <div className="space-y-1.5">
                                    <h2 className="font-display text-2xl font-medium tracking-tight">
                                        {createdBooking?.isWaitlist ? 'En lista de espera' : '¡Reserva confirmada!'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedDate && format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                                        {!createdBooking?.isWaitlist && selectedTime && ` · ${selectedTime}h`}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                                    {createdBooking?.isWaitlist
                                        ? `Te avisaremos si se libera una mesa para ${pax} personas.`
                                        : `${pax} personas en ${restaurantName}. Recibirás un email de confirmación en breve.`}
                                </p>
                                <Button variant="outline" onClick={() => window.location.reload()}>
                                    Volver al inicio
                                </Button>
                            </div>
                        )}

                        {/* STEP 5 — Waitlist */}
                        {currentStep === 5 && selectedDate && (
                            <div className="animate-in fade-in zoom-in-95 duration-300 max-w-xl mx-auto py-2 space-y-6">
                                <div className="text-center space-y-1.5">
                                    <p className="text-eyebrow">Lista de espera</p>
                                    <h3 className="font-display text-2xl font-medium tracking-tight">
                                        Apúntate y te avisamos
                                    </h3>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        {format(selectedDate, "d 'de' MMMM", { locale: es })} · {pax} personas
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <Field id="w-name" label="Nombre">
                                            <Input id="w-name" className="h-10" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </Field>
                                        <Field id="w-email" label="Email">
                                            <Input id="w-email" type="email" className="h-10" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        </Field>
                                    </div>
                                    <Field id="w-phone" label="Teléfono">
                                        <Input
                                            id="w-phone"
                                            type="tel"
                                            className="h-10"
                                            placeholder="+34 000 000 000"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </Field>
                                    <Field id="w-notes" label="Notas / alergias">
                                        <Textarea
                                            id="w-notes"
                                            rows={3}
                                            className="resize-none"
                                            value={comment}
                                            onChange={e => setComment(e.target.value)}
                                        />
                                    </Field>
                                </div>

                                <div className="space-y-2">
                                    <Button
                                        size="xl"
                                        variant="warning"
                                        className="w-full"
                                        onClick={handleJoinWaitlist}
                                        disabled={submitting}
                                    >
                                        {submitting && <Loader2 className="size-4 animate-spin" />}
                                        {submitting ? 'Apuntando…' : 'Confirmar disponibilidad'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full"
                                        onClick={() => setCurrentStep(1)}
                                    >
                                        Volver al calendario
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

/* ============================================================
   Subcomponents
   ============================================================ */

function Stepper({
    steps,
    currentStep,
}: {
    steps: typeof BASE_STEPS;
    currentStep: number;
}) {
    return (
        <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
            <div className="flex-1 flex items-center relative">
                {steps.map((step, i) => {
                    const stepIndex = steps.findIndex(s => s.id === step.id);
                    const currentIndex = steps.findIndex(s => s.id === currentStep);
                    const isCompleted = currentIndex > stepIndex;
                    const isActive = currentStep === step.id;
                    const isDone = isCompleted || isActive;

                    return (
                        <div key={step.id} className="flex-1 flex flex-col items-center relative">
                            {i > 0 && (
                                <div className={cn(
                                    "absolute top-3.5 right-1/2 h-0.5 w-full transition-colors",
                                    isDone ? "bg-foreground" : "bg-border",
                                )} />
                            )}
                            <div
                                className={cn(
                                    "relative size-7 rounded-full grid place-items-center text-xs font-medium border-2 transition-all bg-background",
                                    isDone
                                        ? "bg-foreground border-foreground text-background"
                                        : "border-border text-muted-foreground",
                                )}
                            >
                                {isCompleted ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                            </div>
                            <span
                                className={cn(
                                    "mt-1.5 text-[10px] font-medium uppercase tracking-wider transition-colors",
                                    isDone ? "text-foreground" : "text-muted-foreground",
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PaxSelector({ pax, setPax }: { pax: number; setPax: (n: number) => void }) {
    return (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
            <p className="text-eyebrow mb-2">¿Cuántos sois?</p>
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setPax(Math.max(1, pax - 1))}
                    className="grid place-items-center size-8 rounded-md border border-border bg-background hover:bg-accent transition-colors"
                    aria-label="Menos personas"
                >
                    <span className="text-base font-medium">−</span>
                </button>
                <div className="inline-flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-display text-lg font-medium tracking-tight tabular-nums">
                        {pax} {pax === 1 ? 'persona' : 'personas'}
                    </span>
                </div>
                <button
                    onClick={() => setPax(pax + 1)}
                    className="grid place-items-center size-8 rounded-md border border-border bg-background hover:bg-accent transition-colors"
                    aria-label="Más personas"
                >
                    <span className="text-base font-medium">+</span>
                </button>
            </div>
        </div>
    );
}

function Legend() {
    const items = [
        { label: 'Disponible', cls: 'bg-background border border-border' },
        { label: 'Cerrado', cls: 'bg-muted border border-border' },
        { label: 'Evento', cls: 'bg-info/10 border border-info/30' },
        { label: 'Seleccionado', cls: 'bg-primary' },
    ];
    return (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
            {items.map(i => (
                <span key={i.label} className="inline-flex items-center gap-1.5">
                    <span className={cn("size-2.5 rounded", i.cls)} />
                    {i.label}
                </span>
            ))}
        </div>
    );
}

function SlotsGroup({
    label,
    slots,
    onPick,
}: {
    label: string;
    slots: string[];
    onPick: (t: string) => void;
}) {
    return (
        <div className="mb-4">
            <h4 className="text-eyebrow mb-2 pb-1.5 border-b border-border/60">{label}</h4>
            {slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {slots.map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => onPick(t)}
                            className="h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium tabular-nums hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            {t}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground italic">Sin disponibilidad.</p>
            )}
        </div>
    );
}

function EventCard({
    event,
    onReserve,
}: {
    event: RestaurantEvent;
    onReserve: () => void;
}) {
    const full = event._count.bookings >= event.capacity;
    return (
        <div className="mb-5 p-4 bg-info/5 border border-info/20 rounded-md animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-1.5 text-info mb-1">
                <PartyPopper className="size-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">Evento especial</span>
            </div>
            <h4 className="font-display text-base font-medium tracking-tight mb-1">{event.name}</h4>
            {event.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2 italic">{event.description}</p>
            )}
            <div className="flex justify-between items-center">
                {full ? (
                    <span className="text-sm font-medium text-destructive italic">Evento completo</span>
                ) : (
                    <>
                        <span className="font-display text-lg font-medium text-info tabular-nums">{event.price}€</span>
                        <Button size="sm" onClick={onReserve}>
                            Reservar evento
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}

function SummaryStrip({
    date,
    time,
    pax,
    place,
}: {
    date: Date;
    time: string | null;
    pax: number;
    place: string;
}) {
    return (
        <div className="rounded-md bg-muted/40 border border-border px-4 py-3">
            <p className="text-eyebrow mb-2">Resumen de reserva</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <SummaryRow label="Fecha" value={format(date, 'dd-MM-yyyy', { locale: es })} />
                <SummaryRow label="Hora" value={time ? `${time}h` : '—'} />
                <SummaryRow label="Pax" value={`${pax} personas`} />
                <SummaryRow label="Lugar" value={place || 'Restaurante'} />
            </div>
        </div>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline gap-2">
            <span className="text-eyebrow w-12">{label}</span>
            <span className="font-medium text-foreground truncate">{value}</span>
        </div>
    );
}

function Field({
    id,
    label,
    children,
}: {
    id?: string;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-eyebrow">{label}</Label>
            {children}
        </div>
    );
}
