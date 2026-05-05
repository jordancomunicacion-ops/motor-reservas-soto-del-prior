"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

function WidgetContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hotelId = searchParams.get('hotelId') || "DEMO-HOTEL-ID";

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Custom Styles
    const [styles, setStyles] = useState({ primary: '#3b82f6', css: '' });

    useEffect(() => {
        // Load Config
        fetchAPI(`/config/${hotelId}`).then(res => {
            if (res && res.primaryColor) setStyles({ primary: res.primaryColor, css: res.customCss || '' });
        }).catch(err => console.log('Using default styles'));
    }, [hotelId]);

    // Inject CSS
    useEffect(() => {
        if (styles.css) {
            const style = document.createElement('style');
            style.innerHTML = styles.css;
            document.head.appendChild(style);
            return () => { document.head.removeChild(style); }
        }
    }, [styles.css]);

    // Search State
    const [dates, setDates] = useState({ from: '2024-06-01', to: '2024-06-05' });
    const [pax, setPax] = useState(2);

    // Results
    const [results, setResults] = useState<any[]>([]);

    // Booking State
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [guest, setGuest] = useState({ name: '', email: '' });
    const [config, setConfig] = useState<any>(null);

    // Synergy State
    const [meals, setMeals] = useState({ breakfast: false, lunch: false, dinner: false });
    const [lunchTime, setLunchTime] = useState("");
    const [dinnerTime, setDinnerTime] = useState("");
    const [lunchSlots, setLunchSlots] = useState<string[]>([]);
    const [dinnerSlots, setDinnerSlots] = useState<string[]>([]);

    useEffect(() => {
        // Load Config
        fetchAPI(`/config/${hotelId}`).then(res => {
            setConfig(res);
            if (res && res.primaryColor) setStyles({ primary: res.primaryColor, css: res.customCss || '' });
        }).catch(err => console.log('Using default styles'));
    }, [hotelId]);

    useEffect(() => {
        if (meals.lunch && config?.restaurantId) {
            fetchAPI(`/restaurant/${config.restaurantId}/slots?date=${dates.from}&pax=${pax}&type=LUNCH`)
                .then(setLunchSlots)
                .catch(() => setLunchSlots(["13:30", "14:00", "14:30"]));
        }
    }, [meals.lunch, config?.restaurantId, dates.from, pax]);

    useEffect(() => {
        if (meals.dinner && config?.restaurantId) {
            fetchAPI(`/restaurant/${config.restaurantId}/slots?date=${dates.from}&pax=${pax}&type=DINNER`)
                .then(setDinnerSlots)
                .catch(() => setDinnerSlots(["20:30", "21:00", "21:30"]));
        }
    }, [meals.dinner, config?.restaurantId, dates.from, pax]);


    async function handleSearch() {
        setLoading(true);
        try {
            const res = await fetchAPI(`/bookings/availability?hotelId=${hotelId}&from=${dates.from}&to=${dates.to}&pax=${pax}`);
            if (!Array.isArray(res)) throw new Error('API Error');
            setResults(res);
            setStep(2);
        } catch (e) {
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
            <div className="widget-container" style={{ '--primary': styles.primary } as any}>
                <Card className="w-full max-w-lg shadow-xl overflow-hidden border-none">
                    <CardHeader className="bg-primary text-white py-4" style={{ backgroundColor: styles.primary }}>
                        <CardTitle className="text-lg flex justify-between items-center">
                            <span>Reserva tu estancia</span>
                            <span className="text-xs opacity-70">Paso {step} de 4</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {/* STEP 1: SEARCH */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase opacity-60">Entrada</label>
                                        <input type="date" className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-primary outline-none transition-all" value={dates.from} onChange={e => setDates({ ...dates, from: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase opacity-60">Salida</label>
                                        <input type="date" className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-primary outline-none transition-all" value={dates.to} onChange={e => setDates({ ...dates, to: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase opacity-60">Huéspedes</label>
                                    <select className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-primary outline-none transition-all appearance-none" value={pax} onChange={e => setPax(+e.target.value)}>
                                        <option value="1">1 Adulto</option>
                                        <option value="2">2 Adultos</option>
                                        <option value="3">3 Adultos</option>
                                        <option value="4">4 Adultos</option>
                                    </select>
                                </div>
                                <Button className="w-full py-6 rounded-xl font-bold text-lg shadow-lg hover:translate-y-[-2px] transition-all" style={{ backgroundColor: styles.primary }} onClick={handleSearch} disabled={loading}>
                                    {loading ? 'Buscando...' : 'Ver Disponibilidad'}
                                </Button>
                            </div>
                        )}

                        {/* STEP 2: SELECT ROOM */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-xl">Selecciona Habitación</h3>
                                    <button onClick={() => setStep(1)} className="text-xs text-muted-foreground underline">Cambiar fechas</button>
                                </div>

                                <div className="space-y-3">
                                    {results.map(r => (
                                        <div key={r.id} className="border-2 border-gray-50 p-4 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group" 
                                             onClick={() => { setSelectedRoom(r); setStep(3); }}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-lg group-hover:text-primary transition-colors">{r.name}</span>
                                                    <p className="text-sm text-gray-400 mt-1">{r.description}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-black text-xl">€{r.totalPrice}</span>
                                                    <span className="text-[10px] uppercase font-bold opacity-50">Total Estancia</span>
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
                                    <h3 className="font-bold text-xl">Personaliza tu estancia</h3>
                                    <button onClick={() => setStep(2)} className="text-xs text-muted-foreground underline">Atrás</button>
                                </div>

                                <div className="space-y-4">
                                    {/* Breakfast */}
                                    <div className={`p-4 border-2 rounded-2xl transition-all cursor-pointer ${meals.breakfast ? 'border-primary bg-primary/5' : 'border-gray-50'}`}
                                         onClick={() => setMeals({...meals, breakfast: !meals.breakfast})}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-gray-300">
                                                    {meals.breakfast && <div className="w-3 h-3 bg-primary rounded-sm" style={{ backgroundColor: styles.primary }}></div>}
                                                </div>
                                                <div>
                                                    <span className="font-bold">Desayuno Buffet</span>
                                                    <p className="text-xs text-muted-foreground">Soto del Prior (Sin horario fijo)</p>
                                                </div>
                                            </div>
                                            <span className="font-bold text-sm text-primary">+€12/día</span>
                                        </div>
                                    </div>

                                    {/* Lunch */}
                                    {config?.restaurantId && (
                                        <div className={`p-4 border-2 rounded-2xl transition-all ${meals.lunch ? 'border-primary bg-primary/5' : 'border-gray-50'}`}>
                                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setMeals({...meals, lunch: !meals.lunch})}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-gray-300">
                                                        {meals.lunch && <div className="w-3 h-3 bg-primary rounded-sm" style={{ backgroundColor: styles.primary }}></div>}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold">Comida</span>
                                                        <p className="text-xs text-muted-foreground">Turnos de mediodía</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-sm text-primary">Cita Previa</span>
                                            </div>
                                            {meals.lunch && (
                                                <div className="mt-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-xs font-bold uppercase opacity-60 block mb-2">Horario Comida</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {lunchSlots.map(slot => (
                                                            <button 
                                                                key={slot}
                                                                className={`p-2 text-xs font-bold rounded-lg transition-all ${lunchTime === slot ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}
                                                                style={lunchTime === slot ? { backgroundColor: styles.primary } : {}}
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
                                        <div className={`p-4 border-2 rounded-2xl transition-all ${meals.dinner ? 'border-primary bg-primary/5' : 'border-gray-50'}`}>
                                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setMeals({...meals, dinner: !meals.dinner})}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 rounded flex items-center justify-center border-gray-300">
                                                        {meals.dinner && <div className="w-3 h-3 bg-primary rounded-sm" style={{ backgroundColor: styles.primary }}></div>}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold">Cena</span>
                                                        <p className="text-xs text-muted-foreground">Turnos de noche</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-sm text-primary">Cita Previa</span>
                                            </div>

                                            {meals.dinner && (
                                                <div className="mt-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <label className="text-xs font-bold uppercase opacity-60 block mb-2">Horario Cena</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {dinnerSlots.map(slot => (
                                                            <button 
                                                                key={slot}
                                                                className={`p-2 text-xs font-bold rounded-lg transition-all ${dinnerTime === slot ? 'bg-primary text-white' : 'bg-white border hover:bg-gray-50'}`}
                                                                style={dinnerTime === slot ? { backgroundColor: styles.primary } : {}}
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

                                <Button className="w-full py-6 rounded-xl font-bold text-lg shadow-lg" 
                                        style={{ backgroundColor: styles.primary }}
                                        onClick={() => setStep(4)}
                                        disabled={(meals.lunch && !lunchTime) || (meals.dinner && !dinnerTime)}>
                                    Continuar al Pago
                                </Button>

                            </div>
                        )}

                        {/* STEP 4: GUEST INFO */}
                        {step === 4 && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-xl">Datos del Huésped</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase opacity-60">Nombre Completo</label>
                                        <input type="text" className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-primary outline-none" value={guest.name} onChange={e => setGuest({ ...guest, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase opacity-60">Email</label>
                                        <input type="email" className="w-full border-2 border-gray-100 p-3 rounded-xl focus:border-primary outline-none" value={guest.email} onChange={e => setGuest({ ...guest, email: e.target.value })} />
                                    </div>
                                </div>
                                <Button className="w-full py-6 rounded-xl font-bold text-lg shadow-lg" style={{ backgroundColor: styles.primary }} onClick={() => alert('¡Reserva confirmada con éxito!')}>
                                    Confirmar y Pagar €{selectedRoom?.totalPrice + (meals.breakfast ? 12 * 4 : 0)}
                                </Button>
                                <button onClick={() => setStep(3)} className="w-full text-center text-xs text-muted-foreground mt-2">Revisar extras</button>
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
        <Suspense fallback={<div>Loading widget...</div>}>
            <WidgetContent />
        </Suspense>
    );
}
