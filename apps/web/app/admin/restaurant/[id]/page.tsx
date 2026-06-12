"use client";
import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, RefreshCw, PanelRightOpen, X, LayoutGrid, List, Map } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import TablePlan from '@/components/restaurant/TablePlan';
import ReservationList from '@/components/restaurant/ReservationList';
import WaitlistPanel from '@/components/restaurant/WaitlistPanel';
import ReservationForm from '@/components/restaurant/ReservationForm';
import GuestProfileSheet from '@/components/restaurant/GuestProfileSheet';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { DateSelector } from '@/components/admin/DateSelector';
import { formatTimeInTz } from '@/lib/timezone';

import AccessManager from '@/components/admin/AccessManager';
import ZoneManager from '@/components/restaurant/ZoneManager';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
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
    const [view, setView] = useState<'PLAN' | 'LIST' | 'ACCESS'>('PLAN');
    const [loading, setLoading] = useState(false);

    const [zones, setZones] = useState<ZoneWithTables[]>([]);
    const [bookings, setBookings] = useState<RestaurantBooking[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [rawTables, setRawTables] = useState<TableWithZone[]>([]);
    const [restaurant, setRestaurant] = useState<{ name?: string; timezone?: string } | null>(null);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<GuestBookingProfile | null>(null);
    const [selectedBookingForProfile, setSelectedBookingForProfile] = useState<GuestBookingProfile | null>(null);
    const [sidePanelOpen, setSidePanelOpen] = useState(false);
    const [zoneManagerOpen, setZoneManagerOpen] = useState(false);
    // La gestión de zonas y el Arquitecto viven en la ficha del local y exigen
    // manage_restaurant (Planning de ocupación es solo operación del servicio).
    const { can } = useAdminSession();
    const canManageRestaurant = can('manage_restaurant');

    const loadData = async () => {
        if (!restaurantId) return;
        setLoading(true);
        try {
            const [tablesRes, bookingsRes, waitlistRes, restRes] = await Promise.all([
                fetchAPIAdmin<ZoneWithTables[]>(`/restaurant/${restaurantId}/tables?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPIAdmin<RestaurantBooking[]>(`/restaurant/${restaurantId}/bookings?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPIAdmin<WaitlistEntry[]>(`/restaurant/${restaurantId}/waitlist`),
                fetchAPIAdmin<{ name?: string; timezone?: string }>(`/restaurant/${restaurantId}`).catch(() => ({ name: 'Restaurante' })),
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
                await fetchAPIAdmin(`/restaurant/bookings/${editingBooking.id}`, { method: 'PATCH', body: JSON.stringify(data) });
            } else {
                await fetchAPIAdmin(`/restaurant/bookings`, { method: 'POST', body: JSON.stringify({ ...data, restaurantId }) });
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
            await fetchAPIAdmin(`/restaurant/reservation/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            loadData();
        } catch (e) {
            console.error("Error updating status", e);
            alert("Error al cambiar el estado de la reserva");
        }
    };

    const handleAddWaitlist = async (data: WaitlistFormPayload) => {
        try {
            await fetchAPIAdmin(`/restaurant/${restaurantId}/waitlist`, {
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
            await fetchAPIAdmin(`/restaurant/waitlist/${waitlistId}/confirm`, { method: 'POST' });
            loadData();
        } catch {
            alert("Error al sentar cliente");
        }
    };

    const handleAssignTable = async (bookingId: string, tableId: string) => {
        try {
            await fetchAPIAdmin(`/restaurant/reservation/${bookingId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ tableId, status: 'CONFIRMED' }),
            });
            loadData();
        } catch (e) {
            console.error("Error assigning table", e);
            alert(e instanceof Error && e.message ? e.message : "Error al asignar la mesa");
        }
    };

    const totalPax = bookings.reduce((sum, b) => sum + (b.status !== 'CANCELLED' ? (b.pax ?? 0) : 0), 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;
    const pendingTables = bookings.filter(b => !b.tableId);

    const sidePanel = (
        <>
            <div className="flex-1 min-h-0">
                <WaitlistPanel entries={waitlist} onAdd={handleAddWaitlist} onSeat={handleSeatWaitlist} />
            </div>
            <Card className="flex-1 min-h-0 overflow-hidden flex flex-col gap-0 py-0">
                <div className="px-3 py-2.5 bg-warning/15 text-warning-foreground text-xs font-medium border-b border-warning/30">
                    Pendientes de mesa ({pendingTables.length})
                </div>
                <CardContent className="p-0 flex-1 overflow-auto">
                    <div className="divide-y divide-border/60">
                        {pendingTables.map(b => (
                            <div
                                key={b.id}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("bookingId", b.id)}
                                className="p-3 text-sm hover:bg-accent/50 cursor-pointer transition-colors border-l-2 border-warning/60"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-medium tabular-nums">
                                        {b.date ? formatTimeInTz(b.date, restaurant?.timezone, '—') : '—'}
                                    </span>
                                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                        {b.pax} pax
                                    </span>
                                </div>
                                <div className="truncate text-muted-foreground mt-0.5">{b.guestName}</div>
                            </div>
                        ))}
                        {pendingTables.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-6 italic">
                                No hay reservas pendientes.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </>
    );

    return (
        <div className="flex flex-col h-[calc(100dvh-140px)] sm:h-[calc(100dvh-120px)] gap-3 sm:gap-4 min-h-0">
            <div className="flex justify-between items-center rounded-lg border border-border bg-card px-3 sm:px-4 py-2.5 sm:py-3 gap-2 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <h1 className="font-display text-base sm:text-xl font-medium tracking-tight truncate">
                        {restaurant?.name || <Skeleton className="h-6 w-32" />}
                    </h1>
                    <DateSelector date={date} onDateChange={setDate} />
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden md:flex gap-4">
                        <Stat label="Reservas" value={totalBookings} />
                        <Stat label="Pax" value={totalPax} />
                    </div>
                    <div className="h-6 w-px bg-border hidden md:block" />
                    {canManageRestaurant && (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setZoneManagerOpen(true)}>
                            <Map className="size-3.5" />
                            <span className="hidden sm:inline">Zonas</span>
                        </Button>
                    )}
                    <Button onClick={() => setIsFormOpen(true)} size="sm" className="gap-1.5">
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">Nueva reserva</span>
                        <span className="sm:hidden">Nueva</span>
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={loadData} aria-label="Recargar">
                        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        className="lg:hidden relative"
                        onClick={() => setSidePanelOpen(true)}
                        aria-label="Abrir lista de espera y pendientes"
                    >
                        <PanelRightOpen className="size-3.5" />
                        {(waitlist.length + pendingTables.length) > 0 && (
                            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-warning text-[9px] font-bold text-warning-foreground flex items-center justify-center tabular-nums">
                                {waitlist.length + pendingTables.length}
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                <aside className="w-80 hidden lg:flex flex-col gap-4 min-h-0">
                    {sidePanel}
                </aside>

                <main className="flex-1 min-w-0 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
                    {view !== 'ACCESS' && (
                        <div className="border-b border-border px-4 py-2 flex justify-between items-center bg-muted/30">
                            <div className="inline-flex rounded-md border border-border p-0.5 bg-background">
                                {([
                                    { value: 'PLAN', label: 'Plano', icon: LayoutGrid },
                                    { value: 'LIST', label: 'Lista', icon: List },
                                ] as const).map(({ value: v, label, icon: Icon }) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setView(v)}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-3 h-8 rounded text-xs font-medium transition-colors",
                                            view === v
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex-1 overflow-hidden relative min-h-0">
                        {view === 'ACCESS' && (
                            <div className="h-full overflow-auto p-6">
                                <AccessManager contextId={restaurantId} contextType="restaurant" />
                            </div>
                        )}
                        {view === 'PLAN' && (
                            <TablePlan
                                zones={zones}
                                tables={rawTables}
                                restaurantId={restaurantId}
                                mode="SERVICE"
                                hideArchitectButton={!canManageRestaurant}
                                onTableUpdate={handleUpdateTable}
                                onBookingMove={handleAssignTable}
                                onSelectProfile={(b) => setSelectedBookingForProfile(b)}
                                onTableSelect={() => { }}
                                className="h-full w-full"
                                timezone={restaurant?.timezone}
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
                                    timezone={restaurant?.timezone}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Drawer móvil/tablet con waitlist y pendientes */}
            {sidePanelOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidePanelOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[min(92vw,360px)] bg-background border-l border-border flex flex-col p-3 gap-3 shadow-2xl animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between">
                            <span className="font-display text-base font-medium">Servicio</span>
                            <Button variant="ghost" size="icon-sm" onClick={() => setSidePanelOpen(false)} aria-label="Cerrar">
                                <X className="size-4" />
                            </Button>
                        </div>
                        <div className="flex-1 flex flex-col gap-3 min-h-0">
                            {sidePanel}
                        </div>
                    </div>
                </div>
            )}

            <ZoneManager
                isOpen={zoneManagerOpen}
                restaurantId={restaurantId}
                onClose={() => setZoneManagerOpen(false)}
                onSaved={loadData}
            />

            <ReservationForm
                isOpen={isFormOpen || !!editingBooking}
                onClose={closeForm}
                onSubmit={handleCreateBooking}
                onCancel={async (bookingId) => { await handleStatusChange(bookingId, 'CANCELLED'); }}
                initialDate={date}
                initialBooking={editingBooking}
                timezone={restaurant?.timezone}
                restaurantId={restaurantId}
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
