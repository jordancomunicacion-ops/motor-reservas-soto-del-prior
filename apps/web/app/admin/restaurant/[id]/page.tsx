"use client";
import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

import TablePlan from '@/components/restaurant/TablePlan';
import ReservationList from '@/components/restaurant/ReservationList';
import WaitlistPanel from '@/components/restaurant/WaitlistPanel';
import ReservationForm from '@/components/restaurant/ReservationForm';
import { fetchAPI } from '@/lib/api';
import { DateSelector } from '@/components/admin/DateSelector';

function RestaurantDashboardContent() {
    const params = useParams();
    const restaurantId = params.id as string;
    
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState("PLAN"); // PLAN, LIST
    const [loading, setLoading] = useState(false);

    // Data
    const [zones, setZones] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [rawTables, setRawTables] = useState<any>([]); // Flattened tables
    const [restaurant, setRestaurant] = useState<any>(null);

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [date, restaurantId]);

    async function loadData() {
        if (!restaurantId) return;
        setLoading(true);
        try {
            // Parallel fetch
            const [tablesRes, bookingsRes, waitlistRes, restRes] = await Promise.all([
                fetchAPI(`/restaurant/${restaurantId}/tables`), 
                fetchAPI(`/restaurant/${restaurantId}/bookings?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPI(`/restaurant/${restaurantId}/waitlist`),
                fetchAPI(`/restaurant/${restaurantId}`).catch(() => ({ name: 'Restaurante' }))
            ]);

            if (Array.isArray(tablesRes)) {
                setZones(tablesRes);
                const flat = tablesRes.flatMap((z: any) => z.tables.map((t: any) => ({ ...t, zoneId: z.id })));
                setRawTables(flat);
            }
            if (Array.isArray(bookingsRes)) setBookings(bookingsRes);
            if (Array.isArray(waitlistRes)) setWaitlist(waitlistRes);
            setRestaurant(restRes);

        } catch (e) { console.error("Error loading data", e); }
        setLoading(false);
    }

    const handleUpdateTable = async (tableId: string, updates: any) => {
        setRawTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    };

    const handleCreateBooking = async (data: any) => {
        try {
            await fetchAPI(`/restaurant/bookings`, { method: 'POST', body: JSON.stringify({ ...data, restaurantId }) });
            loadData();
        } catch (e) {
            alert("Error creando reserva");
        }
    };

    const handleStatusChange = async (bookingId: string, status: string) => {
        console.log("Change status", bookingId, status);
    };

    const handleAssignTable = async (bookingId: string, tableId: string) => {
        console.log("Assign", bookingId, tableId);
    };

    const totalPax = bookings.reduce((sum, b) => sum + (b.status !== 'CANCELLED' ? b.pax : 0), 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
            <header className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight">
                        {restaurant?.name || 'Cargando...'}
                    </h1>
                    <DateSelector date={date} onDateChange={setDate} />
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-black dark:text-white">{totalBookings}</span>
                            <span className="text-[10px] uppercase font-medium">Reservas</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-black dark:text-white">{totalPax}</span>
                            <span className="text-[10px] uppercase font-medium">Pax</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />
                    <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
                        <Plus className="w-4 h-4" /> Nueva Reserva
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => loadData()}>
                        <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} />
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex gap-4 overflow-hidden">
                <aside className="w-80 flex flex-col gap-4">
                    <div className="flex-1 h-1/2">
                        <WaitlistPanel
                            entries={waitlist}
                            onAdd={(d) => console.log("Add waitlist", d)}
                            onSeat={(id) => console.log("Seat", id)}
                        />
                    </div>
                    <Card className="h-1/2 overflow-hidden flex flex-col border-gray-100 dark:border-zinc-700 shadow-sm">
                        <CardContent className="p-0 flex-1 overflow-auto">
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs font-semibold border-b border-yellow-100 dark:border-yellow-900/30">
                                Pendientes de Mesa ({bookings.filter(b => !b.tableId).length})
                            </div>
                            <div className="divide-y dark:divide-zinc-700">
                                {bookings.filter(b => !b.tableId).map(b => (
                                    <div key={b.id} className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700/50 cursor-pointer draggable transition-colors" draggable onDragStart={(e) => e.dataTransfer.setData("bookingId", b.id)}>
                                        <div className="flex justify-between">
                                            <span className="font-bold">{format(new Date(b.date), 'HH:mm')}</span>
                                            <span className="bg-gray-200 dark:bg-zinc-700 px-1.5 rounded text-[10px] font-bold uppercase">{b.pax} Pax</span>
                                        </div>
                                        <div className="truncate text-muted-foreground mt-1">{b.guestName}</div>
                                    </div>
                                ))}
                                {bookings.filter(b => !b.tableId).length === 0 && (
                                    <div className="p-8 text-center text-xs text-muted-foreground italic">
                                        No hay reservas pendientes
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                <main className="flex-1 flex flex-col bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden">
                    <div className="border-b dark:border-zinc-700 px-4 py-2 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
                        <div className="flex bg-gray-200 dark:bg-zinc-900 p-1 rounded-lg">
                            <button
                                onClick={() => setView('PLAN')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'PLAN' ? 'bg-white dark:bg-zinc-800 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <LayoutGrid className="w-4 h-4" /> Plano
                            </button>
                            <button
                                onClick={() => setView('LIST')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'LIST' ? 'bg-white dark:bg-zinc-800 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <List className="w-4 h-4" /> Lista
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <select className="text-sm border rounded p-1.5 bg-white dark:bg-zinc-900 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500">
                                <option>Servicio: Comida</option>
                                <option>Servicio: Cena</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {view === 'PLAN' && (
                            <TablePlan
                                zones={zones}
                                tables={rawTables}
                                onTableUpdate={handleUpdateTable}
                                onBookingMove={handleAssignTable}
                                className="h-full w-full"
                            />
                        )}

                        {view === 'LIST' && (
                            <div className="h-full overflow-auto p-4">
                                <ReservationList
                                    bookings={bookings}
                                    onStatusChange={handleStatusChange}
                                    onEdit={(b) => console.log("Edit", b)}
                                />
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <ReservationForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleCreateBooking}
                initialDate={date}
            />
        </div>
    );
}

export default function RestaurantDashboard() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando dashboard...</div>}>
            <RestaurantDashboardContent />
        </Suspense>
    );
}
