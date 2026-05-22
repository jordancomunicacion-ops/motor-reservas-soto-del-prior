"use client";
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { fetchAPIAdmin } from '@/lib/api-admin';
import type {
    ZoneWithTables,
    TableWithZone,
    RestaurantBooking,
    WaitlistEntry,
} from '@/types/restaurant';
import type { GuestBookingProfile } from '@/components/restaurant/GuestProfileSheet';
import type { TableUpdates } from '@/components/restaurant/TablePlan';
import { Button } from '@/components/ui/button';
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
    Building2,
    Utensils,
    Plus,
    RefreshCw,
    LayoutGrid,
    List,
    LayoutDashboard,
    Star,
} from 'lucide-react';
import { addDays, format, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

import TablePlan from '@/components/restaurant/TablePlan';
import ReservationList from '@/components/restaurant/ReservationList';
import WaitlistPanel from '@/components/restaurant/WaitlistPanel';
import ReservationForm from '@/components/restaurant/ReservationForm';
import GuestProfileSheet from '@/components/restaurant/GuestProfileSheet';
import { DateSelector } from '@/components/admin/DateSelector';
import ReviewsPanel from '@/components/admin/ReviewsPanel';
import HotelReviewsPanel from '@/components/admin/HotelReviewsPanel';
import { formatTimeInTz } from '@/lib/timezone';

interface RoomType { id: string; name: string; rooms: Room[] }
interface Room { id: string; name: string; }
interface HotelBooking {
    id: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    referenceCode: string;
    bookingRooms: { roomId: string }[];
}

function SegmentedTabs<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T;
    options: { value: T; label: string; icon: React.ComponentType<{ className?: string }> }[];
    onChange: (v: T) => void;
}) {
    return (
        <div className="inline-flex rounded-md border border-border p-0.5 bg-background">
            {options.map(({ value: v, label, icon: Icon }) => (
                <button
                    key={v}
                    type="button"
                    onClick={() => onChange(v)}
                    className={cn(
                        "inline-flex items-center gap-2 px-3 h-8 rounded text-xs font-medium transition-colors",
                        value === v
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    <Icon className="size-3.5" />
                    {label}
                </button>
            ))}
        </div>
    );
}

function RestaurantPlanning({ contextId }: { contextId: string }) {
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<'PLAN' | 'LIST' | 'REVIEWS'>('PLAN');
    const [loading, setLoading] = useState(false);

    const [zones, setZones] = useState<ZoneWithTables[]>([]);
    const [bookings, setBookings] = useState<RestaurantBooking[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [rawTables, setRawTables] = useState<TableWithZone[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [selectedBookingForProfile, setSelectedBookingForProfile] = useState<GuestBookingProfile | null>(null);
    const [editingBooking, setEditingBooking] = useState<GuestBookingProfile | null>(null);
    const [restaurantTz, setRestaurantTz] = useState<string | undefined>(undefined);

    const loadData = async () => {
        if (!contextId) return;
        setLoading(true);
        try {
            const [tablesRes, bookingsRes, waitlistRes, restRes] = await Promise.all([
                fetchAPIAdmin<ZoneWithTables[]>(`/restaurant/${contextId}/tables?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPIAdmin<RestaurantBooking[]>(`/restaurant/${contextId}/bookings?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPIAdmin<WaitlistEntry[]>(`/restaurant/${contextId}/waitlist`),
                fetchAPIAdmin<{ timezone?: string }>(`/restaurant/${contextId}`).catch(() => ({} as { timezone?: string })),
            ]);

            if (Array.isArray(tablesRes)) {
                setZones(tablesRes);
                const flat = tablesRes.flatMap(z => z.tables.map(t => ({ ...t, zoneId: z.id })));
                setRawTables(flat);
            }
            if (Array.isArray(bookingsRes)) setBookings(bookingsRes);
            if (Array.isArray(waitlistRes)) setWaitlist(waitlistRes);
            setRestaurantTz(restRes?.timezone);
        } catch (e) { console.error("Error loading data", e); }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, contextId]);

    const handleStatusChange = async (bookingId: string, status: string) => {
        try {
            await fetchAPIAdmin(`/restaurant/reservation/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            loadData();
        } catch (e) { console.error("Error updating status", e); }
    };

    const handleUpdateTable = async (tableId: string, updates: TableUpdates) => {
        if (updates.bookingStatus) {
            const table = rawTables.find(t => t.id === tableId);
            const booking = table?.resBookings?.[0];
            if (booking) handleStatusChange(booking.id, updates.bookingStatus);
            return;
        }
        setRawTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    };

    const handleAssignTable = async (bookingId: string, tableId: string) => {
        try {
            await fetchAPIAdmin(`/restaurant/reservation/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ tableId, status: 'CONFIRMED' }),
            });
            loadData();
        } catch (e) { console.error("Error assigning table", e); }
    };

    const handleQuickRes = (tableId: string) => {
        const table = rawTables.find(t => t.id === tableId);
        const isOccupied = (table?.resBookings?.length ?? 0) > 0;
        setSelectedTableId(prev => prev === tableId ? null : tableId);
        if (!isOccupied) setIsFormOpen(true);
    };

    const totalPax = bookings.reduce((sum, b) => (b.status === 'CANCELLED' ? sum : sum + (b.pax ?? 0)), 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;
    const pendingTables = bookings.filter(b => !b.tableId);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Utensils className="size-4 text-primary" />
                        <h2 className="font-display text-base font-medium tracking-tight">Plano de sala</h2>
                    </div>
                    <DateSelector date={date} onDateChange={setDate} />
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex gap-4 mr-2">
                        <Stat label="Reservas" value={totalBookings} />
                        <Stat label="Pax" value={totalPax} />
                    </div>
                    <Button size="sm" onClick={() => { setSelectedTableId(null); setIsFormOpen(true); }}>
                        <Plus className="size-3.5" /> Nueva reserva
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={loadData} aria-label="Recargar">
                        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden min-h-[600px]">
                <aside className="w-80 hidden lg:flex flex-col gap-4">
                    <div className="flex-1 h-1/2">
                        <WaitlistPanel entries={waitlist} onAdd={() => { }} onSeat={() => { }} />
                    </div>
                    <Card className="h-1/2 overflow-hidden flex flex-col gap-0 py-0">
                        <div className="px-3 py-2.5 bg-warning/15 text-warning-foreground text-xs font-medium border-b border-warning/30">
                            Pendientes de mesa ({pendingTables.length})
                        </div>
                        <CardContent className="p-0 flex-1 overflow-auto">
                            <div className="divide-y divide-border/60">
                                {pendingTables.map(b => (
                                    <div
                                        key={b.id}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("bookingId", b.id);
                                            e.dataTransfer.effectAllowed = "move";
                                        }}
                                        className="p-3 text-sm hover:bg-accent/50 cursor-pointer transition-colors border-l-2 border-warning/60"
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium tabular-nums">
                                                {formatTimeInTz(b.date, restaurantTz)}
                                            </span>
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {b.pax ?? 0} pax
                                            </span>
                                        </div>
                                        <div className="truncate text-muted-foreground mt-0.5">{b.guestName}</div>
                                    </div>
                                ))}
                                {pendingTables.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-6 italic">
                                        Nada pendiente.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <main className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
                    <div className="border-b border-border px-4 py-2 flex justify-between items-center bg-muted/30">
                        <SegmentedTabs
                            value={view}
                            onChange={setView}
                            options={[
                                { value: 'PLAN', label: 'Plano', icon: LayoutGrid },
                                { value: 'LIST', label: 'Lista', icon: List },
                                { value: 'REVIEWS', label: 'Valoraciones', icon: Star },
                            ]}
                        />
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {view === 'PLAN' && (
                            <TablePlan
                                zones={zones}
                                tables={rawTables}
                                restaurantId={contextId}
                                mode="SERVICE"
                                selectedTableId={selectedTableId}
                                onTableUpdate={handleUpdateTable}
                                onBookingMove={handleAssignTable}
                                onTableSelect={handleQuickRes}
                                onSelectProfile={(b) => setSelectedBookingForProfile(b)}
                                hideArchitectButton
                                className="h-full w-full"
                                timezone={restaurantTz}
                            />
                        )}

                        {view === 'LIST' && (
                            <div className="h-full overflow-auto p-4">
                                <ReservationList
                                    bookings={bookings}
                                    zones={zones}
                                    onStatusChange={handleStatusChange}
                                    onAssignTable={handleAssignTable}
                                    onEdit={(b) => setEditingBooking(b as unknown as GuestBookingProfile)}
                                    onSelectProfile={(b) => setSelectedBookingForProfile(b)}
                                    timezone={restaurantTz}
                                />
                            </div>
                        )}

                        {view === 'REVIEWS' && (
                            <div className="h-full overflow-auto p-4">
                                <ReviewsPanel endpoint={`/restaurant/${contextId}/reviews`} />
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <ReservationForm
                isOpen={isFormOpen || !!editingBooking}
                onClose={() => { setIsFormOpen(false); setEditingBooking(null); }}
                onSubmit={async (data) => {
                    try {
                        if (editingBooking?.id) {
                            await fetchAPIAdmin(`/restaurant/bookings/${editingBooking.id}`, {
                                method: 'PATCH',
                                body: JSON.stringify(data),
                            });
                        } else {
                            await fetchAPIAdmin('/restaurant/bookings', {
                                method: 'POST',
                                body: JSON.stringify({ ...data, restaurantId: contextId }),
                            });
                        }
                        setEditingBooking(null);
                        loadData();
                    } catch (e) { console.error("Error saving reservation", e); }
                }}
                onCancel={async (bookingId) => { await handleStatusChange(bookingId, 'CANCELLED'); }}
                initialDate={date}
                initialBooking={editingBooking}
                initialTableId={selectedTableId}
                timezone={restaurantTz}
            />

            <GuestProfileSheet
                booking={selectedBookingForProfile}
                isOpen={!!selectedBookingForProfile}
                onClose={() => setSelectedBookingForProfile(null)}
            />
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="flex flex-col items-center leading-tight">
            <span className="font-display text-base font-medium tabular-nums">{value}</span>
            <span className="text-eyebrow">{label}</span>
        </div>
    );
}

function HotelPlanning({
    contextId,
    roomTypes,
    bookings,
    dates,
    handlePrev,
    handleNext,
    handleToday,
}: {
    contextId: string;
    loading: boolean;
    roomTypes: RoomType[];
    bookings: HotelBooking[];
    viewDate?: Date;
    dates: Date[];
    handlePrev: () => void;
    handleNext: () => void;
    handleToday: () => void;
}) {
    const [view, setView] = useState<'PLANNING' | 'REVIEWS'>('PLANNING');
    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <h2 className="font-display text-base font-medium tracking-tight">Planning de ocupación</h2>
                </div>
                <div className="flex items-center gap-2">
                    <SegmentedTabs
                        value={view}
                        onChange={setView}
                        options={[
                            { value: 'PLANNING', label: 'Planning', icon: LayoutGrid },
                            { value: 'REVIEWS', label: 'Valoraciones', icon: Star },
                        ]}
                    />
                    {view === 'PLANNING' && (
                        <>
                            <Button variant="outline" size="icon-sm" onClick={handlePrev} aria-label="Anterior">
                                <ChevronLeft className="size-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
                            <Button variant="outline" size="icon-sm" onClick={handleNext} aria-label="Siguiente">
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {view === 'REVIEWS' ? (
                <div className="flex-1 rounded-lg border border-border bg-card overflow-auto p-4">
                    <HotelReviewsPanel endpoint={`/bookings/hotel/${contextId}/reviews`} />
                </div>
            ) : (
                <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/40 sticky top-0 z-20">
                                    <th className="p-3 border-b border-border text-left min-w-[200px] bg-muted/40 text-eyebrow text-foreground">Habitación</th>
                                    {dates.map((date: Date) => (
                                        <th
                                            key={date.toISOString()}
                                            className={cn(
                                                "p-2 border-b border-l border-border text-center min-w-[60px]",
                                                isSameDay(date, new Date()) && "bg-primary/10 text-primary",
                                            )}
                                        >
                                            <div className="text-[10px] uppercase font-medium tracking-wider opacity-70">
                                                {format(date, 'EEE', { locale: es })}
                                            </div>
                                            <div className="text-sm font-medium tabular-nums">{format(date, 'dd')}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {roomTypes.map(type => (
                                    <React.Fragment key={type.id}>
                                        <tr className="bg-muted/30">
                                            <td
                                                colSpan={dates.length + 1}
                                                className="p-2 text-eyebrow text-muted-foreground border-b border-border"
                                            >
                                                {type.name}
                                            </td>
                                        </tr>
                                        {type.rooms?.map(room => (
                                            <tr key={room.id} className="group hover:bg-accent/40">
                                                <td className="p-3 border-b border-border text-sm font-medium sticky left-0 bg-card z-10">
                                                    {room.name}
                                                </td>
                                                {dates.map((date: Date) => {
                                                    const booking = (bookings as HotelBooking[]).find((b) =>
                                                        b.bookingRooms.some((br) => br.roomId === room.id) &&
                                                        isWithinInterval(date, {
                                                            start: new Date(b.checkInDate),
                                                            end: new Date(b.checkOutDate),
                                                        }),
                                                    );

                                                    return (
                                                        <td
                                                            key={date.toISOString()}
                                                            className="border-b border-l border-border p-0 h-12 relative"
                                                        >
                                                            {booking && isSameDay(date, new Date(booking.checkInDate)) && (
                                                                <div
                                                                    className="absolute inset-y-1 left-0 z-10 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-1 rounded-md shadow-sm truncate m-1"
                                                                    style={{
                                                                        width: `calc(${Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24)) * 100}% - 8px)`,
                                                                    }}
                                                                >
                                                                    {booking.guestName}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function CalendarContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [bookings, setBookings] = useState<HotelBooking[]>([]);

    useEffect(() => {
        if (contextId && contextType === 'hotel') {
            loadHotelData();
        } else {
            setRoomTypes([]);
            setBookings([]);
        }
    }, [contextId, contextType, viewDate]);

    async function loadHotelData() {
        setLoading(true);
        try {
            const [rtData, bookingsData] = await Promise.all([
                fetchAPIAdmin<RoomType[]>(`/property/hotels/${contextId}/room-types`),
                fetchAPIAdmin<HotelBooking[]>(`/bookings/${contextId}`),
            ]);
            setRoomTypes(rtData || []);
            setBookings(bookingsData || []);
        } catch (err) {
            console.error("Failed to fetch calendar data", err);
        } finally {
            setLoading(false);
        }
    }

    const daysToShow = 14;
    const dates = useMemo(
        () => Array.from({ length: daysToShow }).map((_, i) => addDays(viewDate, i)),
        [viewDate],
    );

    const handlePrev = () => setViewDate(d => addDays(d, -7));
    const handleNext = () => setViewDate(d => addDays(d, 7));
    const handleToday = () => setViewDate(new Date());

    interface ContextSummary { id: string; name: string; restaurantId?: string | null }
    interface GlobalContexts { hotels: ContextSummary[]; restaurants: ContextSummary[] }
    const [contexts, setContexts] = useState<GlobalContexts>({ hotels: [], restaurants: [] });

    useEffect(() => {
        fetchAPIAdmin<GlobalContexts>('/global/contexts').then(setContexts).catch(console.error);
    }, []);

    const switchContext = (type: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('context', type);
        if (type === 'restaurant' && contextType === 'hotel') {
            const hotel = contexts.hotels.find(h => h.id === contextId);
            if (hotel?.restaurantId) params.set('id', hotel.restaurantId);
            else params.delete('id');
        } else if (type === 'hotel' && contextType === 'restaurant') {
            const hotel = contexts.hotels.find(h => h.restaurantId === contextId);
            if (hotel) params.set('id', hotel.id);
            else params.delete('id');
        }
        router.push(`?${params.toString()}`);
    };

    if (!contextId) {
        return (
            <div className="min-h-[60vh] grid place-items-center">
                <EmptyState
                    icon={LayoutDashboard}
                    title="Selecciona un establecimiento"
                    description="Para ver el planning de ocupación, elige un hotel o restaurante en el selector superior."
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <PageHeader
                eyebrow="Operativa"
                title="Planning de ocupación"
                description="Visualiza ocupación de habitaciones y mesas en tiempo real."
            />

            <div className="flex border-b border-border gap-1">
                {(['hotel', 'restaurant'] as const).map(t => {
                    const active = contextType === t;
                    const Icon = t === 'hotel' ? Building2 : Utensils;
                    return (
                        <button
                            key={t}
                            onClick={() => switchContext(t)}
                            className={cn(
                                "pb-2.5 px-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 -mb-px",
                                active
                                    ? "border-primary text-foreground"
                                    : "border-transparent text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Icon className="size-4" />
                            {t === 'hotel' ? 'Hotel' : 'Restaurante'}
                        </button>
                    );
                })}
            </div>

            {contextType === 'hotel' ? (
                <HotelPlanning
                    contextId={contextId}
                    loading={loading}
                    roomTypes={roomTypes}
                    bookings={bookings}
                    viewDate={viewDate}
                    dates={dates}
                    handlePrev={handlePrev}
                    handleNext={handleNext}
                    handleToday={handleToday}
                />
            ) : (
                <RestaurantPlanning contextId={contextId} />
            )}
        </div>
    );
}

export default function OccupancyPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CalendarContent />
        </Suspense>
    );
}
