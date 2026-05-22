"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Plus,
    PartyPopper,
    Calendar as CalendarIcon,
    Users,
    Euro,
    Building2,
    Utensils,
    X,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventSummary {
    id: string;
    name: string;
    description?: string | null;
    date: string;
    price?: number;
    capacity: number;
    isActive?: boolean;
    hotel?: { id: string; name: string } | null;
    restaurant?: { id: string; name: string } | null;
    zones?: Array<{ id: string; name?: string }>;
    _count: { bookings: number };
    bookings?: Array<{ pax?: number }>;
}

interface HotelSummary { id: string; name: string; restaurantId?: string | null }
interface RestaurantSummary { id: string; name: string }
interface ZoneSummary { id: string; name?: string }

const EMPTY_FORM = {
    name: '',
    date: '',
    duration: 120,
    capacity: 50,
    price: 0,
    description: '',
    hotelId: '',
    restaurantId: '',
    zoneIds: [] as string[],
};

export default function EventsListPage() {
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);

    const [formData, setFormData] = useState(EMPTY_FORM);

    const [hotels, setHotels] = useState<HotelSummary[]>([]);
    const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
    const [availableZones, setAvailableZones] = useState<ZoneSummary[]>([]);

    useEffect(() => {
        async function fetchZones() {
            try {
                if (formData.restaurantId) {
                    const data = await fetchAPIAdmin<ZoneSummary[]>(`/restaurant/${formData.restaurantId}/zones`);
                    setAvailableZones(data);
                } else if (formData.hotelId) {
                    const data = await fetchAPIAdmin<ZoneSummary[]>(`/property/hotels/${formData.hotelId}/zones`);
                    setAvailableZones(data);
                } else {
                    setAvailableZones([]);
                }
            } catch {
                setAvailableZones([]);
            }
        }
        fetchZones();
    }, [formData.restaurantId, formData.hotelId]);

    useEffect(() => {
        loadEvents();
        loadEstablishments();
    }, []);

    async function loadEstablishments() {
        try {
            const [hotelsData, restaurantsData] = await Promise.all([
                fetchAPIAdmin<HotelSummary[]>('/property/hotels'),
                fetchAPIAdmin<RestaurantSummary[]>('/restaurant'),
            ]);
            setHotels(Array.isArray(hotelsData) ? hotelsData : []);
            setRestaurants(Array.isArray(restaurantsData) ? restaurantsData : []);
        } catch (e) {
            console.error('Error loading establishments', e);
        }
    }

    async function loadEvents() {
        setLoading(true);
        try {
            const data = await fetchAPIAdmin<EventSummary[]>('/event');
            if (Array.isArray(data)) setEvents(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleHotelChange = (hotelId: string) => {
        const selectedHotel = hotels.find(h => h.id === hotelId);
        setFormData({
            ...formData,
            hotelId,
            restaurantId: selectedHotel?.restaurantId || formData.restaurantId,
            zoneIds: [],
        });
    };

    const handleRestaurantChange = (restaurantId: string) => {
        const linkedHotel = hotels.find(h => h.restaurantId === restaurantId);
        setFormData({
            ...formData,
            restaurantId,
            hotelId: linkedHotel?.id || formData.hotelId,
            zoneIds: [],
        });
    };

    async function handleCreate(e?: React.FormEvent) {
        e?.preventDefault();
        if (!formData.name || !formData.date) {
            alert('Nombre y fecha son obligatorios');
            return;
        }
        if (!formData.hotelId && !formData.restaurantId) {
            alert('Debes vincular el evento a un hotel o restaurante');
            return;
        }
        if (formData.zoneIds.length === 0) {
            alert('Debes seleccionar al menos una sala / zona para el evento');
            return;
        }
        if (!formData.duration || formData.duration < 15) {
            alert('La duración debe ser de al menos 15 minutos');
            return;
        }
        setCreating(true);
        try {
            await fetchAPIAdmin('/event', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    hotelId: formData.hotelId || null,
                    restaurantId: formData.restaurantId || null,
                }),
            });
            setFormData(EMPTY_FORM);
            setShowCreate(false);
            loadEvents();
        } catch (e) {
            console.error(e);
            alert('Error creando evento');
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Programación"
                title="Gestión de eventos"
                description="Crea y gestiona eventos puntuales para tus establecimientos."
                actions={
                    <Button
                        variant={showCreate ? 'outline' : 'default'}
                        onClick={() => setShowCreate(!showCreate)}
                    >
                        {showCreate
                            ? <><X className="size-4" /> Cerrar</>
                            : <><Plus className="size-4" /> Nuevo evento</>}
                    </Button>
                }
            />

            {showCreate && (
                <Card className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                            <CalendarIcon className="size-4 text-primary" />
                            Configurar nuevo evento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field id="ev-name" label="Nombre del evento">
                                    <Input
                                        id="ev-name"
                                        placeholder="Ej. Cena de Gala San Juan"
                                        className="h-10"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </Field>
                                <Field id="ev-date" label="Fecha y hora de inicio">
                                    <Input
                                        id="ev-date"
                                        type="datetime-local"
                                        className="h-10"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </Field>

                                <Field id="ev-duration" label="Duración (minutos)">
                                    <Input
                                        id="ev-duration"
                                        type="number"
                                        min={15}
                                        step={15}
                                        className="h-10 tabular-nums"
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                                        required
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Las salas seleccionadas se bloquean para reservas ordinarias durante esta franja.
                                    </p>
                                </Field>

                                <Field id="ev-hotel" label="Hotel vinculado" icon={Building2}>
                                    <Select value={formData.hotelId || 'none'} onValueChange={v => handleHotelChange(v === 'none' ? '' : v)}>
                                        <SelectTrigger id="ev-hotel" className="w-full h-10">
                                            <SelectValue placeholder="Ninguno" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {hotels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field id="ev-rest" label="Restaurante vinculado" icon={Utensils}>
                                    <Select value={formData.restaurantId || 'none'} onValueChange={v => handleRestaurantChange(v === 'none' ? '' : v)}>
                                        <SelectTrigger id="ev-rest" className="w-full h-10">
                                            <SelectValue placeholder="Ninguno" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Al vincular un restaurante, se aplicarán sus políticas de Stripe/No-Show.
                                    </p>
                                </Field>

                                <Field id="ev-capacity" label="Capacidad total (pax)" icon={Users}>
                                    <Input
                                        id="ev-capacity"
                                        type="number"
                                        min={1}
                                        className="h-10"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                                    />
                                </Field>
                                <Field id="ev-price" label="Precio por persona (€)" icon={Euro}>
                                    <Input
                                        id="ev-price"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="h-10"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </Field>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-eyebrow flex items-center gap-1.5">
                                    <Utensils className="size-3" />
                                    Salas / áreas reservadas
                                </Label>
                                {(formData.restaurantId || formData.hotelId) ? (
                                    availableZones.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {availableZones.map(zone => {
                                                const checked = formData.zoneIds.includes(zone.id);
                                                return (
                                                    <label
                                                        key={zone.id}
                                                        className="flex items-center gap-2 p-2.5 rounded-md border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={(v) => {
                                                                const newIds = v
                                                                    ? [...formData.zoneIds, zone.id]
                                                                    : formData.zoneIds.filter(id => id !== zone.id);
                                                                setFormData({ ...formData, zoneIds: newIds });
                                                            }}
                                                        />
                                                        <span className="text-sm font-medium">{zone.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                            Este establecimiento no tiene salas configuradas.
                                        </p>
                                    )
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">
                                        Selecciona un hotel o restaurante para ver sus salas.
                                    </p>
                                )}
                            </div>

                            <Field id="ev-desc" label="Descripción del evento">
                                <Textarea
                                    id="ev-desc"
                                    placeholder="Detalles, menú, condiciones…"
                                    className="resize-none"
                                    rows={4}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </Field>

                            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={creating}>
                                    {creating ? 'Creando…' : 'Crear evento'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <section>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                                <CardContent className="space-y-4">
                                    <Skeleton className="size-10 rounded-md" />
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                    <Skeleton className="h-12 w-full" />
                                </CardContent>
                            </Card>
                        ))
                    ) : events.length === 0 ? (
                        <Card className="sm:col-span-2 lg:col-span-3">
                            <CardContent>
                                <EmptyState
                                    icon={PartyPopper}
                                    title="No hay eventos activos"
                                    description="Comienza creando un evento puntual para tus restaurantes u hoteles."
                                    action={
                                        <Button onClick={() => setShowCreate(true)}>
                                            <Plus className="size-4" /> Nuevo evento
                                        </Button>
                                    }
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        events.map(event => <EventCard key={event.id} event={event} />)
                    )}
                </div>
            </section>
        </div>
    );
}

function EventCard({ event }: { event: EventSummary }) {
    const occupancy = Math.min(100, (event._count.bookings / event.capacity) * 100);

    return (
        <Card className="transition-shadow hover:shadow-md gap-4">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="grid place-items-center size-10 rounded-md bg-primary/10 text-primary shrink-0">
                        <PartyPopper className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-display text-base font-medium tracking-tight truncate">{event.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <CalendarIcon className="size-3" />
                            {format(new Date(event.date), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
                        </p>
                    </div>
                </div>
                <StatusBadge tone={event.isActive ? 'success' : 'neutral'}>
                    {event.isActive ? 'Activo' : 'Inactivo'}
                </StatusBadge>
            </CardHeader>
            <CardContent className="space-y-4">
                {(event.hotel || event.restaurant || (event.zones?.length ?? 0) > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                        {event.hotel && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-foreground text-xs rounded">
                                <Building2 className="size-3 text-muted-foreground" /> {event.hotel.name}
                            </span>
                        )}
                        {event.restaurant && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-foreground text-xs rounded">
                                <Utensils className="size-3 text-muted-foreground" /> {event.restaurant.name}
                            </span>
                        )}
                        {event.zones?.map(zone => (
                            <span key={zone.id} className="px-2 py-0.5 text-[11px] uppercase tracking-wider font-medium bg-accent text-accent-foreground rounded">
                                {zone.name}
                            </span>
                        ))}
                    </div>
                )}

                <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground inline-flex items-center gap-1.5">
                            <Users className="size-3.5" /> Ocupación
                        </span>
                        <span className="font-medium tabular-nums">
                            {event._count.bookings} / {event.capacity} pax
                        </span>
                    </div>
                    <div className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-primary h-full rounded-full transition-all duration-700"
                            style={{ width: `${occupancy}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                            <Euro className="size-3.5" /> Precio
                        </span>
                        <span className="font-display text-xl font-medium tabular-nums">{event.price ?? 0}€</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/events/${event.id}`}>Detalles</Link>
                    </Button>
                    <Button variant="default" size="sm" asChild>
                        <Link href={`/admin/events/${event.id}/config`}>Gestionar</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function Field({
    id,
    label,
    icon: Icon,
    children,
}: {
    id?: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-eyebrow flex items-center gap-1.5">
                {Icon && <Icon className="size-3" />}
                {label}
            </Label>
            {children}
        </div>
    );
}
