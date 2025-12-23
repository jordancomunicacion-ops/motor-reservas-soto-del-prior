"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { fetchAPI } from '@/lib/api';

export default function RestaurantManager() {
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newZone, setNewZone] = useState('');

    const REY_ID = "DEMO-REST-ID"; // Placeholder

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const res = await fetchAPI(`/restaurant/${REY_ID}/tables`); // This might fail if DB empty
            if (Array.isArray(res)) setZones(res);
        } catch (e) {
            console.error(e);
            // Mock data for UI demo
            setZones([
                { id: 'z1', name: 'Terraza Principal', tables: [{ id: 't1', name: 'Mesa 1', capacity: 4 }] },
                { id: 'z2', name: 'Salón Interior', tables: [] }
            ]);
        }
    }

    async function addZone() {
        if (!newZone) return;
        setLoading(true);
        try {
            await fetchAPI('/restaurant/zones', {
                method: 'POST',
                body: JSON.stringify({ restaurantId: REY_ID, name: newZone })
            });
            setNewZone('');
            loadData();
        } catch (e) { alert('Failed to add zone'); }
        setLoading(false);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Restaurant Manager</h2>
                <Button onClick={loadData}>Refresh</Button>
            </div>

            <div className="flex gap-4 items-end">
                <div>
                    <label className="text-sm font-medium">New Zone Name</label>
                    <input className="border p-2 rounded w-64 block" value={newZone} onChange={e => setNewZone(e.target.value)} placeholder="e.g. Roof Top" />
                </div>
                <Button onClick={addZone} disabled={loading}>+ Add Zone</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {zones.map(zone => (
                    <Card key={zone.id}>
                        <CardHeader>
                            <CardTitle>{zone.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-4">{zone.tables?.length || 0} Tables</p>
                            <div className="space-y-2">
                                {zone.tables?.map((t: any) => (
                                    <div key={t.id} className="flex justify-between border p-2 rounded text-sm">
                                        <span>{t.name}</span>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Pax: {t.capacity}</span>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full mt-2">+ Add Table</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
