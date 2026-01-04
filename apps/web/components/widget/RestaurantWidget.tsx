"use client";
import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Play, Check, Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// ... (existing code) ...



// Types
type Step = {
    id: number;
    label: string;
};

const STEPS: Step[] = [
    { id: 1, label: 'Encontrar' },
    { id: 2, label: 'Información' },
    { id: 3, label: 'Adicional' },
    { id: 4, label: 'Confirmación' }
];

export function RestaurantWidget() {
    const [currentStep, setCurrentStep] = useState(1);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [timeSlots, setTimeSlots] = useState<{ lunch: string[], dinner: string[] } | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', surname: '', email: '', phone: '', prefix: '+34' });

    // Inject Fonts
    useEffect(() => {
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Oswald:wght@300;400;500;700&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);
        return () => { document.head.removeChild(link); }
    }, []);

    // Mock availability data for demo
    // 0: Closed, 1: Available, 2: Full
    const getDayStatus = (date: Date) => {
        const day = date.getDate();
        if (day % 7 === 0) return 'closed'; // Sundays closed
        if (day === 8) return 'full'; // Mock full day
        return 'available';
    };

    const handleDateSelect = (date: Date) => {
        const status = getDayStatus(date);
        if (status !== 'available') return;
        setSelectedDate(date);

        // Mock Time Slots Logic
        // In real app, fetch from API based on date
        setTimeSlots({
            lunch: ['13:30', '13:45', '14:00', '14:15', '14:30', '15:00'],
            dinner: [] // Mock closed for dinner as per example
        });
        setSelectedTime(null);
    };

    const handleTimeSelect = (time: string) => {
        setSelectedTime(time);
        setCurrentStep(2);
    };

    // Calendar Generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Add padding days for start of month
    const startDay = monthStart.getDay(); // 0 (Sun) - 6 (Sat)
    // Adjust for Monday start (Spain) -> Mon=0, Sun=6
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
    const paddingDays = Array(adjustedStartDay).fill(null);

    const weekDays = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];

    // Design Tokens from WEB SOTOdelPRIOR
    const colors = {
        accent: '#C59D5F', // Gold
        bg: '#F4F4F4',
        text: '#0A0A0A',
        white: '#FFFFFF'
    };

    return (
        <div className="max-w-4xl mx-auto px-4 pb-4 pt-0 text-[#0A0A0A] bg-white" style={{ fontFamily: "'Lato', sans-serif" }}>

            {/* Header / Back Button */}
            {currentStep > 1 && (
                <div className="flex justify-between items-center mb-4 px-1">
                    <button
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:text-[#C59D5F] transition-colors"
                        style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                        {'<'} VOLVER
                    </button>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">SOTO DEL PRIOR</h2>
                </div>
            )}

            {/* Stepper */}
            <div className="flex relative justify-between items-center mb-0 px-8 max-w-2xl mx-auto">
                {/* Connector Line */}
                <div className="absolute top-4 left-10 right-10 h-0.5 bg-gray-200 -z-10">
                    <div
                        className="h-full bg-[#0A0A0A] transition-all duration-500"
                        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                    ></div>
                </div>

                {STEPS.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

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
                                {isCompleted ? <Check className="w-4 h-4" /> : step.id}
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

            <Card className="rounded-none overflow-hidden min-h-[450px]">
                <CardContent className="p-4 pt-0 bg-white">

                    {/* STEP 1: FIND (Calendar + Times) */}
                    {currentStep === 1 && (
                        <div className="grid grid-cols-2 gap-4 h-full">

                            {/* LEFT COL: CALENDAR */}
                            <div className="flex flex-col">

                                <div className="max-w-[280px] mx-auto w-full">
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
                                                className += "bg-gray-100 text-gray-300 cursor-not-allowed";
                                            } else if (status === 'full') {
                                                className += "bg-white border text-gray-800 cursor-not-allowed";
                                                style = { borderColor: 'red' };
                                            } else {
                                                className += "bg-white text-gray-700 hover:bg-[#F9F9F9] hover:text-[#C59D5F] cursor-pointer border border-transparent hover:border-[#C59D5F]";
                                            }

                                            return (
                                                <div
                                                    key={date.toString()}
                                                    onClick={() => !isPast && handleDateSelect(date)}
                                                    className={className}
                                                    style={style}
                                                >
                                                    {format(date, 'd')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COL: LEGEND AND SLOTS */}
                            <div className="flex flex-col border-l pl-0 md:pl-8 border-gray-100">
                                {/* Legend */}
                                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-[10px] uppercase font-bold tracking-wider text-gray-500">
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: colors.white, border: '1px solid #CCC' }}></div> Disponible</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-200"></div> Cerrado</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded flex justify-center items-center text-white" style={{ backgroundColor: colors.accent }}></div> Seleccionado</div>
                                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-red-500"></div> Completo</div>
                                </div>

                                {/* Divider or Info if no date */}
                                {!selectedDate && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-center p-8 border-2 border-dashed border-gray-100 rounded-lg">
                                        <Play className="w-12 h-12 mb-4 text-gray-200" />
                                        <p className="font-light italic">Seleccione un día en el calendario para ver disponibilidad.</p>
                                    </div>
                                )}

                                {/* Time Slots */}
                                {selectedDate && timeSlots && (
                                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                            <span className="text-[#C59D5F]">Disponibilidad:</span> {format(selectedDate, "d 'de' MMMM", { locale: es })}
                                        </h3>

                                        {/* Lunch */}
                                        <div className="mb-6">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b pb-1">Comida</h4>
                                            <div className="grid grid-cols-3 gap-2">
                                                {timeSlots.lunch.map(t => (
                                                    <Button
                                                        key={t}
                                                        className="text-white text-sm py-2 h-auto font-bold tracking-wider hover:translate-y-[-2px] transition-transform shadow-sm"
                                                        style={{ backgroundColor: colors.accent }}
                                                        onClick={() => handleTimeSelect(t)}
                                                    >
                                                        {t}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Dinner */}
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 border-b pb-1">Cena</h4>
                                            {timeSlots.dinner.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {timeSlots.dinner.map(t => (
                                                        <Button
                                                            key={t}
                                                            className="text-white text-sm py-2 h-auto font-bold tracking-wider hover:translate-y-[-2px] transition-transform shadow-sm"
                                                            style={{ backgroundColor: colors.accent }}
                                                            onClick={() => handleTimeSelect(t)}
                                                        >
                                                            {t}
                                                        </Button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic font-light bg-gray-50 p-2 text-center rounded">
                                                    Restaurante cerrado para cenas.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: INFORMATION */}
                    {currentStep === 2 && selectedDate && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto">
                            {/* Summary Box */}
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
                                        <div>2 personas</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-gray-500 w-16 uppercase text-xs">Lugar</div>
                                        <div>SOTO del PRIOR</div>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nombre</label>
                                        <input
                                            className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white"
                                            placeholder="Nombre"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Apellidos</label>
                                        <input
                                            className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white"
                                            placeholder="Apellidos"
                                            value={formData.surname}
                                            onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Email</label>
                                    <input
                                        className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white"
                                        placeholder="ejemplo@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-4 gap-4">
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
                                        <input
                                            className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white"
                                            placeholder="000 000 000"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="grid gap-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Introduce un comentario sobre la reserva</label>
                                    <textarea
                                        className="border p-3 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white resize-none"
                                        rows={2}
                                    ></textarea>
                                </div>

                                {/* Allergies */}
                                <div className="grid gap-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">¿Tiene algún comensal alguna intolerancia/alergia?</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="accent-[#C59D5F] w-4 h-4 cursor-pointer" />
                                            <span className="text-sm">Sí</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" className="accent-[#C59D5F] w-4 h-4 cursor-pointer" />
                                            <span className="text-sm">No</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Legal Checks */}
                                <div className="grid gap-2 mt-2">
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input type="checkbox" className="accent-[#C59D5F] w-4 h-4 mt-0.5 cursor-pointer" />
                                        <span className="text-xs text-gray-600">Acepto las condiciones de uso, política de privacidad y aviso legal</span>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input type="checkbox" className="accent-[#C59D5F] w-4 h-4 mt-0.5 cursor-pointer" />
                                        <span className="text-xs text-gray-600">Consiento el tratamiento de datos personales</span>
                                    </label>
                                    <label className="flex items-start gap-2 cursor-pointer">
                                        <input type="checkbox" className="accent-[#C59D5F] w-4 h-4 mt-0.5 cursor-pointer" />
                                        <span className="text-xs text-gray-600">Consiento la recepción de comunicaciones del restaurante por e-mail y/o SMS con fines comerciales</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8">
                                <Button
                                    className="w-full py-4 text-base font-bold uppercase tracking-widest text-white hover:bg-black transition-colors shadow-lg"
                                    style={{ backgroundColor: colors.accent, fontFamily: "'Oswald', sans-serif" }}
                                    onClick={() => setCurrentStep(3)}
                                >
                                    Continuar a la Confirmación
                                </Button>
                            </div>

                            {/* Legal Footer */}
                            <div className="mt-8 pt-4 border-t border-gray-100 text-[10px] text-gray-400 leading-relaxed">
                                <p className="font-bold mb-1">Información básica sobre protección de datos de carácter personal</p>
                                <p className="mb-2">En cumplimiento del Reglamento General de Protección de Datos de Carácter Personal, se informa al interesado de lo siguiente:</p>
                                <ul className="list-none space-y-1">
                                    <li><span className="font-bold">Responsable:</span> SOTO DEL PRIOR S.L.</li>
                                    <li><span className="font-bold">Finalidad:</span> La prestación de servicios y la gestión de la relación comercial. Gestión de duplicidades con otros restaurantes.</li>
                                    <li><span className="font-bold">Legitimación:</span> Consentimiento del interesado. Ejecución de un contrato en el que el interesado es parte.</li>
                                    <li><span className="font-bold">Destinatarios:</span> Comunicación a restaurantes afectados en caso de duplicidad de reservas. Se podrán realizar cesiones de datos para fines estadísticos.</li>
                                    <li><span className="font-bold">Derechos:</span> Acceso, Rectificación, Supresión, Limitación del Tratamiento, Portabilidad y Oposición.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: ADDITIONAL */}
                    {currentStep === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto text-center pt-8">

                            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: "'Oswald', sans-serif" }}>INFORMACIÓN ADICIONAL</h3>

                            <p className="text-sm text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
                                Por favor, responda a las siguientes preguntas para mejorar su experiencia en nuestro restaurante:
                            </p>

                            <div className="text-left max-w-md mx-auto mb-8">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 block">
                                    ¿Tienes algún bono? (escriba aquí su número de bono) (en caso de no tener bono pulse en reservar)
                                </label>
                                <textarea
                                    className="w-full border p-4 text-sm rounded-none focus:outline-none focus:border-[#C59D5F] transition-colors bg-white resize-none"
                                    rows={4}
                                    placeholder="Ej: BONO-REGALO-2024..."
                                ></textarea>
                            </div>

                            <div className="mt-8 max-w-md mx-auto">
                                <Button
                                    className="w-full py-4 text-base font-bold uppercase tracking-widest text-white hover:bg-black transition-colors shadow-lg"
                                    style={{ backgroundColor: colors.accent, fontFamily: "'Oswald', sans-serif" }}
                                    onClick={() => setCurrentStep(4)}
                                >
                                    RESERVAR
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMATION */}
                    {currentStep === 4 && (
                        <div className="animate-in fade-in zoom-in duration-500 h-full pt-4">

                            {/* Success Status */}
                            <div className="flex flex-col items-center justify-center pb-8 border-b border-gray-100 mb-8">
                                <div className="w-24 h-24 rounded-full bg-[#fcebbe] flex items-center justify-center mb-6">
                                    <div className="w-16 h-16 rounded-full bg-[#C59D5F] flex items-center justify-center shadow-lg">
                                        <Check className="w-10 h-10 text-white" strokeWidth={4} />
                                    </div>
                                </div>
                                <h2 className="text-3xl font-bold uppercase tracking-wide text-[#0A0A0A]" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                    Reserva Confirmada
                                </h2>
                            </div>

                            {/* Details */}
                            <div className="max-w-md mx-auto space-y-3 mb-8 pl-4">
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Calendar className="w-5 h-5 text-[#C59D5F]" />
                                    <span className="text-lg font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                        {selectedDate ? format(selectedDate, 'dd-MM-yyyy', { locale: es }) : ''}, {selectedTime}h.
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <Users className="w-5 h-5 text-[#C59D5F]" />
                                    <span className="text-lg font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                        2 personas.
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-700">
                                    <MapPin className="w-5 h-5 text-[#C59D5F]" />
                                    <span className="text-md">
                                        Finca Soto del Prior, Navarra. <a href="#" className="text-[#C59D5F] underline ml-1">¿Cómo llegar?</a>
                                    </span>
                                </div>
                            </div>

                            {/* Personal Info & Footer */}
                            <div className="border-t border-gray-100 pt-8 max-w-md mx-auto">
                                <h3 className="text-xl font-bold uppercase mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
                                    Reserva a nombre de: {formData.name || 'CLIENTE'} {formData.surname || ''}
                                </h3>

                                <div className="text-gray-500 text-sm space-y-1">
                                    <p>Gracias por reservar en SOTO DEL PRIOR.</p>
                                    <p>Recibirá en breve un email de confirmación.</p>
                                </div>

                                <div className="mt-8 text-center">
                                    <Button
                                        className="text-white px-8 py-3 font-bold uppercase tracking-wider text-xs"
                                        style={{ backgroundColor: '#0A0A0A' }}
                                        onClick={() => { setCurrentStep(1); setSelectedDate(null); setTimeSlots(null); setFormData({ name: '', surname: '', email: '', phone: '', prefix: '+34' }); }}
                                    >
                                        Volver al Inicio
                                    </Button>
                                </div>
                            </div>

                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
