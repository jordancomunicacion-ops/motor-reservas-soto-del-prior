"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// A simple custom calendar grid for demo purposes
// In production effectively use 'react-big-calendar' or similar
export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Hardcoded Hotel ID for MVP
    const [hotelId, setHotelId] = useState('');
    const [bookings, setBookings] = useState<any[]>([]);

    async function loadBookings() {
        if (!hotelId) return;
        try {
            const res = await fetchAPI(`/bookings/${hotelId}`);
            setBookings(res);
        } catch (e) { console.error(e); }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Booking Calendar</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { }}><ChevronLeft className="w-4 h-4" /></Button>
                    <span className="py-2 px-4 font-mono">{currentDate.toLocaleDateString()}</span>
                    <Button variant="outline" onClick={() => { }}><ChevronRight className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-800 text-sm mb-4">
                <div className="flex gap-2">
                    <input
                        className="border p-1 rounded"
                        placeholder="Paste Hotel ID here..."
                        value={hotelId}
                        onChange={e => setHotelId(e.target.value)}
                    />
                    <Button size="sm" onClick={loadBookings}>Load Calendar</Button>
                </div>
            </div>

            {/* Mock Grid */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                <div className="grid grid-cols-8 border-b dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900">
                    <div className="p-4 font-bold text-gray-500">Room</div>
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="p-4 font-semibold text-center border-l dark:border-zinc-700">
                            Day {i + 1}
                        </div>
                    ))}
                </div>

                {/* Empty State / Rows */}
                <div className="p-12 text-center text-gray-500">
                    {bookings.length === 0 ? "No bookings loaded or found." : `Found ${bookings.length} bookings to plot.`}
                </div>
            </div>
        </div>
    );
}
