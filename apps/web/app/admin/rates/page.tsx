"use client";
import { useEffect, useState } from 'react';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Tags } from 'lucide-react';
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
        fetchAPIAdmin<Hotel[]>('property/hotels').then(data => {
            setHotels(data);
            if (data.length > 0) setSelectedHotelId(data[0].id);
        });
    }, []);

    useEffect(() => {
        if (!selectedHotelId) return;
        fetchAPIAdmin<RatePlan[]>(`rates/plans/${selectedHotelId}`).then(setRatePlans);
        fetchAPIAdmin<RoomType[]>(`property/hotels/${selectedHotelId}/room-types`).then(setRoomTypes);
    }, [selectedHotelId]);

    const handleBulkUpdate = async () => {
        try {
            await fetchAPIAdmin('rates/prices/bulk', {
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
            <PageHeader
                eyebrow="Pricing"
                title="Tarifas y restricciones"
                description="Gestiona los planes de tarifas y actualiza precios masivamente por rango de fechas."
                actions={
                    <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                        <SelectTrigger className="h-10 w-[220px]">
                            <SelectValue placeholder="Seleccionar Hotel" />
                        </SelectTrigger>
                        <SelectContent>
                            {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                }
            />

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight">Actualización Masiva de Precios</CardTitle>
                        <CardDescription>Aplica un precio a un plan y tipo de habitación en un rango de fechas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="rate-plan-select" className="text-eyebrow">Plan de Tarifas</Label>
                                <Select onValueChange={v => setForm({ ...form, ratePlanId: v })}>
                                    <SelectTrigger id="rate-plan-select" name="ratePlanId" className="h-10"><SelectValue placeholder="Seleccionar Plan" /></SelectTrigger>
                                    <SelectContent>
                                        {ratePlans.map(rp => <SelectItem key={rp.id} value={rp.id}>{rp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="room-type-select" className="text-eyebrow">Tipo de Habitación</Label>
                                <Select onValueChange={v => setForm({ ...form, roomTypeId: v })}>
                                    <SelectTrigger id="room-type-select" name="roomTypeId" className="h-10"><SelectValue placeholder="Seleccionar Habitación" /></SelectTrigger>
                                    <SelectContent>
                                        {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="date-from" className="text-eyebrow">Desde</Label>
                                <Input id="date-from" name="from" type="date" className="h-10" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="date-to" className="text-eyebrow">Hasta</Label>
                                <Input id="date-to" name="to" type="date" className="h-10" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="price-input" className="text-eyebrow">Nuevo Precio (€)</Label>
                            <Input id="price-input" name="price" type="number" className="h-10" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                        </div>

                        <Button onClick={handleBulkUpdate} className="w-full">Aplicar Precios</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight">Planes de Tarifas Existentes</CardTitle>
                        <CardDescription>Listado de planes configurados para este hotel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {ratePlans.length === 0 ? (
                            <EmptyState
                                icon={Tags}
                                title="Sin planes de tarifas"
                                description="Crea un plan desde el inventario del hotel para empezar a fijar precios."
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead className="text-center">Por Defecto</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ratePlans.map(rp => (
                                        <TableRow key={rp.id}>
                                            <TableCell className="font-medium">{rp.name}</TableCell>
                                            <TableCell className="text-center">
                                                {rp.isDefault ? <StatusBadge tone="success">Default</StatusBadge> : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Editar</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
