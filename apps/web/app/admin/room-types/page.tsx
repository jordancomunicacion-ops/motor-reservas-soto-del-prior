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
                <h1 className="text-2xl font-bold">Tipos de Habitación</h1>
                <Button>+ Añadir Tipo</Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-800 text-sm">
                <p><strong>Nota Dev:</strong> Por favor crea un Hotel primero en la pestaña Hoteles y pega el ID aquí para gestionar sus habitaciones.</p>
                <div className="flex flex-col gap-2 mt-2">
                    <label htmlFor="hotel-id-input" className="font-medium">ID del Hotel</label>
                    <div className="flex gap-2">
                        <input
                            id="hotel-id-input"
                            name="hotelId"
                            className="border p-1 rounded w-64"
                            placeholder="Pegar ID del Hotel aquí..."
                            value={hotelId}
                            onChange={e => setHotelId(e.target.value)}
                        />
                        <Button size="sm" onClick={loadTypes}>Cargar</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {types.map((type) => (
                    <Card key={type.id}>
                        <CardHeader>
                            <CardTitle>{type.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Precio Base: €{type.basePrice}</p>
                            <p>Capacidad: {type.capacity} pax</p>
                            <p className="text-xs text-gray-500 mt-2">{type.rooms?.length || 0} unidades</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
