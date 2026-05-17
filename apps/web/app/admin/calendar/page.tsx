"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { es as esCalendar } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users, Receipt, ChevronRight, Loader2, Calendar as CalendarIcon, Filter, Phone, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
    Sheet, 
    SheetContent, 
    SheetDescription, 
    SheetHeader, 
    SheetTitle, 
    SheetTrigger,
    SheetFooter
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GuestProfileSheet from '@/components/restaurant/GuestProfileSheet';

interface Booking {
    id: string;
    guestName: string;
    checkInDate?: string;
    date?: string;
    time?: string;
    pax?: number;
    status: string;
    referenceCode: string;
    totalPrice?: number;
    phone?: string;
    email?: string;
    notes?: string;
}

function CalendarReservationsContent() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

    // New Booking Form State
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        guestName: '',
        email: '',
        phone: '',
        pax: '2',
        time: '14:00',
        notes: ''
    });

    const [selectedBookingForProfile, setSelectedBookingForProfile] = useState<Booking | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        if (contextId && date) {
            loadBookings();
        }
    }, [contextId, contextType, date, viewMode]);

    async function handleCreateBooking(e: React.FormEvent) {
        e.preventDefault();
        if (!contextId || !date) return;

        setIsCreating(true);
        try {
            const formattedDate = format(date, 'yyyy-MM-dd');
            
            const payload = contextType === 'hotel' 
                ? {
                    guestName: formData.guestName,
                    email: formData.email,
                    phone: formData.phone,
                    checkInDate: formattedDate,
                    status: 'CONFIRMED',
                    pax: parseInt(formData.pax)
                  }
                : {
                    guestName: formData.guestName,
                    email: formData.email,
                    phone: formData.phone,
                    date: formattedDate,
                    time: formData.time,
                    pax: parseInt(formData.pax),
                    status: 'CONFIRMED',
                    notes: formData.notes
                  };

            const endpoint = contextType === 'hotel' 
                ? `/bookings/${contextId}` 
                : `/restaurant/${contextId}/bookings`;

            await fetchAPI(endpoint, {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            setIsSheetOpen(false);
            setFormData({ guestName: '', email: '', phone: '', pax: '2', time: '14:00', notes: '' });
            loadBookings();
        } catch (error) {
            console.error("Error creating booking", error);
            alert("No se pudo crear la reserva. Por favor, revisa los datos.");
        } finally {
            setIsCreating(false);
        }
    }

    async function loadBookings() {
        if (!contextId || !date) return;
        setLoading(true);
        try {
            let endpoint = '';
            if (contextType === 'hotel') {
                endpoint = `/bookings/${contextId}`;
            } else {
                if (viewMode === 'day') {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    endpoint = `/restaurant/${contextId}/bookings?date=${formattedDate}`;
                } else if (viewMode === 'week') {
                    const start = startOfWeek(date, { weekStartsOn: 1 });
                    const end = endOfWeek(date, { weekStartsOn: 1 });
                    endpoint = `/restaurant/${contextId}/bookings?startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`;
                } else {
                    const start = startOfMonth(date);
                    const end = endOfMonth(date);
                    endpoint = `/restaurant/${contextId}/bookings?startDate=${format(start, 'yyyy-MM-dd')}&endDate=${format(end, 'yyyy-MM-dd')}`;
                }
            }
            
            const res = await fetchAPI<Booking[]>(endpoint);
            let filtered = Array.isArray(res) ? res : [];

            // For hotels, the API might return all bookings, so we filter by date/range in frontend
            // For restaurants, we also double filter to be consistent
            const start = viewMode === 'day' ? date : (viewMode === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date));
            const end = viewMode === 'day' ? date : (viewMode === 'week' ? endOfWeek(date, { weekStartsOn: 1 }) : endOfMonth(date));

            filtered = filtered.filter((b) => {
                const bDateStr = b.checkInDate || b.date;
                if (!bDateStr) return false;
                const bDate = new Date(bDateStr);
                if (isNaN(bDate.getTime())) return false;
                
                if (viewMode === 'day') {
                    return isSameDay(bDate, date);
                } else {
                    // Normalize dates to start of day for comparison
                    const d = new Date(bDate);
                    d.setHours(0,0,0,0);
                    const s = new Date(start);
                    s.setHours(0,0,0,0);
                    const e = new Date(end);
                    e.setHours(23,59,59,999);
                    return d >= s && d <= e;
                }
            });
            
            setBookings(filtered);
        } catch (e) {
            console.error("Error loading bookings", e);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'CONFIRMED':
            case 'SEATED':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'CANCELLED':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    if (!contextId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="p-6 bg-muted rounded-full">
                    <Filter className="w-12 h-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold">Selecciona un establecimiento</h2>
                <p className="text-muted-foreground max-w-md">
                    Para ver el calendario y las reservas, selecciona un hotel o restaurante en el selector superior.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-primary" />
                        Agenda de Reservas
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona tus reservas y disponibilidad de forma visual.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDate(new Date())}
                        className="text-xs font-bold"
                    >
                        Hoy
                    </Button>
                    <div className="flex bg-background border rounded-lg p-1 shadow-sm">
                        <Button 
                            variant={viewMode === 'day' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('day')}
                            className="text-xs"
                        >
                            Día
                        </Button>
                        <Button 
                            variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('week')}
                            className="text-xs"
                        >
                            Semana
                        </Button>
                        <Button 
                            variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            onClick={() => setViewMode('month')}
                            className="text-xs"
                        >
                            Mes
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                {/* Left Side: Calendar */}
                <Card className="lg:col-span-5 xl:col-span-4 overflow-hidden border-none shadow-lg bg-white dark:bg-zinc-900">
                    <CardHeader className="pb-2 pt-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            Seleccionar Fecha
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex justify-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={esCalendar}
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2030}
                            className="p-1"
                            classNames={{
                                root: "w-full flex justify-center",
                                table: "w-fit border-collapse",
                                head_cell: "text-muted-foreground font-medium w-8 text-[9px] uppercase pb-2 text-center",
                                cell: "h-8 w-8 text-center text-sm p-0 relative",
                                day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center text-xs",
                                day_today: "bg-accent text-accent-foreground font-bold border border-primary/20",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                            }}
                        />
                    </CardContent>
                </Card>

                {/* Right Side: Bookings List */}
                <Card className="lg:col-span-7 xl:col-span-8 flex flex-col border-none shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
                    <CardHeader className="border-b bg-muted/30 pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg">
                                    {(() => {
                                        if (!date) return 'Selecciona una fecha';
                                        if (viewMode === 'day') return format(date, "EEEE, d 'de' MMMM", { locale: es });
                                        if (viewMode === 'week') {
                                            const start = startOfWeek(date, { weekStartsOn: 1 });
                                            const end = endOfWeek(date, { weekStartsOn: 1 });
                                            return `Semana del ${format(start, "d 'de' MMMM")} al ${format(end, "d 'de' MMMM")}`;
                                        }
                                        return format(date, "MMMM 'de' yyyy", { locale: es }).toUpperCase();
                                    })()}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {bookings.length} {bookings.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}
                                </CardDescription>
                            </div>
                             <Button onClick={loadBookings} variant="outline" size="icon" className="rounded-full h-8 w-8">
                                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                            </Button>
                        </div>
                    </CardHeader>
                    <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                                    <p className="text-muted-foreground animate-pulse">Cargando reservas del día...</p>
                                </div>
                            ) : bookings.length > 0 ? (
                                bookings.map((booking) => (
                                    <div 
                                        key={booking.id} 
                                        onClick={() => {
                                            setSelectedBookingForProfile(booking);
                                            setIsProfileOpen(true);
                                        }}
                                        className="group relative bg-card hover:bg-accent/50 border rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer border-zinc-100 dark:border-zinc-800"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold text-base group-hover:scale-105 transition-transform">
                                                {(() => {
                                                    if (booking.time) return booking.time.substring(0, 5);
                                                    const dateVal = booking.checkInDate || booking.date;
                                                    if (dateVal) {
                                                        const d = new Date(dateVal);
                                                        if (!isNaN(d.getTime())) {
                                                            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                                                        }
                                                    }
                                                    return '--:--';
                                                })()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-bold text-base truncate">{booking.guestName}</h3>
                                                    {viewMode !== 'day' && (
                                                        <Badge variant="secondary" className="text-[10px] font-normal bg-zinc-100 text-zinc-600 border-none">
                                                            {(() => {
                                                                const dateVal = booking.checkInDate || booking.date;
                                                                if (dateVal) {
                                                                    const d = new Date(dateVal);
                                                                    if (!isNaN(d.getTime())) {
                                                                        return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
                                                                    }
                                                                }
                                                                return '--/--';
                                                            })()}
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 uppercase font-bold", getStatusColor(booking.status))}>
                                                        {booking.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                                                        <Users className="h-4 w-4" />
                                                        {booking.pax || 2} Pax
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <Receipt className="h-4 w-4" />
                                                        Ref: {booking.referenceCode || booking.id.substring(0, 8).toUpperCase()}
                                                    </span>
                                                    {booking.totalPrice && (
                                                        <span className="font-bold text-foreground">
                                                            €{booking.totalPrice}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                             <div className="md:ml-auto flex items-center">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full group-hover:translate-x-1 transition-transform">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                        <CalendarIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">No hay reservas</h3>
                                        <p className="text-muted-foreground">
                                            {viewMode === 'day' ? 'No se han encontrado registros para esta fecha.' : 
                                             viewMode === 'week' ? 'No se han encontrado registros para esta semana.' : 
                                             'No se han encontrado registros para este mes.'}
                                        </p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
                                        Volver a Hoy
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-3 border-t bg-muted/10">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button className="w-full font-bold shadow-md shadow-primary/10 rounded-lg h-9 text-sm" size="sm">
                                    + Crear Nueva Reserva
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="sm:max-w-md">
                                <form onSubmit={handleCreateBooking}>
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-primary" />
                                            Nueva Reserva {contextType === 'hotel' ? 'de Hotel' : 'de Restaurante'}
                                        </SheetTitle>
                                        <SheetDescription>
                                            Introduce los datos para el día {date ? format(date, "d 'de' MMMM", { locale: es }) : ''}.
                                        </SheetDescription>
                                    </SheetHeader>
                                    
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="guestName">Nombre del Cliente</Label>
                                            <div className="relative">
                                                <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    id="guestName" 
                                                    placeholder="Ej: Juan Pérez" 
                                                    className="pl-9"
                                                    required
                                                    value={formData.guestName}
                                                    onChange={e => setFormData({...formData, guestName: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Teléfono</Label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        id="phone" 
                                                        placeholder="600 000 000" 
                                                        className="pl-9"
                                                        value={formData.phone}
                                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        id="email" 
                                                        type="email"
                                                        placeholder="juan@email.com" 
                                                        className="pl-9"
                                                        value={formData.email}
                                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="pax">Comensales (Pax)</Label>
                                                <div className="relative">
                                                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                    <Input 
                                                        id="pax" 
                                                        type="number"
                                                        min="1"
                                                        className="pl-9"
                                                        value={formData.pax}
                                                        onChange={e => setFormData({...formData, pax: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            {contextType === 'restaurant' && (
                                                <div className="space-y-2">
                                                    <Label htmlFor="time">Hora</Label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                        <Input 
                                                            id="time" 
                                                            type="time"
                                                            className="pl-9"
                                                            value={formData.time}
                                                            onChange={e => setFormData({...formData, time: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="notes">Notas / Observaciones</Label>
                                            <div className="relative">
                                                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input 
                                                    id="notes" 
                                                    placeholder="Alergias, mesa preferida..." 
                                                    className="pl-9"
                                                    value={formData.notes}
                                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <SheetFooter className="mt-8">
                                        <Button type="submit" className="w-full" disabled={isCreating}>
                                            {isCreating ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Guardando...
                                                </>
                                            ) : (
                                                'Confirmar Reserva'
                                            )}
                                        </Button>
                                    </SheetFooter>
                                </form>
                            </SheetContent>
                        </Sheet>
                    </div>
                </Card>
            </div>

            <GuestProfileSheet 
                booking={selectedBookingForProfile}
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />
        </div>
    );
}

export default function CalendarReservationsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <CalendarReservationsContent />
        </Suspense>
    );
}
