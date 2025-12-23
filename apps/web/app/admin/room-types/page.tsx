"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RoomTypesPage() {
    const [types, setTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Hardcoded Hotel ID for MVP (User should select hotel first in real app)
    const [hotelId, setHotelId] = useState('');

    async function loadTypes() {
        if (!hotelId) return;
        setLoading(true);
        try {
            const res = await fetchAPI(`/property/hotels/${hotelId}/room-types`);
            setTypes(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Room Types</h1>
                <Button>+ Add Room Type</Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-800 text-sm">
                <p><strong>Dev Note:</strong> Please create a Hotel first in the Hotels tab and paste the ID here to manage its rooms.</p>
                <div className="flex gap-2 mt-2">
                    <input
                        className="border p-1 rounded"
                        placeholder="Paste Hotel ID here..."
                        value={hotelId}
                        onChange={e => setHotelId(e.target.value)}
                    />
                    <Button size="sm" onClick={loadTypes}>Load</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {types.map((type) => (
                    <Card key={type.id}>
                        <CardHeader>
                            <CardTitle>{type.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Base Price: €{type.basePrice}</p>
                            <p>Capacity: {type.capacity} pax</p>
                            <p className="text-xs text-gray-500 mt-2">{type.rooms?.length || 0} units</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
