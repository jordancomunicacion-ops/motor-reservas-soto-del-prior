"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface Hotel { id: string; name: string; }
interface RoomType { id: string; name: string; rooms: Room[] }
interface Room { id: string; name: string; }
interface Booking {
    id: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    referenceCode: string; // Added field
    bookingRooms: { roomId: string }[];
}

export default function CalendarPage() {
    const [loading, setLoading] = useState(true);
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [selectedHotelId, setSelectedHotelId] = useState<string>('');
    const [viewDate, setViewDate] = useState(new Date());

    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);

    // 1. Fetch Hotels on Mount
    useEffect(() => {
        fetchAPI('property/hotels')
            .then(data => {
                setHotels(data);
                if (data.length > 0) setSelectedHotelId(data[0].id);
            })
            .catch(err => console.error("Failed to fetch hotels", err))
            .finally(() => setLoading(false));
    }, []);

    // 2. Fetch Data when Hotel or Date changes
    // 2. Mock Data for Standalone Calendar
    useEffect(() => {
        if (!selectedHotelId) return;
        setLoading(true);

        // MOCK ROOM TYPES
        const mockRoomTypes: RoomType[] = [
            {
                id: 'rt1',
                name: 'Habitación Doble Deluxe',
                rooms: [{ id: 'r101', name: '101 - Vistas al Valle' }, { id: 'r102', name: '102 - Planta Baja' }]
            },
            {
                id: 'rt2',
                name: 'Suite Familiar',
                rooms: [{ id: 'r201', name: '201 - Suite Principal' }]
            }
        ];

        // MOCK BOOKINGS
        const today = new Date();
        const mockBookings: Booking[] = [
            {
                id: 'b1',
                referenceCode: 'RES-001',
                guestName: 'Ana García',
                checkInDate: format(today, 'yyyy-MM-dd'),
                checkOutDate: format(addDays(today, 3), 'yyyy-MM-dd'),
                status: 'CONFIRMED',
                bookingRooms: [{ roomId: 'r101' }]
            },
            {
                id: 'b2',
                referenceCode: 'RES-002',
                guestName: 'Carlos Ruiz',
                checkInDate: format(addDays(today, 1), 'yyyy-MM-dd'),
                checkOutDate: format(addDays(today, 4), 'yyyy-MM-dd'),
                status: 'PENDING',
                bookingRooms: [{ roomId: 'r201' }]
            }
        ];

        // Simulate network delay
        setTimeout(() => {
            setRoomTypes(mockRoomTypes);
            setBookings(mockBookings);
            setLoading(false);
        }, 500);

    }, [selectedHotelId, viewDate]);

    // 3. Grid Generation
    const daysToShow = 14;
    const dates = useMemo(() => {
        return Array.from({ length: daysToShow }).map((_, i) => addDays(viewDate, i));
    }, [viewDate]);

    // Helpers
    const handlePrev = () => setViewDate(d => addDays(d, -7));
    const handleNext = () => setViewDate(d => addDays(d, 7));
    const handleToday = () => setViewDate(new Date());

    const getBookingForCell = (roomId: string, date: Date) => {
        return bookings.find(b =>
            b.bookingRooms.some(br => br.roomId === roomId) &&
            isWithinInterval(date, {
                start: new Date(b.checkInDate),
                end: addDays(new Date(b.checkOutDate), -1) // -1 because Checkout day is free for next guest
            })
        );
    };

    const isStartOfBooking = (booking: Booking, date: Date) => isSameDay(new Date(booking.checkInDate), date);

    if (!selectedHotelId && !loading) return <div className="p-8">No se encontraron hoteles.</div>;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold tracking-tight">Planificación</h1>
                    <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Seleccionar Hotel" />
                        </SelectTrigger>
                        <SelectContent>
                            {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
                    <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="ghost" onClick={handleToday} className="font-mono text-sm px-4">
                        {format(viewDate, 'MMM d', { locale: es })} - {format(addDays(viewDate, daysToShow - 1), 'MMM d, yyyy', { locale: es })}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 border rounded-lg overflow-auto bg-background shadow-sm relative">
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
                                {/* Room Type Header Row */}
                                <tr className="bg-muted/30">
                                    <td colSpan={daysToShow + 1} className="p-2 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b">
                                        {rt.name}
                                    </td>
                                </tr>
                                {/* Rooms */}
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
                                                                ${booking.status === 'CONFIRMED' ? 'bg-[oklch(0.7_0.12_75)]' : 'bg-orange-400'}
                                                            `}
                                                            style={{
                                                                left: isStart ? '4px' : '-50%', // Simplistic visual merge
                                                                right: '4px',
                                                                width: isStart ? `calc(100% * ${(new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / (1000 * 3600 * 24)} - 8px)` : undefined,
                                                                overflow: 'hidden',
                                                                whiteSpace: 'nowrap',
                                                                display: isStart ? 'flex' : 'none' // Only render on start cell to avoid overlapping hell in pure CSS grid
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
                        {roomTypes.length === 0 && (
                            <tr><td colSpan={daysToShow + 1} className="p-8 text-center text-muted-foreground">No se encontraron habitaciones. Crea algunas en la sección de Propiedades.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
