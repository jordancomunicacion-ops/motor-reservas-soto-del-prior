"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface Hotel { id: string; name: string; }
interface RatePlan { id: string; name: string; isDefault: boolean; }
interface RoomType { id: string; name: string; }

export default function RatesPage() {
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [selectedHotelId, setSelectedHotelId] = useState<string>('');
    const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

    const [form, setForm] = useState({
        ratePlanId: '',
        roomTypeId: '',
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
        price: 0
    });

    useEffect(() => {
        fetchAPI('property/hotels').then(data => {
            setHotels(data);
            if (data.length > 0) setSelectedHotelId(data[0].id);
        });
    }, []);

    useEffect(() => {
        if (!selectedHotelId) return;
        fetchAPI(`rates/plans/${selectedHotelId}`).then(setRatePlans);
        fetchAPI(`property/hotels/${selectedHotelId}/room-types`).then(setRoomTypes);
    }, [selectedHotelId]);

    const handleBulkUpdate = async () => {
        try {
            await fetchAPI('rates/prices/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    hotelId: selectedHotelId,
                    ratePlanId: form.ratePlanId,
                    roomTypeId: form.roomTypeId,
                    fromDate: form.start,
                    toDate: form.end,
                    price: Number(form.price)
                })
            });
            alert('Prices updated!');
        } catch (e) {
            alert('Failed to update prices');
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Tarifas y Restricciones</h1>
                <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Seleccionar Hotel" />
                    </SelectTrigger>
                    <SelectContent>
                        {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Actualización Masiva de Precios</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rate-plan-select">Plan de Tarifas</Label>
                                <Select onValueChange={v => setForm({ ...form, ratePlanId: v })}>
                                    <SelectTrigger id="rate-plan-select" name="ratePlanId"><SelectValue placeholder="Seleccionar Plan" /></SelectTrigger>
                                    <SelectContent>
                                        {ratePlans.map(rp => <SelectItem key={rp.id} value={rp.id}>{rp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="room-type-select">Tipo de Habitación</Label>
                                <Select onValueChange={v => setForm({ ...form, roomTypeId: v })}>
                                    <SelectTrigger id="room-type-select" name="roomTypeId"><SelectValue placeholder="Seleccionar Habitación" /></SelectTrigger>
                                    <SelectContent>
                                        {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date-from">Desde</Label>
                                <Input id="date-from" name="from" type="date" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date-to">Hasta</Label>
                                <Input id="date-to" name="to" type="date" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="price-input">Nuevo Precio (€)</Label>
                            <Input id="price-input" name="price" type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                        </div>

                        <Button onClick={handleBulkUpdate} className="w-full">Aplicar Precios</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Planes de Tarifas Existentes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left">Nombre</th>
                                        <th className="p-3 text-center">Por Defecto</th>
                                        <th className="p-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ratePlans.map(rp => (
                                        <tr key={rp.id} className="border-t">
                                            <td className="p-3 font-medium">{rp.name}</td>
                                            <td className="p-3 text-center">{rp.isDefault ? '✅' : ''}</td>
                                            <td className="p-3 text-right">
                                                <Button variant="ghost" size="sm">Editar</Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {ratePlans.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No se encontraron planes.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
