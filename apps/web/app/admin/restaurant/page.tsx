"use client";
import { useState, useEffect, Suspense } from 'react';
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
import { useSearchParams } from 'next/navigation';
import { DateSelector } from '@/components/admin/DateSelector';

function RestaurantManagerContent() {
    const searchParams = useSearchParams();
    const context = searchParams.get('context') || 'hotel'; // hotel | restaurant

    const [date, setDate] = useState(new Date());
    const [view, setView] = useState("PLAN"); // PLAN, LIST
    const [loading, setLoading] = useState(false);

    // Data
    const [zones, setZones] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [rawTables, setRawTables] = useState<any>([]); // Flattened tables

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);

    const ID = "DEMO-REST-ID"; // Placeholder

    useEffect(() => {
        loadData();
    }, [date]);

    async function loadData() {
        setLoading(true);
        try {
            // Parallel fetch
            const [tablesRes, bookingsRes, waitlistRes] = await Promise.all([
                fetchAPI(`/restaurant/${ID}/tables`), // Returns zones with nested tables
                fetchAPI(`/restaurant/${ID}/bookings?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPI(`/restaurant/${ID}/waitlist`)
            ]);

            if (Array.isArray(tablesRes)) {
                setZones(tablesRes);
                // Flatten tables for easier usage in Plan
                const flat = tablesRes.flatMap((z: any) => z.tables.map((t: any) => ({ ...t, zoneId: z.id })));
                setRawTables(flat);
            }
            if (Array.isArray(bookingsRes)) setBookings(bookingsRes);
            if (Array.isArray(waitlistRes)) setWaitlist(waitlistRes);

        } catch (e) { console.error("Error loading data", e); }
        setLoading(false);
    }

    // Handlers
    const handleUpdateTable = async (tableId: string, updates: any) => {
        // Optimistic update
        setRawTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));

        // Find zone and update on server (batch sync logic reused or single update)
        // For now, assume batch sync endpoint usage or we add single update endpoint
        // To be implemented fully. Sending flattened sync for the specific zone would be ideal.
    };

    const handleCreateBooking = async (data: any) => {
        try {
            await fetchAPI(`/restaurant/bookings`, { method: 'POST', body: JSON.stringify({ ...data, restaurantId: ID }) });
            loadData();
        } catch (e) {
            alert("Error creando reserva");
        }
    };

    const handleStatusChange = async (bookingId: string, status: string) => {
        // Implement status update API
        console.log("Change status", bookingId, status);
        // await fetchAPI(...)
        // refresh
    };

    const handleAssignTable = async (bookingId: string, tableId: string) => {
        console.log("Assign", bookingId, tableId);
        // Implement assignment API logic
    };

    // Stats
    const totalPax = bookings.reduce((sum, b) => sum + (b.status !== 'CANCELLED' ? b.pax : 0), 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;

    return (
        <div className="flex flex-col h-screen bg-gray-100 p-4 gap-4">

            {/* Header / Top Bar */}
            <header className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold tracking-tight">
                        SOTO DEL PRIOR: {context === 'restaurant' ? 'Restaurante' : 'Hotel'}
                    </h1>
                    <DateSelector date={date} onDateChange={setDate} />
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-sm text-gray-600">
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-black">{totalBookings}</span>
                            <span className="text-[10px] uppercase">Reservas</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-black">{totalPax}</span>
                            <span className="text-[10px] uppercase">Pax</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
                        <Plus className="w-4 h-4" /> Nueva Reserva
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => loadData()}>
                        <RefreshCw className={loading ? "animate-spin" : ""} />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Left Panel: Waitlist & Lists (Collapsible ideally, fixed for now) */}
                <aside className="w-80 flex flex-col gap-4">
                    <div className="flex-1 h-1/2">
                        <WaitlistPanel
                            entries={waitlist}
                            onAdd={(d) => console.log("Add waitlist", d)}
                            onSeat={(id) => console.log("Seat", id)}
                        />
                    </div>
                    <Card className="h-1/2 overflow-hidden flex flex-col">
                        <CardContent className="p-0 flex-1 overflow-auto">
                            {/* Mini list of unassigned bookings could go here */}
                            <div className="p-3 bg-yellow-50 text-yellow-800 text-xs font-semibold border-b">
                                Pendientes de Mesa ({bookings.filter(b => !b.tableId).length})
                            </div>
                            <div className="divide-y">
                                {bookings.filter(b => !b.tableId).map(b => (
                                    <div key={b.id} className="p-3 text-sm hover:bg-gray-50 cursor-pointer draggable" draggable onDragStart={(e) => e.dataTransfer.setData("bookingId", b.id)}>
                                        <div className="flex justify-between">
                                            <span className="font-bold">{format(new Date(b.date), 'HH:mm')}</span>
                                            <span className="bg-gray-200 px-1 rounded text-xs">{b.pax}p</span>
                                        </div>
                                        <div className="truncate">{b.guestName}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                {/* Center: Main View */}
                <main className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border overflow-hidden">
                    {/* View Switcher Bar */}
                    <div className="border-b px-4 py-2 flex justify-between items-center bg-gray-50">
                        <div className="flex bg-gray-200 p-1 rounded-lg">
                            <button
                                onClick={() => setView('PLAN')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'PLAN' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                <LayoutGrid className="w-4 h-4" /> Plano
                            </button>
                            <button
                                onClick={() => setView('LIST')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'LIST' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                            >
                                <List className="w-4 h-4" /> Lista
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2">
                            <select className="text-sm border rounded p-1 bg-white">
                                <option>Comida</option>
                                <option>Cena</option>
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

export default function RestaurantManager() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando...</div>}>
            <RestaurantManagerContent />
        </Suspense>
    );
}
