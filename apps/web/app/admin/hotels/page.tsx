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
        try {
            // Mock ID for now, or fetch list if endpoint exists
            // In real app we need a "GET /property/hotels" list endpoint
            // For now let's just create one if not exists or show list
            // Since our API currently has no "List Hotels", we might need to add it.
            // Let's assume we can create one first.
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName) return;
        try {
            const res = await fetchAPI('/property/hotels', {
                method: 'POST',
                body: JSON.stringify({ name: newName, currency: 'EUR', timezone: 'UTC' })
            });
            alert('Hotel Created: ' + res.id);
            setNewName('');
        } catch (e) {
            alert('Error creating hotel');
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Hoteles</h1>

            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow mb-8">
                <h2 className="text-lg font-semibold mb-4">Crear Nuevo Hotel</h2>
                <div className="flex flex-col gap-2">
                    <label htmlFor="new-hotel-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Hotel</label>
                    <div className="flex gap-4">
                        <input
                            id="new-hotel-name"
                            name="hotel-name"
                            className="border p-2 rounded w-full dark:bg-zinc-900"
                            placeholder="Nombre del Hotel"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <Button onClick={handleCreate}>Crear</Button>
                    </div>
                </div>
            </div>

            <p className="text-gray-500">
                * Nota: La vista de lista multi-hotel aún no está implementada en la API.
            </p>
        </div>
    );
}
