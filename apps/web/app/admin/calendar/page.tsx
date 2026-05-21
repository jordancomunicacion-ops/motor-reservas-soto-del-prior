"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { es as esCalendar } from 'react-day-picker/locale';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';
import {
    CalendarDays,
    Clock,
    Users,
    Receipt,
    ChevronRight,
    Loader2,
    Calendar as CalendarIcon,
    Filter,
    Phone,
    Mail,
    MessageSquare,
    Star,
    Plus,
    RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import GuestProfileSheet from '@/components/restaurant/GuestProfileSheet';
import { formatTimeInTz, formatDayMonthInTz } from '@/lib/timezone';

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
    review?: {
        serviceScore: number;
        ambianceScore: number;
        foodScore: number;
        advice: string | null;
        redirectedToGoogle?: boolean;
        createdAt: string;
    } | null;
}

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function statusTone(status: string): StatusTone {
    switch (status.toUpperCase()) {
        case 'CONFIRMED':
        case 'SEATED':
            return 'success';
        case 'PENDING':
            return 'warning';
        case 'CANCELLED':
            return 'danger';
        default:
            return 'info';
    }
}

function CalendarReservationsContent() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');

    const [date, setDate] = useState<Date | undefined>(new Date());
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        guestName: '',
        email: '',
        phone: '',
        pax: '2',
        time: '14:00',
        notes: '',
    });

    const [selectedBookingForProfile, setSelectedBookingForProfile] = useState<Booking | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        if (contextId && date) loadBookings();
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
                    pax: parseInt(formData.pax),
                }
                : {
                    guestName: formData.guestName,
                    email: formData.email,
                    phone: formData.phone,
                    date: formattedDate,
                    time: formData.time,
                    pax: parseInt(formData.pax),
                    status: 'CONFIRMED',
                    notes: formData.notes,
                };

            const endpoint = contextType === 'hotel'
                ? `/bookings/${contextId}`
                : `/restaurant/${contextId}/bookings`;

            await fetchAPI(endpoint, { method: 'POST', body: JSON.stringify(payload) });

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
                    endpoint = `/restaurant/${contextId}/bookings?date=${format(date, 'yyyy-MM-dd')}`;
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

            const start = viewMode === 'day'
                ? date
                : (viewMode === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date));
            const end = viewMode === 'day'
                ? date
                : (viewMode === 'week' ? endOfWeek(date, { weekStartsOn: 1 }) : endOfMonth(date));

            filtered = filtered.filter((b) => {
                const bDateStr = b.checkInDate || b.date;
                if (!bDateStr) return false;
                const bDate = new Date(bDateStr);
                if (isNaN(bDate.getTime())) return false;

                if (viewMode === 'day') return isSameDay(bDate, date);
                const d = new Date(bDate); d.setHours(0, 0, 0, 0);
                const s = new Date(start); s.setHours(0, 0, 0, 0);
                const e = new Date(end); e.setHours(23, 59, 59, 999);
                return d >= s && d <= e;
            });

            setBookings(filtered);
        } catch (e) {
            console.error("Error loading bookings", e);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }

    if (!contextId) {
        return (
            <div className="min-h-[60vh] grid place-items-center">
                <EmptyState
                    icon={Filter}
                    title="Selecciona un establecimiento"
                    description="Para ver el calendario y las reservas, elige un hotel o restaurante en el selector superior."
                />
            </div>
        );
    }

    const dateLabel = (() => {
        if (!date) return 'Selecciona una fecha';
        if (viewMode === 'day') return format(date, "EEEE, d 'de' MMMM", { locale: es });
        if (viewMode === 'week') {
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = endOfWeek(date, { weekStartsOn: 1 });
            return `Semana del ${format(start, "d 'de' MMMM")} al ${format(end, "d 'de' MMMM")}`;
        }
        return format(date, "MMMM 'de' yyyy", { locale: es });
    })();

    return (
        <div className="flex flex-col space-y-6">
            <PageHeader
                eyebrow="Agenda"
                title="Calendario y reservas"
                description="Gestiona tus reservas y disponibilidad de forma visual."
                actions={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
                            Hoy
                        </Button>
                        <div className="inline-flex rounded-md border border-border p-0.5 bg-background">
                            {(['day', 'week', 'month'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={cn(
                                        "px-3 h-7 text-xs font-medium rounded transition-colors",
                                        viewMode === mode
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
                                </button>
                            ))}
                        </div>
                    </>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
                <Card className="lg:col-span-5 xl:col-span-4 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                            <CalendarIcon className="size-4 text-primary" />
                            Seleccionar fecha
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex justify-center pb-4">
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
                                head_cell: "text-muted-foreground font-medium w-8 text-[10px] uppercase pb-2 text-center",
                                cell: "h-8 w-8 text-center text-sm p-0 relative",
                                day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center text-xs hover:bg-accent rounded-md transition-colors",
                                day_today: "border border-primary/40 text-foreground",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-7 xl:col-span-8 flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <div className="flex justify-between items-center gap-2">
                            <div className="min-w-0">
                                <CardTitle className="font-display text-lg font-medium tracking-tight capitalize">
                                    {dateLabel}
                                </CardTitle>
                                <CardDescription>
                                    {bookings.length} {bookings.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}
                                </CardDescription>
                            </div>
                            <Button
                                onClick={loadBookings}
                                variant="outline"
                                size="icon-sm"
                                aria-label="Recargar"
                                disabled={loading}
                            >
                                {loading
                                    ? <Loader2 className="size-3.5 animate-spin" />
                                    : <RefreshCw className="size-3.5" />}
                            </Button>
                        </div>
                    </CardHeader>

                    <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
                        <div className="space-y-2.5">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Cargando reservas…</p>
                                </div>
                            ) : bookings.length > 0 ? (
                                bookings.map((booking) => (
                                    <BookingRow
                                        key={booking.id}
                                        booking={booking}
                                        viewMode={viewMode}
                                        onClick={() => {
                                            setSelectedBookingForProfile(booking);
                                            setIsProfileOpen(true);
                                        }}
                                    />
                                ))
                            ) : (
                                <EmptyState
                                    icon={CalendarIcon}
                                    title="No hay reservas"
                                    description={
                                        viewMode === 'day'
                                            ? 'No se han encontrado registros para esta fecha.'
                                            : viewMode === 'week'
                                                ? 'No se han encontrado registros para esta semana.'
                                                : 'No se han encontrado registros para este mes.'
                                    }
                                    action={
                                        <Button variant="outline" size="sm" onClick={() => setDate(new Date())}>
                                            Volver a hoy
                                        </Button>
                                    }
                                />
                            )}
                        </div>
                    </div>

                    <div className="p-3 border-t border-border/60 bg-muted/30">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button className="w-full" size="default">
                                    <Plus className="size-4" /> Nueva reserva
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="sm:max-w-md p-6">
                                <form onSubmit={handleCreateBooking} className="space-y-6">
                                    <SheetHeader className="text-left space-y-1.5">
                                        <SheetTitle className="font-display text-xl font-medium tracking-tight">
                                            Nueva reserva {contextType === 'hotel' ? 'de hotel' : 'de restaurante'}
                                        </SheetTitle>
                                        <SheetDescription>
                                            Introduce los datos para el día {date ? format(date, "d 'de' MMMM", { locale: es }) : ''}.
                                        </SheetDescription>
                                    </SheetHeader>

                                    <div className="space-y-4">
                                        <Field id="guestName" label="Nombre del cliente" icon={Users}>
                                            <Input
                                                id="guestName"
                                                placeholder="Ej. Juan Pérez"
                                                className="pl-9 h-10"
                                                required
                                                value={formData.guestName}
                                                onChange={e => setFormData({ ...formData, guestName: e.target.value })}
                                            />
                                        </Field>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Field id="phone" label="Teléfono" icon={Phone}>
                                                <Input
                                                    id="phone"
                                                    placeholder="600 000 000"
                                                    className="pl-9 h-10"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </Field>
                                            <Field id="email" label="Email" icon={Mail}>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="juan@email.com"
                                                    className="pl-9 h-10"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                />
                                            </Field>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Field id="pax" label="Comensales" icon={Users}>
                                                <Input
                                                    id="pax"
                                                    type="number"
                                                    min="1"
                                                    className="pl-9 h-10"
                                                    value={formData.pax}
                                                    onChange={e => setFormData({ ...formData, pax: e.target.value })}
                                                />
                                            </Field>
                                            {contextType === 'restaurant' && (
                                                <Field id="time" label="Hora" icon={Clock}>
                                                    <Input
                                                        id="time"
                                                        type="time"
                                                        className="pl-9 h-10"
                                                        value={formData.time}
                                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                                    />
                                                </Field>
                                            )}
                                        </div>

                                        <Field id="notes" label="Notas / observaciones" icon={MessageSquare}>
                                            <Input
                                                id="notes"
                                                placeholder="Alergias, mesa preferida…"
                                                className="pl-9 h-10"
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            />
                                        </Field>
                                    </div>

                                    <SheetFooter>
                                        <Button type="submit" size="lg" className="w-full" disabled={isCreating}>
                                            {isCreating && <Loader2 className="size-4 animate-spin" />}
                                            {isCreating ? 'Guardando…' : 'Confirmar reserva'}
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

function Field({
    id,
    label,
    icon: Icon,
    children,
}: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-eyebrow">{label}</Label>
            <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                {children}
            </div>
        </div>
    );
}

function BookingRow({
    booking,
    viewMode,
    onClick,
}: {
    booking: Booking;
    viewMode: 'day' | 'week' | 'month';
    onClick: () => void;
}) {
    const time = (() => {
        if (booking.time) return booking.time.substring(0, 5);
        const dateVal = booking.checkInDate || booking.date;
        return dateVal ? formatTimeInTz(dateVal) : '--:--';
    })();

    const dayMonth = (() => {
        const dateVal = booking.checkInDate || booking.date;
        return dateVal ? formatDayMonthInTz(dateVal) : '--/--';
    })();

    const reviewAvg = booking.review
        ? (booking.review.serviceScore + booking.review.ambianceScore + booking.review.foodScore) / 3
        : null;

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left group rounded-lg border border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40 transition-all p-3.5"
        >
            <div className="flex items-center gap-3">
                <div className="grid place-items-center w-12 h-12 rounded-md bg-primary/10 text-primary font-display text-sm font-medium tabular-nums shrink-0">
                    {time}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                        <h3 className="font-medium text-sm text-foreground truncate">{booking.guestName}</h3>
                        {viewMode !== 'day' && (
                            <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded tabular-nums">
                                {dayMonth}
                            </span>
                        )}
                        <StatusBadge tone={statusTone(booking.status)} className="text-[10px]">
                            {booking.status}
                        </StatusBadge>
                        {booking.review && reviewAvg !== null && (
                            <span
                                className="inline-flex items-center gap-0.5 bg-primary/10 text-primary border border-primary/20 text-[10px] px-1.5 py-0.5 rounded font-medium tabular-nums"
                                title={`Atención ${booking.review.serviceScore}/5 · Entorno ${booking.review.ambianceScore}/5 · Comida ${booking.review.foodScore}/5${booking.review.advice ? `\n"${booking.review.advice}"` : ''}`}
                            >
                                <Star className="size-2.5 fill-current" /> {reviewAvg.toFixed(1)}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" />
                            {booking.pax || 2} pax
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Receipt className="size-3.5" />
                            Ref: {booking.referenceCode || booking.id.substring(0, 8).toUpperCase()}
                        </span>
                        {typeof booking.totalPrice === 'number' && booking.totalPrice > 0 && (
                            <span className="font-medium text-foreground tabular-nums">
                                €{booking.totalPrice}
                            </span>
                        )}
                    </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
        </button>
    );
}

export default function CalendarReservationsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CalendarReservationsContent />
        </Suspense>
    );
}
