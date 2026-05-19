"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { PartyPopper, Users, Euro, ArrowLeft, Save, Trash2, Building2, Utensils } from 'lucide-react';
import { format } from 'date-fns';

interface EventDetail {
    id: string;
    name: string;
    date: string;
    duration: number;
    capacity: number;
    price: number;
    description?: string | null;
    isActive: boolean;
    hotelId?: string | null;
    restaurantId?: string | null;
    zones?: Array<{ id: string }>;
}

interface HotelSummary { id: string; name: string; restaurantId?: string | null }
interface RestaurantSummary { id: string; name: string }
interface ZoneSummary { id: string; name?: string }

export default function EventConfigPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        duration: 120,
        capacity: 50,
        price: 0,
        description: '',
        isActive: true,
        hotelId: '',
        restaurantId: '',
        zoneIds: [] as string[]
    });

    const [hotels, setHotels] = useState<HotelSummary[]>([]);
    const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
    const [availableZones, setAvailableZones] = useState<ZoneSummary[]>([]);

    useEffect(() => {
        if (formData.restaurantId) {
            fetchAPI<ZoneSummary[]>(`/restaurant/${formData.restaurantId}/zones`)
                .then(setAvailableZones)
                .catch(() => setAvailableZones([]));
        } else if (formData.hotelId) {
            fetchAPI<ZoneSummary[]>(`/property/hotels/${formData.hotelId}/zones`)
                .then(setAvailableZones)
                .catch(() => setAvailableZones([]));
        } else {
            setAvailableZones([]);
        }
    }, [formData.restaurantId, formData.hotelId]);

    useEffect(() => {
        if (params.id) {
            loadData();
        }
    }, [params.id]);

    async function loadData() {
        setLoading(true);
        try {
            const [event, hotelsData, restaurantsData] = await Promise.all([
                fetchAPI<EventDetail | EventDetail[]>(`/event/${params.id}`),
                fetchAPI<HotelSummary[]>('/property/hotels'),
                fetchAPI<RestaurantSummary[]>('/restaurant'),
            ]).catch(err => {
                console.error('Error in Promise.all loadData:', err);
                return [null, [], []] as const;
            });

            console.log('Data fetched:', { event, hotelsData, restaurantsData });

            if (event) {
                const eventObj = Array.isArray(event) ? event[0] : event;
                if (eventObj) {
                    const eventDate = new Date(eventObj.date);
                    const formattedDate = format(eventDate, "yyyy-MM-dd'T'HH:mm");

                    setFormData({
                        name: eventObj.name,
                        date: formattedDate,
                        duration: eventObj.duration || 120,
                        capacity: eventObj.capacity,
                        price: Number(eventObj.price),
                        description: eventObj.description || '',
                        isActive: eventObj.isActive,
                        hotelId: eventObj.hotelId || '',
                        restaurantId: eventObj.restaurantId || '',
                        zoneIds: eventObj.zones?.map(z => z.id) || []
                    });
                }
            }

            setHotels(Array.isArray(hotelsData) ? hotelsData : []);
            setRestaurants(Array.isArray(restaurantsData) ? restaurantsData : []);
        } catch (e) {
            console.error('Critical error in loadData:', e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!formData.hotelId && !formData.restaurantId) {
            alert('Debes vincular el evento a un hotel o restaurante');
            return;
        }
        if (formData.zoneIds.length === 0) {
            alert('Debes seleccionar al menos una sala/zona para el evento');
            return;
        }
        if (!formData.duration || formData.duration < 15) {
            alert('La duración debe ser de al menos 15 minutos');
            return;
        }
        setSaving(true);
        try {
            await fetchAPI(`/event/${params.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    ...formData,
                    hotelId: formData.hotelId || null,
                    restaurantId: formData.restaurantId || null
                })
            });
            router.push('/admin/events');
        } catch (e) {
            alert('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;
        try {
            await fetchAPI(`/event/${params.id}`, {
                method: 'DELETE'
            });
            router.push('/admin/events');
        } catch (e) {
            alert('Error al eliminar evento');
        }
    }

    if (loading) return <div className="p-8 text-muted-foreground">Cargando configuración del evento...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            <PageHeader
                eyebrow="Evento"
                title="Configurar evento"
                description="Edita los detalles y vinculaciones del evento."
                actions={
                    <>
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="size-4" />
                        </Button>
                        <Button variant="outline" onClick={handleDelete} className="gap-2">
                            <Trash2 className="size-4" /> Eliminar
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="size-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                                <PartyPopper className="size-4 text-primary" /> Información General
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="event-name" className="text-eyebrow">Nombre del Evento</Label>
                                <Input
                                    id="event-name"
                                    className="h-10"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="event-date" className="text-eyebrow">Fecha y Hora</Label>
                                    <Input
                                        id="event-date"
                                        type="datetime-local"
                                        className="h-10"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="event-state" className="text-eyebrow">Estado</Label>
                                    <Select
                                        value={formData.isActive ? 'true' : 'false'}
                                        onValueChange={v => setFormData({ ...formData, isActive: v === 'true' })}
                                    >
                                        <SelectTrigger id="event-state" className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Activo</SelectItem>
                                            <SelectItem value="false">Inactivo / Borrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="event-description" className="text-eyebrow">Descripción</Label>
                                <Textarea
                                    id="event-description"
                                    rows={5}
                                    className="resize-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                                <Building2 className="size-4 text-primary" /> Vinculación de Establecimiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="event-hotel" className="text-eyebrow flex items-center gap-1.5">
                                    <Building2 className="size-3" /> Hotel
                                </Label>
                                <Select
                                    value={formData.hotelId || 'none'}
                                    onValueChange={v => {
                                        const hId = v === 'none' ? '' : v;
                                        const hotel = hotels.find(h => h.id === hId);
                                        setFormData({
                                            ...formData,
                                            hotelId: hId,
                                            restaurantId: hotel?.restaurantId || ''
                                        });
                                    }}
                                >
                                    <SelectTrigger id="event-hotel" className="h-10"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        {hotels.map(h => (
                                            <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="event-restaurant" className="text-eyebrow flex items-center gap-1.5">
                                    <Utensils className="size-3" /> Restaurante
                                </Label>
                                <Select
                                    value={formData.restaurantId || 'none'}
                                    onValueChange={v => {
                                        const rId = v === 'none' ? '' : v;
                                        const linkedHotel = hotels.find(h => h.restaurantId === rId);
                                        setFormData({
                                            ...formData,
                                            restaurantId: rId,
                                            hotelId: linkedHotel?.id || ''
                                        });
                                    }}
                                >
                                    <SelectTrigger id="event-restaurant" className="h-10"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        {restaurants.map(r => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                                <Utensils className="size-4 text-primary" /> Salas / Áreas Reservadas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {formData.restaurantId ? (
                                availableZones.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground">
                                            Selecciona las salas que ocupará este evento. Las mesas en estas áreas quedarán bloqueadas para reservas normales.
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {availableZones.map(zone => (
                                                <label key={zone.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors">
                                                    <Checkbox
                                                        checked={formData.zoneIds.includes(zone.id)}
                                                        onCheckedChange={(checked) => {
                                                            const newIds = checked === true
                                                                ? [...formData.zoneIds, zone.id]
                                                                : formData.zoneIds.filter(id => id !== zone.id);
                                                            setFormData({ ...formData, zoneIds: newIds });
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium">{zone.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic bg-muted/40 p-4 rounded-md">Este restaurante no tiene salas configuradas.</p>
                                )
                            ) : (
                                <p className="text-sm text-muted-foreground italic bg-muted/40 p-4 rounded-md">Selecciona un restaurante primero para ver sus salas.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                                <Euro className="size-4 text-primary" /> Precios y Capacidad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="event-price" className="text-eyebrow">Precio por Persona (€)</Label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        id="event-price"
                                        type="number"
                                        className="h-10 pl-9"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="event-capacity" className="text-eyebrow flex items-center gap-1.5">
                                    <Users className="size-3" /> Capacidad Total (Pax)
                                </Label>
                                <Input
                                    id="event-capacity"
                                    type="number"
                                    className="h-10"
                                    value={formData.capacity}
                                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
