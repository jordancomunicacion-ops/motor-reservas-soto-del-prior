"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function HotelsPage() {
    const [hotels, setHotels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Simple Create Form State
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadHotels();
    }, []);

    async function loadHotels() {
        setLoading(true);
        try {
            const data = await fetchAPI('/property/hotels');
            if (Array.isArray(data)) {
                setHotels(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName) return;
        try {
            await fetchAPI('/property/hotels', {
                method: 'POST',
                body: JSON.stringify({ name: newName, currency: 'EUR', timezone: 'Europe/Madrid' })
            });
            setNewName('');
            loadHotels();
        } catch (e) {
            alert('Error creando hotel');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gestión de Hoteles</h1>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow border border-gray-100 dark:border-zinc-700">
                <h2 className="text-lg font-semibold mb-4">Crear Nuevo Hotel</h2>
                <div className="flex flex-col gap-2">
                    <label htmlFor="new-hotel-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Hotel</label>
                    <div className="flex gap-4">
                        <input
                            id="new-hotel-name"
                            name="hotel-name"
                            className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: Soto del Prior Boutique"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <Button onClick={handleCreate}>Crear Hotel</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Cargando hoteles...</p>
                ) : hotels.length === 0 ? (
                    <p className="text-muted-foreground">No hay hoteles registrados.</p>
                ) : (
                    hotels.map(hotel => (
                        <div key={hotel.id} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold">{hotel.name}</h3>
                                    <p className="text-sm text-muted-foreground">ID: {hotel.id}</p>
                                </div>
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200">
                                    Activo
                                </span>
                            </div>
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Moneda:</span>
                                    <span>{hotel.currency}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Zona Horaria:</span>
                                    <span>{hotel.timezone}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => window.location.href = `/admin/hotels/${hotel.id}/config`}>
                                    Configurar
                                </Button>
                                <Button variant="outline" className="flex-1" onClick={() => window.location.href = `/admin/hotels/${hotel.id}/connections`}>
                                    Conexiones
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
