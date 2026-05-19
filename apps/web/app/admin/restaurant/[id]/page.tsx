"use client";
import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import TablePlan from '@/components/restaurant/TablePlan';
import WaitlistPanel from '@/components/restaurant/WaitlistPanel';
import ReservationForm from '@/components/restaurant/ReservationForm';
import GuestProfileSheet from '@/components/restaurant/GuestProfileSheet';
import { fetchAPI } from '@/lib/api';
import { DateSelector } from '@/components/admin/DateSelector';

import AccessManager from '@/components/admin/AccessManager';
import type {
    ZoneWithTables,
    TableWithZone,
    RestaurantBooking,
    WaitlistEntry,
} from '@/types/restaurant';
import type { GuestBookingProfile } from '@/components/restaurant/GuestProfileSheet';
import type { ReservationFormPayload } from '@/components/restaurant/ReservationForm';
import type { WaitlistFormPayload } from '@/components/restaurant/WaitlistPanel';
import type { TableUpdates } from '@/components/restaurant/TablePlan';

function RestaurantDashboardContent() {
    const params = useParams();
    const restaurantId = params.id as string;

    const [date, setDate] = useState(new Date());
    const [view] = useState<'PLAN' | 'ACCESS'>('PLAN');
    const [loading, setLoading] = useState(false);

    const [zones, setZones] = useState<ZoneWithTables[]>([]);
    const [bookings, setBookings] = useState<RestaurantBooking[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [rawTables, setRawTables] = useState<TableWithZone[]>([]);
    const [restaurant, setRestaurant] = useState<{ name?: string } | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<GuestBookingProfile | null>(null);
    const [selectedBookingForProfile, setSelectedBookingForProfile] = useState<GuestBookingProfile | null>(null);

    const loadData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        try {
            const [tablesRes, bookingsRes, waitlistRes, restRes] = await Promise.all([
                fetchAPI<ZoneWithTables[]>(`/restaurant/${restaurantId}/tables?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPI<RestaurantBooking[]>(`/restaurant/${restaurantId}/bookings?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPI<WaitlistEntry[]>(`/restaurant/${restaurantId}/waitlist`),
                fetchAPI<{ name?: string }>(`/restaurant/${restaurantId}`).catch(() => ({ name: 'Restaurante' })),
            ]);

            if (Array.isArray(tablesRes)) {
                setZones(tablesRes);
                const flat = tablesRes.flatMap(z => z.tables.map(t => ({ ...t, zoneId: z.id })));
                setRawTables(flat);
            }
            if (Array.isArray(bookingsRes)) setBookings(bookingsRes);
            if (Array.isArray(waitlistRes)) setWaitlist(waitlistRes);
            setRestaurant(restRes);
        } catch (e) {
            console.error("Error loading data", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, restaurantId]);

    const handleCreateBooking = async (data: ReservationFormPayload) => {
        try {
            if (editingBooking?.id) {
                await fetchAPI(`/restaurant/bookings/${editingBooking.id}`, { method: 'PATCH', body: JSON.stringify(data) });
            } else {
                await fetchAPI(`/restaurant/bookings`, { method: 'POST', body: JSON.stringify({ ...data, restaurantId }) });
            }
            setEditingBooking(null);
            loadData();
        } catch (e) {
            console.error(e);
            alert(editingBooking ? "Error guardando cambios" : "Error creando reserva");
        }
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingBooking(null);
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

    const handleStatusChange = async (bookingId: string, status: string) => {
        try {
            await fetchAPI(`/restaurant/reservation/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            loadData();
        } catch (e) { console.error("Error updating status", e); }
    };

    const handleAddWaitlist = async (data: WaitlistFormPayload) => {
        try {
            await fetchAPI(`/restaurant/${restaurantId}/waitlist`, {
                method: 'POST',
                body: JSON.stringify({ ...data, date: format(date, 'yyyy-MM-dd') }),
            });
            loadData();
        } catch (e) {
            console.error(e);
            alert("Error en lista de espera");
        }
    };

    const handleSeatWaitlist = async (waitlistId: string) => {
        try {
            await fetchAPI(`/restaurant/waitlist/${waitlistId}/confirm`, { method: 'POST' });
            loadData();
        } catch {
            alert("Error al sentar cliente");
        }
    };

    const handleAssignTable = async (bookingId: string, tableId: string) => {
        try {
            await fetchAPI(`/restaurant/reservation/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ tableId, status: 'CONFIRMED' }),
            });
            loadData();
        } catch (e) { console.error("Error assigning table", e); }
    };

    const totalPax = bookings.reduce((sum, b) => sum + (b.status !== 'CANCELLED' ? (b.pax ?? 0) : 0), 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;
    const pendingTables = bookings.filter(b => !b.tableId);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
            <div className="flex justify-between items-center rounded-lg border border-border bg-card px-4 py-3 gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                    <h1 className="font-display text-xl font-medium tracking-tight truncate">
                        {restaurant?.name || <Skeleton className="h-6 w-32" />}
                    </h1>
                    <DateSelector date={date} onDateChange={setDate} />
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex gap-4">
                        <Stat label="Reservas" value={totalBookings} />
                        <Stat label="Pax" value={totalPax} />
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <Button onClick={() => setIsFormOpen(true)}>
                        <Plus className="size-4" /> Nueva reserva
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={loadData} aria-label="Recargar">
                        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden">
                <aside className="w-80 hidden lg:flex flex-col gap-4">
                    <div className="flex-1 h-1/2">
                        <WaitlistPanel entries={waitlist} onAdd={handleAddWaitlist} onSeat={handleSeatWaitlist} />
                    </div>
                    <Card className="h-1/2 overflow-hidden flex flex-col gap-0 py-0">
                        <div className="px-3 py-2.5 bg-warning/15 text-warning-foreground text-xs font-medium border-b border-warning/30">
                            Pendientes de mesa ({pendingTables.length})
                        </div>
                        <CardContent className="p-0 flex-1 overflow-auto">
                            <div className="divide-y divide-border/60">
                                {pendingTables.map(b => {
                                    const when = b.date ? new Date(b.date) : null;
                                    return (
                                        <div
                                            key={b.id}
                                            draggable
                                            onDragStart={(e) => e.dataTransfer.setData("bookingId", b.id)}
                                            className="p-3 text-sm hover:bg-accent/50 cursor-pointer transition-colors border-l-2 border-warning/60"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium tabular-nums">
                                                    {when ? `${String(when.getUTCHours()).padStart(2, '0')}:${String(when.getUTCMinutes()).padStart(2, '0')}` : '—'}
                                                </span>
                                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {b.pax} pax
                                                </span>
                                            </div>
                                            <div className="truncate text-muted-foreground mt-0.5">{b.guestName}</div>
                                        </div>
                                    );
                                })}
                                {pendingTables.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-6 italic">
                                        No hay reservas pendientes.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <main className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
                    <div className="flex-1 overflow-hidden relative">
                        {view === 'ACCESS' ? (
                            <div className="h-full overflow-auto p-6">
                                <AccessManager contextId={restaurantId} contextType="restaurant" />
                            </div>
                        ) : (
                            <TablePlan
                                zones={zones}
                                tables={rawTables}
                                restaurantId={restaurantId}
                                mode="SERVICE"
                                onTableUpdate={handleUpdateTable}
                                onBookingMove={handleAssignTable}
                                onSelectProfile={(b) => setSelectedBookingForProfile(b)}
                                onTableSelect={() => { }}
                                className="h-full w-full"
                            />
                        )}
                    </div>
                </main>
            </div>

            <ReservationForm
                isOpen={isFormOpen}
                onClose={closeForm}
                onSubmit={handleCreateBooking}
                initialDate={date}
                initialBooking={editingBooking}
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

export default function RestaurantDashboard() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
                    Cargando dashboard…
                </div>
            }
        >
            <RestaurantDashboardContent />
        </Suspense>
    );
}
