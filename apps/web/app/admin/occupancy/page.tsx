"use client";
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { fetchAPI } from '@/lib/api';
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
    Calendar as CalendarIcon, 
    Building2, 
    Utensils,
    Plus,
    RefreshCw,
    LayoutGrid,
    List,
    LayoutDashboard,
    Users,
    Star
} from 'lucide-react';
import { addDays, format, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Restaurant Components
import TablePlan from '@/components/restaurant/TablePlan';
import ReservationList from '@/components/restaurant/ReservationList';
import WaitlistPanel from '@/components/restaurant/WaitlistPanel';
import ReservationForm from '@/components/restaurant/ReservationForm';
import GuestProfileSheet from '@/components/restaurant/GuestProfileSheet';
import { DateSelector } from '@/components/admin/DateSelector';
import ReviewsPanel from '@/components/admin/ReviewsPanel';
import HotelReviewsPanel from '@/components/admin/HotelReviewsPanel';

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

function RestaurantPlanning({ contextId }: { contextId: string }) {
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState("PLAN"); // PLAN, LIST, REVIEWS
    const [loading, setLoading] = useState(false);

    // Data
    const [zones, setZones] = useState<ZoneWithTables[]>([]);
    const [bookings, setBookings] = useState<RestaurantBooking[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [rawTables, setRawTables] = useState<TableWithZone[]>([]); // Flattened tables
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [selectedBookingForProfile, setSelectedBookingForProfile] = useState<GuestBookingProfile | null>(null);

    useEffect(() => {
        loadData();
    }, [date, contextId]);

    async function loadData() {
        if (!contextId) return;
        setLoading(true);
        try {
            const [tablesRes, bookingsRes, waitlistRes] = await Promise.all([
                fetchAPI<ZoneWithTables[]>(`/restaurant/${contextId}/tables?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPI<RestaurantBooking[]>(`/restaurant/${contextId}/bookings?date=${format(date, 'yyyy-MM-dd')}`),
                fetchAPI<WaitlistEntry[]>(`/restaurant/${contextId}/waitlist`),
            ]);

            if (Array.isArray(tablesRes)) {
                setZones(tablesRes);
                const flat = tablesRes.flatMap(z =>
                    z.tables.map(t => ({ ...t, zoneId: z.id })),
                );
                setRawTables(flat);
            }
            if (Array.isArray(bookingsRes)) setBookings(bookingsRes);
            if (Array.isArray(waitlistRes)) setWaitlist(waitlistRes);

        } catch (e) { console.error("Error loading data", e); }
        setLoading(false);
    }

    const handleStatusChange = async (bookingId: string, status: string) => {
        try {
            await fetchAPI(`/restaurant/reservation/${bookingId}/status`, { 
                method: 'PATCH', 
                body: JSON.stringify({ status }) 
            });
            loadData();
        } catch (e) {
            console.error("Error updating status", e);
        }
    };

    const handleUpdateTable = async (tableId: string, updates: TableUpdates) => {
        // If it's a status update from the manual menu
        if (updates.bookingStatus) {
            const table = rawTables.find(t => t.id === tableId);
            const booking = table?.resBookings?.[0];
            if (booking) {
                handleStatusChange(booking.id, updates.bookingStatus);
            }
            return;
        }
        setRawTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates } : t));
    };

    const handleAssignTable = async (bookingId: string, tableId: string) => {
        try {
            await fetchAPI(`/restaurant/reservation/${bookingId}/status`, { 
                method: 'PATCH', 
                body: JSON.stringify({ tableId, status: 'CONFIRMED' }) 
            });
            loadData();
        } catch (e) {
            console.error("Error assigning table", e);
        }
    };

    const handleQuickRes = (tableId: string) => {
        const table = rawTables.find(t => t.id === tableId);
        const isOccupied = (table?.resBookings?.length ?? 0) > 0;

        setSelectedTableId(prev => prev === tableId ? null : tableId);

        if (!isOccupied) {
            setIsFormOpen(true);
        }
    };

    const totalPax = bookings.reduce((sum, b) => {
        if (b.status === 'CANCELLED') return sum;
        return sum + (b.pax ?? 0);
    }, 0);
    const totalBookings = bookings.filter(b => b.status !== 'CANCELLED').length;

    return (
        <div className="flex flex-col h-full gap-4">
            <header className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-orange-500" />
                        <h1 className="text-lg font-bold tracking-tight">Plano de Sala</h1>
                    </div>
                    <DateSelector date={date} onDateChange={setDate} />
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex gap-4 text-sm text-gray-600 dark:text-gray-400 mr-4">
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-black dark:text-white">{totalBookings}</span>
                            <span className="text-[10px] uppercase font-medium">Reservas</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-bold text-black dark:text-white">{totalPax}</span>
                            <span className="text-[10px] uppercase font-medium">Pax</span>
                        </div>
                    </div>
                    <Button className="gap-2 h-8 text-xs" size="sm" onClick={() => {
                        setSelectedTableId(null);
                        setIsFormOpen(true);
                    }}>
                        <Plus className="w-3.5 h-3.5" /> Nueva Reserva
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => loadData()}>
                        <RefreshCw className={loading ? "animate-spin w-3.5 h-3.5" : "w-3.5 h-3.5"} />
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex gap-4 overflow-hidden min-h-[600px]">
                <aside className="w-80 hidden lg:flex flex-col gap-4">
                    <div className="flex-1 h-1/2">
                        <WaitlistPanel
                            entries={waitlist}
                            onAdd={() => {}}
                            onSeat={() => {}}
                        />
                    </div>
                    <Card className="h-1/2 overflow-hidden flex flex-col border-gray-100 dark:border-zinc-700 shadow-sm">
                        <CardContent className="p-0 flex-1 overflow-auto">
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs font-semibold border-b border-yellow-100 dark:border-yellow-900/30">
                                Pendientes de Mesa ({bookings.filter(b => !b.tableId).length})
                            </div>
                            <div className="divide-y dark:divide-zinc-700">
                                {bookings.filter(b => !b.tableId).map(b => (
                                    <div 
                                        key={b.id} 
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("bookingId", b.id);
                                            e.dataTransfer.effectAllowed = "move";
                                        }}
                                        className="p-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors border-l-4 border-yellow-400"
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-bold">
                                                {(() => {
                                                    const when = b.date ? new Date(b.date) : null;
                                                    if (!when || isNaN(when.getTime())) return '--:--';
                                                    return `${String(when.getUTCHours()).padStart(2, '0')}:${String(when.getUTCMinutes()).padStart(2, '0')}`;
                                                })()}
                                            </span>
                                            <span className="bg-gray-200 dark:bg-zinc-700 px-1.5 rounded text-[10px] font-bold uppercase">
                                                {b.pax ?? 0} Pax
                                            </span>
                                        </div>
                                        <div className="truncate text-muted-foreground mt-1">{b.guestName}</div>
                                    </div>
                                ))}
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
                            <button
                                onClick={() => setView('REVIEWS')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'REVIEWS' ? 'bg-white dark:bg-zinc-800 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                            >
                                <Star className="w-4 h-4" /> Valoraciones
                            </button>
                        </div>
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
                            />
                        )}

                        {view === 'LIST' && (
                            <div className="h-full overflow-auto p-4">
                                <ReservationList
                                    bookings={bookings}
                                    zones={zones}
                                    onStatusChange={handleStatusChange}
                                    onAssignTable={handleAssignTable}
                                    onEdit={() => {}}
                                    onSelectProfile={(b) => setSelectedBookingForProfile(b)}
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
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={async (data) => {
                    try {
                        await fetchAPI('/restaurant/bookings', {
                            method: 'POST',
                            body: JSON.stringify({ ...data, restaurantId: contextId })
                        });
                        loadData();
                    } catch (e) {
                        console.error("Error creating reservation", e);
                    }
                }}
                initialDate={date}
                initialTableId={selectedTableId}
            />

            <GuestProfileSheet
                booking={selectedBookingForProfile}
                isOpen={!!selectedBookingForProfile}
                onClose={() => setSelectedBookingForProfile(null)}
            />
        </div>
    );
}
function HotelPlanning({
    contextId,
    loading,
    roomTypes,
    bookings,
    dates,
    handlePrev,
    handleNext,
    handleToday
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
            <header className="flex justify-between items-center bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-500" />
                    <h1 className="text-lg font-bold tracking-tight">Planning de Ocupación</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-200 dark:bg-zinc-900 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setView('PLANNING')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'PLANNING' ? 'bg-white dark:bg-zinc-800 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Planning
                        </button>
                        <button
                            onClick={() => setView('REVIEWS')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'REVIEWS' ? 'bg-white dark:bg-zinc-800 shadow text-black dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                        >
                            <Star className="w-4 h-4" /> Valoraciones
                        </button>
                    </div>
                    {view === 'PLANNING' && (
                        <>
                            <Button variant="outline" size="sm" onClick={handlePrev}><ChevronLeft className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={handleToday}>Hoy</Button>
                            <Button variant="outline" size="sm" onClick={handleNext}><ChevronRight className="w-4 h-4" /></Button>
                        </>
                    )}
                </div>
            </header>

            {view === 'REVIEWS' ? (
                <div className="flex-1 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 overflow-auto p-4">
                    <HotelReviewsPanel endpoint={`/bookings/hotel/${contextId}/reviews`} />
                </div>
            ) : (
            <div className="flex-1 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-zinc-900/50 sticky top-0 z-20">
                                <th className="p-3 border-b dark:border-zinc-700 text-left min-w-[200px] bg-gray-50 dark:bg-zinc-900">Habitación</th>
                                {dates.map((date: Date) => (
                                    <th key={date.toISOString()} className={cn(
                                        "p-2 border-b border-l dark:border-zinc-700 text-center min-w-[60px] text-[10px] uppercase font-bold",
                                        isSameDay(date, new Date()) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : ""
                                    )}>
                                        <div>{format(date, 'EEE', { locale: es })}</div>
                                        <div className="text-sm">{format(date, 'dd')}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {roomTypes.map(type => (
                                <React.Fragment key={type.id}>
                                    <tr className="bg-gray-100/50 dark:bg-zinc-800/50">
                                        <td colSpan={dates.length + 1} className="p-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b dark:border-zinc-700">
                                            {type.name}
                                        </td>
                                    </tr>
                                    {type.rooms?.map(room => (
                                        <tr key={room.id} className="group hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                                            <td className="p-3 border-b dark:border-zinc-700 text-sm font-medium sticky left-0 bg-white dark:bg-zinc-800 z-10">{room.name}</td>
                                            {dates.map((date: Date) => {
                                                const booking = (bookings as HotelBooking[]).find((b) =>
                                                    b.bookingRooms.some((br) => br.roomId === room.id) &&
                                                    isWithinInterval(date, {
                                                        start: new Date(b.checkInDate),
                                                        end: new Date(b.checkOutDate)
                                                    })
                                                );
                                                
                                                return (
                                                    <td key={date.toISOString()} className="border-b border-l dark:border-zinc-700 p-0 h-12 relative">
                                                        {booking && isSameDay(date, new Date(booking.checkInDate)) && (
                                                            <div className="absolute inset-y-1 left-0 z-10 bg-blue-500 text-white text-[9px] font-bold p-1 rounded-md shadow-sm truncate m-1" style={{ width: `calc(${Math.ceil((new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24)) * 100}% - 8px)` }}>
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
    const [viewMode, setViewMode] = useState<'PLANNING' | 'access'>('PLANNING');

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
                fetchAPI<RoomType[]>(`/property/hotels/${contextId}/room-types`),
                fetchAPI<HotelBooking[]>(`/bookings/${contextId}`),
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
    const dates = useMemo(() => {
        return Array.from({ length: daysToShow }).map((_, i) => addDays(viewDate, i));
    }, [viewDate]);

    const handlePrev = () => setViewDate(d => addDays(d, -7));
    const handleNext = () => setViewDate(d => addDays(d, 7));
    const handleToday = () => setViewDate(new Date());

    interface ContextSummary { id: string; name: string; restaurantId?: string | null }
    interface GlobalContexts { hotels: ContextSummary[]; restaurants: ContextSummary[] }
    const [contexts, setContexts] = useState<GlobalContexts>({ hotels: [], restaurants: [] });

    useEffect(() => {
        fetchAPI<GlobalContexts>('/global/contexts').then(setContexts).catch(console.error);
    }, []);

    const switchContext = (type: string) => {
        setViewMode('PLANNING');
        const params = new URLSearchParams(searchParams.toString());
        params.set('context', type);
        
        // Try to find the linked ID when switching
        if (type === 'restaurant' && contextType === 'hotel') {
            const hotel = contexts.hotels.find(h => h.id === contextId);
            if (hotel?.restaurantId) {
                params.set('id', hotel.restaurantId);
            } else {
                params.delete('id'); // Force re-selection if no link
            }
        } else if (type === 'hotel' && contextType === 'restaurant') {
            const hotel = contexts.hotels.find(h => h.restaurantId === contextId);
            if (hotel) {
                params.set('id', hotel.id);
            } else {
                params.delete('id');
            }
        }

        router.push(`?${params.toString()}`);
    };

    if (!contextId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="p-6 bg-muted rounded-full">
                    <LayoutDashboard className="w-12 h-12 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold">Selecciona un establecimiento</h2>
                <p className="text-muted-foreground max-w-md">
                    Para ver el planning de ocupación, selecciona un hotel o restaurante en el selector superior.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-start border-b gap-4">
                <button 
                    onClick={() => switchContext('hotel')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${contextType === 'hotel' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Building2 className="w-4 h-4" /> Hotel
                </button>
                <button 
                    onClick={() => switchContext('restaurant')}
                    className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${contextType === 'restaurant' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    <Utensils className="w-4 h-4" /> Restaurante
                </button>
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
        <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <CalendarContent />
        </Suspense>
    );
}
