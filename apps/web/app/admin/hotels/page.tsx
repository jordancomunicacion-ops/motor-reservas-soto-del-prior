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
            <h1 className="text-2xl font-bold mb-6">Hotels</h1>

            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow mb-8">
                <h2 className="text-lg font-semibold mb-4">Create New Hotel</h2>
                <div className="flex gap-4">
                    <input
                        className="border p-2 rounded w-full dark:bg-zinc-900"
                        placeholder="Hotel Name"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                    <Button onClick={handleCreate}>Create</Button>
                </div>
            </div>

            <p className="text-gray-500">
                * Note: Multi-hotel list view not yet implemented in API.
            </p>
        </div>
    );
}
