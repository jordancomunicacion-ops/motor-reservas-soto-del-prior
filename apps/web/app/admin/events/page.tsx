"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, PartyPopper, Settings, Calendar, Users, Euro, Info, Building2, Utensils } from 'lucide-react';
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

export default function EventsListPage() {
    const [events, setEvents] = useState<EventSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        capacity: 50,
        price: 0,
        description: '',
        hotelId: '',
        restaurantId: '',
        zoneIds: [] as string[]
    });

    const [hotels, setHotels] = useState<HotelSummary[]>([]);
    const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
    const [availableZones, setAvailableZones] = useState<ZoneSummary[]>([]);

    useEffect(() => {
        async function fetchZones() {
            if (formData.restaurantId) {
                try {
                    const data = await fetchAPI<ZoneSummary[]>(`/restaurant/${formData.restaurantId}/zones`);
                    setAvailableZones(data);
                } catch {
                    setAvailableZones([]);
                }
            } else if (formData.hotelId) {
                try {
                    const data = await fetchAPI<ZoneSummary[]>(`/property/hotels/${formData.hotelId}/zones`);
                    setAvailableZones(data);
                } catch {
                    setAvailableZones([]);
                }
            } else {
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
            const hotelsData = await fetchAPI<HotelSummary[]>('/property/hotels');
            const restaurantsData = await fetchAPI<RestaurantSummary[]>('/restaurant');

            setHotels(Array.isArray(hotelsData) ? hotelsData : []);
            setRestaurants(Array.isArray(restaurantsData) ? restaurantsData : []);
        } catch (e) {
            console.error('Error loading establishments', e);
        }
    }

    async function loadEvents() {
        setLoading(true);
        try {
            const data = await fetchAPI<EventSummary[]>('/event');
            if (Array.isArray(data)) {
                setEvents(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Handle Synergy Logic
    const handleHotelChange = (hotelId: string) => {
        const selectedHotel = hotels.find(h => h.id === hotelId);
        setFormData({
            ...formData,
            hotelId,
            // If hotel has a linked restaurant, auto-select it
            restaurantId: selectedHotel?.restaurantId || formData.restaurantId,
            zoneIds: []
        });
    };

    const handleRestaurantChange = (restaurantId: string) => {
        // Find if any hotel is linked to this restaurant
        const linkedHotel = hotels.find(h => h.restaurantId === restaurantId);
        setFormData({
            ...formData,
            restaurantId,
            hotelId: linkedHotel?.id || formData.hotelId,
            zoneIds: []
        });
    };

    async function handleCreate() {
        if (!formData.name || !formData.date) {
            alert('Nombre y fecha son obligatorios');
            return;
        }
        try {
            await fetchAPI('/event', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    hotelId: formData.hotelId || null,
                    restaurantId: formData.restaurantId || null
                })
            });
            setFormData({
                name: '',
                date: '',
                capacity: 50,
                price: 0,
                description: '',
                hotelId: '',
                restaurantId: '',
                zoneIds: []
            });
            setShowCreate(false);
            loadEvents();
        } catch (e) {
            alert('Error creando evento');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gestión de Eventos</h1>
                        <p className="text-xs text-muted-foreground">Crea y gestiona eventos puntuales para tus establecimientos.</p>
                    </div>
                </div>
                <Button onClick={() => setShowCreate(!showCreate)} className={`gap-2 ${showCreate ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20'}`}>
                    {showCreate ? 'Cerrar' : <><Plus className="w-4 h-4" /> Nuevo Evento</>}
                </Button>
            </div>

            {showCreate && (
                <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl shadow-2xl border border-primary/5 dark:border-zinc-700 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-2 mb-6 text-primary">
                        <Calendar className="w-5 h-5" />
                        <h2 className="text-lg font-bold uppercase tracking-widest">Configurar Nuevo Evento</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nombre del Evento</label>
                            <input
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Ej: Cena de Gala San Juan"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fecha y Hora</label>
                            <input
                                type="datetime-local"
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>

                        {/* Establishments linkage with Synergy Logic */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Hotel Vinculado
                            </label>
                            <select
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                                value={formData.hotelId}
                                onChange={e => handleHotelChange(e.target.value)}
                            >
                                <option value="">Ninguno</option>
                                {hotels.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <Utensils className="w-3 h-3" /> Restaurante Vinculado
                            </label>
                            <select
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                                value={formData.restaurantId}
                                onChange={e => handleRestaurantChange(e.target.value)}
                            >
                                <option value="">Ninguno</option>
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-muted-foreground italic">Al vincular un restaurante, se aplicarán sus políticas de Stripe/No-Show.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" /> Capacidad Total (Pax)
                            </label>
                            <input
                                type="number"
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                                value={formData.capacity}
                                onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Precio por Persona (€)</label>
                            <input
                                type="number"
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                <Utensils className="w-3 h-3" /> Salas / Áreas Reservadas
                            </label>
                            {(formData.restaurantId || formData.hotelId) ? (
                                availableZones.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {availableZones.map(zone => (
                                            <label key={zone.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={formData.zoneIds.includes(zone.id)}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked 
                                                            ? [...formData.zoneIds, zone.id]
                                                            : formData.zoneIds.filter(id => id !== zone.id);
                                                        setFormData({...formData, zoneIds: newIds});
                                                    }}
                                                />
                                                <span className="text-xs font-medium">{zone.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground italic">Este establecimiento no tiene salas configuradas.</p>
                                )
                            ) : (
                                <p className="text-[10px] text-muted-foreground italic">Selecciona un hotel o restaurante para ver sus salas.</p>
                            )}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descripción del Evento</label>
                            <textarea
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                                placeholder="Detalles, menú, condiciones..."
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} className="gap-2 bg-primary hover:opacity-90 text-white px-8 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
                            Crear Evento
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Cargando eventos...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                        <PartyPopper className="w-16 h-16 mx-auto text-zinc-300 mb-6" />
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No hay eventos activos</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">Comienza creando un evento puntual para tus restaurantes u hoteles.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 hover:shadow-xl hover:translate-y-[-4px] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${event.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {event.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                    <PartyPopper className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight leading-tight">{event.name}</h3>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {format(new Date(event.date), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {event.hotel && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-lg border border-blue-100">
                                        <Building2 className="w-3 h-3" /> {event.hotel.name}
                                    </div>
                                )}
                                {event.restaurant && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-600 text-[10px] font-bold uppercase rounded-lg border border-orange-100">
                                        <Utensils className="w-3 h-3" /> {event.restaurant.name}
                                    </div>
                                )}
                                {event.zones?.map(zone => (
                                    <div key={zone.id} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[9px] font-bold uppercase rounded">
                                        {zone.name}
                                    </div>
                                ))}
                            </div>
                            
                             <div className="space-y-4 mb-6 bg-secondary/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-primary/5">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Ocupación</span>
                                    <span className="text-primary">{event._count.bookings} / {event.capacity} pax</span>
                                </div>
                                <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-primary h-full rounded-full transition-all duration-700" 
                                        style={{ width: `${Math.min(100, (event._count.bookings / event.capacity) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5"><Euro className="w-4 h-4" /> Precio</span>
                                    <span className="text-2xl font-black text-primary tracking-tighter">{event.price}€</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl text-xs font-bold uppercase tracking-widest transition-colors hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/events/${event.id}`}
                                >
                                    Detalles
                                </Button>
                                <Button 
                                    className="bg-primary hover:opacity-90 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md shadow-primary/10" 
                                    onClick={() => window.location.href = `/admin/events/${event.id}/config`}
                                >
                                    Gestionar
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
