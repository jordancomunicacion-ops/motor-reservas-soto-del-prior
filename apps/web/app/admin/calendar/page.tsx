"use client";
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { addDays, format, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';

interface RoomType { id: string; name: string; rooms: Room[] }
interface Room { id: string; name: string; }
interface Booking {
    id: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    referenceCode: string;
    bookingRooms: { roomId: string }[];
}

function CalendarContent() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');

    const [loading, setLoading] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);

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
                fetchAPI(`/property/hotels/${contextId}/room-types`),
                fetchAPI(`/bookings/${contextId}`)
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

    const getBookingForCell = (roomId: string, date: Date) => {
        return bookings.find(b =>
            b.bookingRooms?.some(br => br.roomId === roomId) &&
            isWithinInterval(date, {
                start: new Date(b.checkInDate),
                end: addDays(new Date(b.checkOutDate), -1)
            })
        );
    };

    const isStartOfBooking = (booking: Booking, date: Date) => isSameDay(new Date(booking.checkInDate), date);

    if (contextType === 'restaurant') {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="p-4 bg-orange-100 rounded-full text-orange-600">
                    <CalendarIcon className="w-12 h-12" />
                </div>
                <h2 className="text-xl font-bold">Vista de Calendario para Restaurantes</h2>
                <p className="text-muted-foreground max-w-md">
                    La vista de calendario de ocupación está diseñada para hoteles. Para gestionar las reservas de tu restaurante, utiliza el Dashboard de sala.
                </p>
                <Button onClick={() => window.location.href = `/admin/restaurant/${contextId}`}>
                    Ir al Dashboard del Restaurante
                </Button>
            </div>
        );
    }

    if (!contextId) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <p className="text-muted-foreground">Selecciona un hotel en el selector superior para ver el calendario de ocupación.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Planning de Ocupación</h1>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
                    <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" onClick={handleToday} className="font-mono text-sm px-4">
                        {format(viewDate, 'MMM d', { locale: es })} - {format(addDays(viewDate, daysToShow - 1), 'MMM d, yyyy', { locale: es })}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="flex-1 border rounded-lg overflow-auto bg-background shadow-sm relative min-h-[500px]">
                {loading && (
                    <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                <table className="w-full border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 bg-muted/90 z-10 backdrop-blur">
                        <tr>
                            <th className="w-48 p-4 text-left font-medium text-muted-foreground border-b border-r bg-muted">Habitación</th>
                            {dates.map(date => (
                                <th key={date.toString()} className="min-w-[80px] p-2 text-center text-sm border-b border-r last:border-r-0">
                                    <div className="font-semibold text-foreground capitalize">{format(date, 'EEE', { locale: es })}</div>
                                    <div className="text-xs text-muted-foreground">{format(date, 'd')}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {roomTypes.map(rt => (
                            <React.Fragment key={rt.id}>
                                <tr className="bg-muted/30">
                                    <td colSpan={daysToShow + 1} className="p-2 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b">
                                        {rt.name}
                                    </td>
                                </tr>
                                {rt.rooms && rt.rooms.map(room => (
                                    <tr key={room.id} className="group hover:bg-muted/10 transition-colors">
                                        <td className="p-3 border-r border-b font-medium text-sm sticky left-0 bg-background group-hover:bg-muted/10">
                                            {room.name}
                                        </td>
                                        {dates.map(date => {
                                            const booking = getBookingForCell(room.id, date);
                                            const isStart = booking ? isStartOfBooking(booking, date) : false;

                                            return (
                                                <td key={date.toISOString()} className="border-r border-b p-0 relative h-12">
                                                    {booking ? (
                                                        <div
                                                            className={`absolute inset-y-1 left-0 right-0 mx-0.5 rounded px-2 flex items-center text-xs font-medium text-white shadow-sm
                                                                ${isStart ? 'z-10' : 'z-0'} 
                                                                ${booking.status === 'CONFIRMED' ? 'bg-blue-500' : 'bg-orange-400'}
                                                            `}
                                                            style={{
                                                                left: isStart ? '4px' : '-50%',
                                                                right: '4px',
                                                                width: isStart ? `calc(100% * ${(new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24)} - 8px)` : undefined,
                                                                overflow: 'hidden',
                                                                whiteSpace: 'nowrap',
                                                                display: isStart ? 'flex' : 'none'
                                                            }}
                                                            title={`#${booking.referenceCode} - ${booking.guestName}`}
                                                        >
                                                            {booking.guestName}
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                        {roomTypes.length === 0 && !loading && (
                            <tr><td colSpan={daysToShow + 1} className="p-8 text-center text-muted-foreground">No se encontraron habitaciones.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function CalendarPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <CalendarContent />
        </Suspense>
    );
}
