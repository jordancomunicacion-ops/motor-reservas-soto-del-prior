"use client";
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Play, Check, Calendar, Users, MapPin, PartyPopper, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { WidgetCardForm } from './WidgetCardForm';
import { BASE_STEPS, type WidgetConfig } from './widget-types';
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
        fetchAPI(`/restaurant/${restaurantId}`)
            .then(data => {
                if (data?.widgetConfig) {
                    setWidgetConfig(data.widgetConfig);
                }
                if (data?.integrations?.stripe?.enabled && data?.integrations?.stripe?.publicKey) {
                    setStripePromise(loadStripe(data.integrations.stripe.publicKey));
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
    const [timeSlots, setTimeSlots] = useState<{ lunch: string[], dinner: string[] } | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', surname: '', email: '', phone: '', prefix: '+34' });
    const [pax, setPax] = useState(2);
    const [comment, setComment] = useState('');
    const [bonusCode, setBonusCode] = useState('');
    const [hasAllergy, setHasAllergy] = useState<boolean | null>(null);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptData, setAcceptData] = useState(false);
    const [acceptMarketing, setAcceptMarketing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [closures, setClosures] = useState<{ date: string; endDate?: string | null }[]>([]);
    const [restaurantName, setRestaurantName] = useState('');
    const [createdBooking, setCreatedBooking] = useState<{ id?: string; isWaitlist?: boolean } | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<{
        id: string;
        name: string;
        description: string | null;
        date: string;
        price: number;
        capacity: number;
        _count: { bookings: number };
    } | null>(null);
    const [eventDates, setEventDates] = useState<string[]>([]);

    // CRM Additional Fields (Step 3)
    const [additionalData, setAdditionalData] = useState({
        surname2: '',
        age: '',
        gender: '',
        whatsapp: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        linkedin: '',
        xTwitter: ''
    });

    // Granular No-Show Logic
    const stripeRequired = shouldRequireStripe(widgetConfig, pax, !!selectedEvent);

    const isStep3Skipped = widgetConfig?.skipGuaranteeStep && !stripeRequired;

    const displaySteps = isStep3Skipped ? BASE_STEPS.filter(s => s.id !== 3) : BASE_STEPS;

    const handleBack = () => {
        if (currentStep === 5) {
            setCurrentStep(1);
            return;
        }

        const currentIndex = displaySteps.findIndex(s => s.id === currentStep);
        if (currentIndex > 0) {
            setCurrentStep(displaySteps[currentIndex - 1].id);
        } else {
            setCurrentStep(1);
        }
    };

    // Inject Fonts and Custom CSS
    useEffect(() => {
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Oswald:wght@300;400;500;700&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);
        
        let styleTag: HTMLStyleElement | null = null;
        if (widgetConfig?.customCss) {
            styleTag = document.createElement('style');
            styleTag.innerHTML = widgetConfig.customCss;
            document.head.appendChild(styleTag);
        }

        return () => { 
            if (document.head.contains(link)) document.head.removeChild(link); 
            if (styleTag && document.head.contains(styleTag)) document.head.removeChild(styleTag);
        }
    }, [widgetConfig?.customCss]);

    const [restaurantShifts, setRestaurantShifts] = useState<{ daysOfWeek: string }[]>([]);

    // Load restaurant info and closures
    useEffect(() => {
        if (!restaurantId) return;
        fetchAPI(`/restaurant/${restaurantId}`)
            .then(data => {
                if (data?.name) setRestaurantName(data.name);
                if (data?.shifts) setRestaurantShifts(data.shifts);
            })
            .catch(err => logWidgetError('load restaurant info', err));
        fetchAPI(`/restaurant/${restaurantId}/closures`)
            .then(data => {
                if (Array.isArray(data)) setClosures(data);
            })
            .catch(err => logWidgetError('load closures', err));

        fetchAPI(`/event?restaurantId=${restaurantId}`)
            .then(data => {
                if (Array.isArray(data)) {
                    setEventDates(data.map((e: { date: string }) => format(new Date(e.date), 'yyyy-MM-dd')));
                }
            })
            .catch(err => logWidgetError('load events', err));
    }, [restaurantId]);

    // Refresh slots when pax changes
    useEffect(() => {
        if (selectedDate) {
            handleDateSelect(selectedDate);
        }
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
            const lunchData = await fetchAPI(`/restaurant/${restaurantId}/slots?date=${dateStr}&pax=${pax}&type=LUNCH`);
            const dinnerData = await fetchAPI(`/restaurant/${restaurantId}/slots?date=${dateStr}&pax=${pax}&type=DINNER`);

            setTimeSlots({
                lunch: lunchData?.slots || [],
                dinner: dinnerData?.slots || []
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
            const result = await fetchAPI('/restaurant/public/reservation', {
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
                    paymentMethodId
                })
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
                    notes: comment
                })
            });
            setCreatedBooking({ isWaitlist: true });
            setCurrentStep(4);
        } catch (e) {
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

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
    const paddingDays = Array(adjustedStartDay).fill(null);
    const weekDays = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];

    const colors = {
        accent: widgetConfig?.primaryColor === '#3b82f6' ? '#C59D5F' : (widgetConfig?.primaryColor || '#C59D5F'),
        bg: '#F4F4F4',
        text: '#0A0A0A',
        white: '#FFFFFF'
    };

    return (
        <div className="max-w-4xl mx-auto px-4 pb-4 pt-0 text-[#0A0A0A] bg-white" style={{ fontFamily: "'Lato', sans-serif" }}>

            {/* Header / Back Button */}
            {currentStep > 1 && currentStep < 4 && (
                <div className="flex justify-between items-center mb-4 px-1 pt-4">
                    <button
                        onClick={handleBack}
                        className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:text-[#C59D5F] transition-colors"
                        style={{ backgroundColor: 'transparent', color: colors.text, fontFamily: "'Oswald', sans-serif" }}
                    >
                        {'<'} VOLVER
                    </button>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">{restaurantName || 'RESERVAS'}</h2>
                </div>
            )}

            {/* Stepper */}
            <div className={`flex relative justify-between items-center mb-0 px-8 max-w-2xl mx-auto ${currentStep === 1 ? 'pt-8' : ''}`}>
                <div className="absolute top-4 left-10 right-10 h-0.5 bg-gray-200 -z-10">
                    <div
                        className="h-full bg-[#0A0A0A] transition-all duration-500"
                        style={{ 
                            width: `${((displaySteps.findIndex(s => s.id === currentStep)) / (displaySteps.length - 1)) * 100}%` 
                        }}
                    ></div>
                </div>

                {displaySteps.map((step, index) => {
                    const isActive = currentStep === step.id;
                    const stepIndex = displaySteps.findIndex(s => s.id === step.id);
                    const currentStepIndex = displaySteps.findIndex(s => s.id === currentStep);
                    const isCompleted = currentStepIndex > stepIndex;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-1 bg-white px-2">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300"
                                style={{
                                    borderColor: isActive || isCompleted ? '#0A0A0A' : '#E5E7EB',
                                    backgroundColor: isActive || isCompleted ? '#0A0A0A' : 'white',
                                    color: isActive || isCompleted ? 'white' : '#D1D5DB',
                                    fontFamily: "'Oswald', sans-serif"
                                }}
                            >
                                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                            </div>
                            <span
                                className="text-[10px] font-bold uppercase tracking-widest"
                                style={{
                                    color: isActive || isCompleted ? colors.text : '#D1D5DB',
                                    fontFamily: "'Oswald', sans-serif"
                                }}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <Card className="rounded-none overflow-hidden min-h-[450px] border-none shadow-none">
                <CardContent className="p-4 pt-0 bg-white">

                    {/* STEP 1: FIND (Calendar + Times) */}
                    {currentStep === 1 && (
                        <div className={`grid grid-cols-1 ${mode === 'inline' ? 'min-[600px]:grid-cols-2' : 'sm:grid-cols-2'} gap-4 h-full`}>
                            <div className="flex flex-col">
                                <div className="max-w-[280px] mx-auto w-full">
                                    {/* Pax Selector */}
                                    <div className="mb-6 bg-gray-50 p-3 rounded-none border-l-4 border-[#C59D5F]">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 block" style={{ fontFamily: "'Oswald', sans-serif" }}>¿Cuántos sois?</label>
                                        <div className="flex items-center justify-between">
                                            <button 
                                                onClick={() => setPax(Math.max(1, pax - 1))}
                                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
                                            >
                                                -
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-[#C59D5F]" />
                                                <span className="text-xl font-black italic tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>{pax} PERSONAS</span>
                                            </div>
                                            <button 
                                                onClick={() => setPax(pax + 1)}
                                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mb-2">
                                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <h3 className="font-bold text-lg uppercase tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                            {format(currentMonth, 'MMMM yyyy', { locale: es })}
                                        </h3>
                                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 mb-2 text-center border-b pb-2">
                                        {weekDays.map(d => (
                                            <div key={d} className="font-black text-[10px] uppercase tracking-widest text-[#C59D5F]">{d}</div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
                                        {daysInMonth.map(date => {
                                            const status = getDayStatus(date);
                                            const isSelected = selectedDate && isSameDay(date, selectedDate);
                                            const isPast = isBefore(date, startOfDay(new Date()));
                                            let style = {};
                                            let className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 mx-auto ";
                                            
                                            if (isSelected) {
                                                style = { backgroundColor: colors.accent, color: 'white', boxShadow: '0 2px 6px rgba(197, 157, 95, 0.4)' };
                                                className += "cursor-pointer transform scale-105";
                                            } else if (status === 'closed' || isPast) {
                                                style = { backgroundColor: '#F3F4F6', color: '#9CA3AF' };
                                                className += "cursor-not-allowed";
                                            } else if (status === 'event') {
                                                style = { backgroundColor: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' };
                                                className += "cursor-pointer hover:bg-[#E0E7FF]";
                                            } else {
                                                className += "bg-white text-gray-700 hover:bg-[#F9F9F9] hover:text-[#C59D5F] cursor-pointer border border-transparent hover:border-[#C59D5F]";
                                            }
                                            return (
                                                <div key={date.toString()} onClick={() => !isPast && status !== 'closed' && handleDateSelect(date)} className={className} style={style}>
                                                    {format(date, 'd')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col border-l pl-0 md:pl-8 border-gray-100">
                                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: colors.white, border: '1px solid #CCC' }}></div> Disponible</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div> Cerrado</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div> Completo</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-indigo-50 border border-indigo-100"></div> Evento</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded flex justify-center items-center text-white" style={{ backgroundColor: colors.accent }}></div> Seleccionado</div>
                                </div>
                                {!selectedDate && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-center p-8 border-2 border-dashed border-gray-100 rounded-lg">
                                        <Play className="w-12 h-12 mb-4 text-gray-200" />
                                        <p className="font-light italic">Seleccione un día en el calendario para ver disponibilidad.</p>
                                    </div>
                                )}
                                {selectedDate && timeSlots && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                            <span className="text-[#C59D5F]">Disponibilidad:</span> {format(selectedDate, "d 'de' MMMM", { locale: es })}
                                        </h3>

                                        {selectedEvent && (
                                            <div className="mb-6 p-4 bg-indigo-50 border-2 border-indigo-100 rounded-xl animate-in zoom-in duration-300">
                                                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                                                    <PartyPopper className="w-4 h-4" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Evento Especial</span>
                                                </div>
                                                <h4 className="font-bold text-base mb-1">{selectedEvent.name}</h4>
                                                <p className="text-xs text-gray-600 mb-3 line-clamp-2 italic">{selectedEvent.description}</p>
                                                <div className="flex justify-between items-center">
                                                    {selectedEvent._count.bookings >= selectedEvent.capacity ? (
                                                        <span className="text-sm font-bold text-rose-600 uppercase italic tracking-tighter">Evento Completo</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-lg font-black text-indigo-600 tracking-tighter">{selectedEvent.price}€</span>
                                                            <Button 
                                                                size="sm" 
                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase h-8 px-4"
                                                                onClick={() => handleTimeSelect(format(new Date(selectedEvent.date), 'HH:mm'))}
                                                            >
                                                                Reservar Evento
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mb-6">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b pb-1">Comida</h4>
                                            {timeSlots.lunch.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {timeSlots.lunch.map(t => (
                                                        <Button key={t} className="text-white text-sm py-2 h-auto font-bold tracking-wider hover:translate-y-[-2px] transition-transform shadow-sm" style={{ backgroundColor: colors.accent }} onClick={() => handleTimeSelect(t)}>{t}</Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic">No hay disponibilidad para comer.</p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b pb-1">Cena</h4>
                                            {timeSlots.dinner.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {timeSlots.dinner.map(t => (
                                                        <Button key={t} className="text-white text-sm py-2 h-auto font-bold tracking-wider hover:translate-y-[-2px] transition-transform shadow-sm" style={{ backgroundColor: colors.accent }} onClick={() => handleTimeSelect(t)}>{t}</Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic">No hay disponibilidad para cenar.</p>
                                            )}
                                        </div>

                                        {timeSlots.lunch.length === 0 && timeSlots.dinner.length === 0 && (
                                            <div className="mt-8 p-6 bg-amber-50 border-2 border-amber-100 rounded-2xl text-center">
                                                <Info className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                                                <h4 className="font-bold text-gray-800 mb-1">¡Vaya! No queda sitio</h4>
                                                <p className="text-xs text-gray-600 mb-4">Pero no te preocupes, puedes apuntarte a nuestra lista de espera y te avisaremos si se libera una mesa.</p>
                                                <Button 
                                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest text-xs h-12 rounded-xl shadow-lg shadow-amber-200"
                                                    onClick={() => setCurrentStep(5)}
                                                >
                                                    Apuntarse a la Lista de Espera
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: INFORMATION */}
                    {currentStep === 2 && selectedDate && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto">
                            <div className="bg-gray-50 p-4 border-l-4 border-[#C59D5F] mb-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>Resumen de Reserva</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-500 w-16 uppercase text-xs">Fecha</div>
                                        <div>{format(selectedDate, 'dd-MM-yyyy', { locale: es })}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-500 w-16 uppercase text-xs">Hora</div>
                                        <div>{selectedTime}h.</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-500 w-16 uppercase text-xs">Pax</div>
                                        <div>{pax} personas</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-500 w-16 uppercase text-xs">Lugar</div>
                                        <div>{restaurantName || 'Restaurante'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="grid gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nombre</label>
                                        <input className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white" placeholder="Nombre" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Primer Apellido</label>
                                        <input className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white" placeholder="Apellido" value={formData.surname} onChange={e => setFormData({ ...formData, surname: e.target.value })} />
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Segundo Apellido</label>
                                        <input className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white" placeholder="Opcional" value={additionalData.surname2} onChange={e => setAdditionalData({ ...additionalData, surname2: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Email</label>
                                    <input className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white" placeholder="ejemplo@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="grid gap-1 col-span-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Prefijo</label>
                                        <select className="border p-3 text-sm rounded-none bg-white focus:outline-none focus:border-[#C59D5F]">
                                            <option>🇪🇸 +34</option>
                                            <option>🇫🇷 +33</option>
                                            <option>🇬🇧 +44</option>
                                        </select>
                                    </div>
                                    <div className="grid gap-1 col-span-3">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Teléfono</label>
                                        <input className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white" placeholder="000 000 000" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">¿Alergias?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#C59D5F] w-4 h-4 cursor-pointer" checked={hasAllergy === true} onChange={() => setHasAllergy(true)} /><span className="text-sm">Sí</span></label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[#C59D5F] w-4 h-4 cursor-pointer" checked={hasAllergy === false} onChange={() => setHasAllergy(false)} /><span className="text-sm">No</span></label>
                                    </div>
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Introduce un comentario</label>
                                    <textarea className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white resize-none" rows={2} value={comment} onChange={e => setComment(e.target.value)}></textarea>
                                </div>
                                <div className="grid gap-2 mt-2">
                                    <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" className="accent-[#C59D5F] w-4 h-4 mt-0.5 cursor-pointer" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} /><span className="text-xs text-gray-600">Acepto condiciones</span></label>
                                    <label className="flex items-start gap-2 cursor-pointer"><input type="checkbox" className="accent-[#C59D5F] w-4 h-4 mt-0.5 cursor-pointer" checked={acceptData} onChange={e => setAcceptData(e.target.checked)} /><span className="text-xs text-gray-600">Consiento tratamiento</span></label>
                                </div>
                            </div>
                            <div className="mt-8">
                                <Button className="w-full py-4 text-base font-bold uppercase tracking-widest text-white hover:bg-black transition-colors shadow-lg" 
                                    style={{ backgroundColor: colors.accent, fontFamily: "'Oswald', sans-serif" }} 
                                    onClick={() => {
                                        if (isStep3Skipped) {
                                            handleSubmitReservation();
                                        } else {
                                            setCurrentStep(3);
                                        }
                                    }}>
                                    Continuar
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: ADDITIONAL / STRIPE */}
                    {currentStep === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto pt-6 pb-8">
                            <h3 className="text-xl font-bold mb-2 text-center" style={{ fontFamily: "'Oswald', sans-serif" }}>GARANTÍA DE RESERVA</h3>
                            <div className="text-left max-w-lg mx-auto space-y-5">
                                {widgetConfig?.showCrmFields !== false && (
                                    <div className="border-b border-gray-100 pb-4">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#C59D5F] mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>Datos opcionales</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="number" className="border p-2.5 text-sm rounded-none focus:outline-none" placeholder="Edad" value={additionalData.age} onChange={e => setAdditionalData({...additionalData, age: e.target.value})} />
                                            <select className="border p-2.5 text-sm rounded-none focus:outline-none" value={additionalData.gender} onChange={e => setAdditionalData({...additionalData, gender: e.target.value})}>
                                                <option value="">Sexo</option>
                                                <option value="M">M</option><option value="F">F</option>
                                            </select>
                                            <input className="border p-2.5 text-sm rounded-none focus:outline-none" placeholder="WhatsApp" value={additionalData.whatsapp} onChange={e => setAdditionalData({...additionalData, whatsapp: e.target.value})} />
                                            <input className="border p-2.5 text-sm rounded-none focus:outline-none" placeholder="Instagram" value={additionalData.instagram} onChange={e => setAdditionalData({...additionalData, instagram: e.target.value})} />
                                            <input className="border p-2.5 text-sm rounded-none focus:outline-none" placeholder="TikTok" value={additionalData.tiktok} onChange={e => setAdditionalData({...additionalData, tiktok: e.target.value})} />
                                            <input className="border p-2.5 text-sm rounded-none focus:outline-none" placeholder="Facebook" value={additionalData.facebook} onChange={e => setAdditionalData({...additionalData, facebook: e.target.value})} />
                                        </div>
                                    </div>
                                )}

                                {/* Stripe Form */}
                                <div className="mt-6">
                                    {stripeRequired ? (
                                        <WidgetCardForm
                                            onSuccess={(pmId) => handleSubmitReservation(pmId)}
                                            submitting={submitting}
                                            colors={colors}
                                            amount={widgetConfig?.noShowFeeAmount || 20}
                                        />
                                    ) : (
                                        <div className="p-4 bg-gray-50 text-center italic text-sm text-gray-500">
                                            No se requiere garantía con tarjeta para esta reserva.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 max-w-lg mx-auto">
                                <Button
                                    className="w-full py-4 text-base font-bold uppercase tracking-widest text-white hover:bg-black transition-colors shadow-lg"
                                    style={{ backgroundColor: colors.accent, fontFamily: "'Oswald', sans-serif" }}
                                    onClick={handleMainSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? 'PROCESANDO...' : 'RESERVAR AHORA'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMATION */}
                    {currentStep === 4 && (
                        <div className="animate-in fade-in zoom-in duration-500 h-full pt-4 text-center">
                            <div className="flex flex-col items-center justify-center pb-8 border-b border-gray-100 mb-8">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-6 ${createdBooking?.isWaitlist ? 'bg-amber-500' : 'bg-[#C59D5F]'}`}>
                                    {createdBooking?.isWaitlist ? <Clock className="w-10 h-10 text-white" /> : <Check className="w-10 h-10 text-white" strokeWidth={4} />}
                                </div>
                                <h2 className="text-3xl font-bold uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                    {createdBooking?.isWaitlist ? 'Lista de Espera' : 'Reserva Confirmada'}
                                </h2>
                            </div>
                            <div className="max-w-md mx-auto space-y-3 mb-8">
                                <p className="text-lg font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                    {selectedDate ? format(selectedDate, 'dd-MM-yyyy') : ''}
                                    {!createdBooking?.isWaitlist && `, ${selectedTime}h`}
                                </p>
                                <p>
                                    {createdBooking?.isWaitlist 
                                        ? `Te avisaremos si se libera una mesa para ${pax} personas.`
                                        : `${pax} personas en ${restaurantName}.`
                                    }
                                </p>
                            </div>
                            <Button className="px-8 py-3 bg-black text-white font-bold uppercase tracking-wider text-xs rounded-none" onClick={() => window.location.reload()}>Volver al Inicio</Button>
                        </div>
                    )}

                    {/* STEP 5: WAITLIST FORM */}
                    {currentStep === 5 && selectedDate && (
                        <div className="animate-in fade-in zoom-in duration-500 max-w-xl mx-auto py-4">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold uppercase tracking-wide mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Lista de Espera</h3>
                                <p className="text-sm text-gray-500">Para el {format(selectedDate, "d 'de' MMMM", { locale: es })} · {pax} personas</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Nombre</label>
                                        <input 
                                            className="w-full border p-3 rounded focus:ring-1 focus:ring-amber-500 outline-none"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-gray-400">Email</label>
                                        <input 
                                            className="w-full border p-3 rounded focus:ring-1 focus:ring-amber-500 outline-none"
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400">Teléfono</label>
                                    <input 
                                        className="w-full border p-3 rounded focus:ring-1 focus:ring-amber-500 outline-none"
                                        placeholder="+34 000 000 000"
                                        value={formData.prefix + formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value.replace(formData.prefix, '')})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-gray-400">Notas / Alergias</label>
                                    <textarea 
                                        className="w-full border p-3 rounded focus:ring-1 focus:ring-amber-500 outline-none h-24 resize-none"
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Button 
                                    className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest text-sm rounded shadow-lg"
                                    onClick={handleJoinWaitlist}
                                    disabled={submitting}
                                >
                                    {submitting ? 'APUNTANDO...' : 'CONFIRMAR DISPONIBILIDAD'}
                                </Button>
                                <Button 
                                    variant="ghost"
                                    className="w-full text-gray-400 hover:text-gray-600 font-bold uppercase text-[10px] tracking-widest"
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
    );
}
