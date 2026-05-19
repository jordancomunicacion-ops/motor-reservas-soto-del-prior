"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

function WidgetContent() {
    const searchParams = useSearchParams();
    const hotelId = searchParams.get('hotelId') || "DEMO-HOTEL-ID";

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [styles, setStyles] = useState({ primary: '#C59D5F', css: '' });

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
            if (res) {
                setConfig(res);
                const primary = res.primaryColor && res.primaryColor !== '#3b82f6' ? res.primaryColor : '#C59D5F';
                setStyles({ primary, css: res.customCss || '' });
            }
        }).catch(() => { /* defaults */ });
    }, [hotelId]);

    useEffect(() => {
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Oswald:wght@300;400;500;700&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);
        return () => { if (document.head.contains(link)) document.head.removeChild(link); };
    }, []);

    useEffect(() => {
        if (styles.css) {
            const style = document.createElement('style');
            style.innerHTML = styles.css;
            document.head.appendChild(style);
            return () => { if (document.head.contains(style)) document.head.removeChild(style); };
        }
    }, [styles.css]);

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

    return (
        <>
            <link rel="stylesheet" href="/custom-widget.css" />
            <div
                className="widget-container min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 text-[#0A0A0A]"
                style={{ ['--primary' as string]: styles.primary, fontFamily: "'Lato', sans-serif" } as React.CSSProperties}
            >
                <Card className="w-full max-w-lg shadow-xl overflow-hidden border-none rounded-none">

                    <CardContent className="p-6">
                        {/* STEP 1: SEARCH */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Entrada</label>
                                        <input type="date" className="w-full border p-3 rounded-none focus:outline-none focus:border-[#C59D5F] bg-white text-sm" value={dates.from} onChange={e => setDates({ ...dates, from: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Salida</label>
                                        <input type="date" className="w-full border p-3 rounded-none focus:outline-none focus:border-[#C59D5F] bg-white text-sm" value={dates.to} onChange={e => setDates({ ...dates, to: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Huéspedes</label>
                                    <select className="w-full border p-3 rounded-none focus:outline-none focus:border-[#C59D5F] bg-white text-sm" value={pax} onChange={e => setPax(+e.target.value)}>
                                        <option value="1">1 Adulto</option>
                                        <option value="2">2 Adultos</option>
                                        <option value="3">3 Adultos</option>
                                        <option value="4">4 Adultos</option>
                                    </select>
                                </div>
                                <Button
                                    className="w-full py-6 rounded-none font-bold text-base uppercase tracking-widest text-white shadow-lg hover:bg-black transition-colors"
                                    style={{ backgroundColor: styles.primary, fontFamily: "'Oswald', sans-serif" }}
                                    onClick={handleSearch}
                                    disabled={loading}
                                >
                                    {loading ? 'Buscando...' : 'Ver Disponibilidad'}
                                </Button>
                            </div>
                        )}

                        {/* STEP 2: SELECT ROOM */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-xl uppercase tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>Selecciona Habitación</h3>
                                    <button onClick={() => setStep(1)} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 underline bg-transparent">Cambiar fechas</button>
                                </div>

                                <div className="space-y-3">
                                    {results.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic text-center py-8">Sin disponibilidad para esas fechas.</p>
                                    ) : results.map(r => (
                                        <div
                                            key={r.id}
                                            className="border p-4 rounded-none cursor-pointer hover:border-[#C59D5F] hover:bg-[#C59D5F]/5 transition-all group"
                                            onClick={() => { setSelectedRoom(r); setStep(3); }}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-lg group-hover:text-[#C59D5F] transition-colors" style={{ fontFamily: "'Oswald', sans-serif" }}>{r.name}</span>
                                                    {r.description && <p className="text-sm text-gray-400 mt-1">{r.description}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-black text-xl tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>€{r.totalPrice}</span>
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">Total Estancia</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: EXTRAS / SYNERGY */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-xl uppercase tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>Personaliza tu estancia</h3>
                                    <button onClick={() => setStep(2)} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 underline bg-transparent">Atrás</button>
                                </div>

                                <div className="space-y-4">
                                    {/* Breakfast */}
                                    <div
                                        className={`p-4 border rounded-none transition-all cursor-pointer ${meals.breakfast ? 'border-[#C59D5F] bg-[#C59D5F]/5' : 'border-gray-100'}`}
                                        onClick={() => setMeals({ ...meals, breakfast: !meals.breakfast })}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-gray-300">
                                                    {meals.breakfast && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: styles.primary }}></div>}
                                                </div>
                                                <div>
                                                    <span className="font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>Desayuno Buffet</span>
                                                    <p className="text-xs text-gray-400">Soto del Prior · sin horario fijo</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-sm" style={{ color: styles.primary }}>+€12/día</span>
                                        </div>
                                    </div>

                                    {/* Lunch */}
                                    {config?.restaurantId && (
                                        <div className={`p-4 border rounded-none transition-all ${meals.lunch ? 'border-[#C59D5F] bg-[#C59D5F]/5' : 'border-gray-100'}`}>
                                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setMeals({ ...meals, lunch: !meals.lunch })}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-gray-300">
                                                        {meals.lunch && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: styles.primary }}></div>}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>Comida</span>
                                                        <p className="text-xs text-gray-400">Turnos de mediodía</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: styles.primary }}>Cita Previa</span>
                                            </div>
                                            {meals.lunch && (
                                                <div className="mt-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Horario Comida</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {lunchSlots.length === 0 ? (
                                                            <p className="text-xs text-gray-400 italic col-span-4">Sin disponibilidad.</p>
                                                        ) : lunchSlots.map(slot => (
                                                            <button
                                                                key={slot}
                                                                className="p-2 text-xs font-bold rounded-none transition-all border tabular-nums"
                                                                style={lunchTime === slot
                                                                    ? { backgroundColor: styles.primary, color: 'white', borderColor: styles.primary }
                                                                    : { backgroundColor: 'white', color: '#0A0A0A', borderColor: '#E5E7EB' }
                                                                }
                                                                onClick={() => setLunchTime(slot)}
                                                            >
                                                                {slot}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Dinner */}
                                    {config?.restaurantId && (
                                        <div className={`p-4 border rounded-none transition-all ${meals.dinner ? 'border-[#C59D5F] bg-[#C59D5F]/5' : 'border-gray-100'}`}>
                                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setMeals({ ...meals, dinner: !meals.dinner })}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-gray-300">
                                                        {meals.dinner && <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: styles.primary }}></div>}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>Cena</span>
                                                        <p className="text-xs text-gray-400">Turnos de noche</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: styles.primary }}>Cita Previa</span>
                                            </div>

                                            {meals.dinner && (
                                                <div className="mt-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>Horario Cena</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {dinnerSlots.length === 0 ? (
                                                            <p className="text-xs text-gray-400 italic col-span-4">Sin disponibilidad.</p>
                                                        ) : dinnerSlots.map(slot => (
                                                            <button
                                                                key={slot}
                                                                className="p-2 text-xs font-bold rounded-none transition-all border tabular-nums"
                                                                style={dinnerTime === slot
                                                                    ? { backgroundColor: styles.primary, color: 'white', borderColor: styles.primary }
                                                                    : { backgroundColor: 'white', color: '#0A0A0A', borderColor: '#E5E7EB' }
                                                                }
                                                                onClick={() => setDinnerTime(slot)}
                                                            >
                                                                {slot}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    className="w-full py-6 rounded-none font-bold text-base uppercase tracking-widest text-white shadow-lg hover:bg-black transition-colors"
                                    style={{ backgroundColor: styles.primary, fontFamily: "'Oswald', sans-serif" }}
                                    onClick={() => setStep(4)}
                                    disabled={(meals.lunch && !lunchTime) || (meals.dinner && !dinnerTime)}
                                >
                                    Continuar
                                </Button>
                            </div>
                        )}

                        {/* STEP 4: GUEST INFO */}
                        {step === 4 && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-xl uppercase tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif" }}>Datos del Huésped</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Nombre Completo</label>
                                        <input type="text" className="w-full border p-3 rounded-none focus:outline-none focus:border-[#C59D5F] bg-white text-sm" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Email</label>
                                        <input type="email" className="w-full border p-3 rounded-none focus:outline-none focus:border-[#C59D5F] bg-white text-sm" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ fontFamily: "'Oswald', sans-serif" }}>Teléfono</label>
                                        <input type="tel" className="w-full border p-3 rounded-none focus:outline-none focus:border-[#C59D5F] bg-white text-sm" value={guest.phone} onChange={e => setGuest({ ...guest, phone: e.target.value })} placeholder="+34 600 000 000" />
                                    </div>
                                </div>
                                <Button
                                    className="w-full py-6 rounded-none font-bold text-base uppercase tracking-widest text-white shadow-lg hover:bg-black transition-colors"
                                    style={{ backgroundColor: styles.primary, fontFamily: "'Oswald', sans-serif" }}
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
                                    {submitting ? 'Procesando...' : `Confirmar Reserva · €${(selectedRoom?.totalPrice ?? 0) + (meals.breakfast ? 12 * 4 : 0)}`}
                                </Button>
                                <button onClick={() => setStep(3)} className="w-full text-center text-[10px] uppercase tracking-widest text-gray-500 mt-2 bg-transparent">Revisar extras</button>
                            </div>
                        )}

                        {/* STEP 5: SUCCESS */}
                        {step === 5 && (
                            <div className="space-y-6 text-center py-8">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg" style={{ backgroundColor: styles.primary }}>
                                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="font-bold text-2xl uppercase tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>¡Reserva Confirmada!</h3>
                                <p className="text-sm text-gray-500">Ref: <span className="font-mono text-[#0A0A0A]">{bookingResult?.referenceCode || 'N/A'}</span></p>
                                <div className="bg-gray-50 p-4 text-sm text-left space-y-1.5 border-l-4" style={{ borderColor: styles.primary }}>
                                    <p><strong className="font-bold text-gray-500 uppercase text-[10px] tracking-widest mr-2">Huésped</strong>{guest.name}</p>
                                    <p><strong className="font-bold text-gray-500 uppercase text-[10px] tracking-widest mr-2">Check-in</strong>{dates.from}</p>
                                    <p><strong className="font-bold text-gray-500 uppercase text-[10px] tracking-widest mr-2">Check-out</strong>{dates.to}</p>
                                    <p><strong className="font-bold text-gray-500 uppercase text-[10px] tracking-widest mr-2">Habitación</strong>{selectedRoom?.name}</p>
                                    <p><strong className="font-bold text-gray-500 uppercase text-[10px] tracking-widest mr-2">Total</strong>€{bookingResult?.totalPrice || selectedRoom?.totalPrice}</p>
                                </div>
                                <p className="text-xs text-gray-400 italic">Recibirás un email de confirmación en breve.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export default function WidgetPage() {
    return (
        <Suspense fallback={<div className="min-h-screen grid place-items-center bg-white text-xs uppercase tracking-widest text-gray-400">Cargando…</div>}>
            <WidgetContent />
        </Suspense>
    );
}
