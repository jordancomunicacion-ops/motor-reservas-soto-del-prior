"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, PartyPopper, Settings, Calendar, Users, Euro, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EventsListPage() {
    const [events, setEvents] = useState<any[]>([]);
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
        restaurantId: ''
    });

    const [hotels, setHotels] = useState<any[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);

    useEffect(() => {
        loadEvents();
        loadEstablishments();
    }, []);

    async function loadEstablishments() {
        try {
            const hotelsData = await fetchAPI('/property/hotels');
            const restaurantsData = await fetchAPI('/restaurant');
            
            console.log('Hotels loaded:', hotelsData);
            console.log('Restaurants loaded:', restaurantsData);
            
            setHotels(Array.isArray(hotelsData) ? hotelsData : []);
            setRestaurants(Array.isArray(restaurantsData) ? restaurantsData : []);
        } catch (e) {
            console.error('Error loading establishments', e);
            setHotels([]);
            setRestaurants([]);
        }
    }

    async function loadEvents() {
        setLoading(true);
        try {
            const data = await fetchAPI('/event');
            if (Array.isArray(data)) {
                setEvents(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!formData.name || !formData.date) return;
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
                restaurantId: ''
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
                <h1 className="text-2xl font-bold">Gestión de Eventos</h1>
                <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
                    <Plus className="w-4 h-4" /> {showCreate ? 'Cancelar' : 'Nuevo Evento'}
                </Button>
            </div>

            {showCreate && (
                <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow border border-gray-100 dark:border-zinc-700 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h2 className="text-lg font-semibold mb-4">Crear Nuevo Evento Puntual</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre del Evento</label>
                            <input
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ej: Cena de Gala San Juan"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fecha</label>
                            <input
                                type="datetime-local"
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.date}
                                onChange={e => setFormData({...formData, date: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Hotel Vinculado (Opcional)</label>
                            <select
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.hotelId}
                                onChange={e => setFormData({...formData, hotelId: e.target.value})}
                            >
                                <option value="">Ninguno</option>
                                {hotels.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Restaurante Vinculado (Opcional)</label>
                            <select
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.restaurantId}
                                onChange={e => setFormData({...formData, restaurantId: e.target.value})}
                            >
                                <option value="">Ninguno</option>
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Capacidad (Pax)</label>
                            <input
                                type="number"
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.capacity}
                                onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Precio por Persona (€)</label>
                            <input
                                type="number"
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium">Descripción</label>
                            <textarea
                                className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none h-24"
                                placeholder="Detalles del evento..."
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleCreate} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4" /> Crear Evento
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Cargando eventos...</p>
                ) : events.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
                        <PartyPopper className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-muted-foreground font-medium">No hay eventos programados.</p>
                        <p className="text-sm text-muted-foreground">Comienza creando tu primer evento puntual.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${event.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {event.isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600">
                                    <PartyPopper className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold group-hover:text-purple-600 transition-colors">{event.name}</h3>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(event.date), "PPP p", { locale: es })}
                                        </p>
                                        {event.hotel && (
                                            <p className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded w-fit font-medium">
                                                Hotel: {event.hotel.name}
                                            </p>
                                        )}
                                        {event.restaurant && (
                                            <p className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded w-fit font-medium">
                                                Restaurante: {event.restaurant.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Ocupación</span>
                                    <span className="font-semibold">{event._count.bookings} reservas / {event.capacity} pax</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.min(100, (event._count.bookings / event.capacity) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><Euro className="w-4 h-4" /> Precio</span>
                                    <span className="font-bold text-lg">{event.price}€</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2 text-xs" 
                                    onClick={() => window.location.href = `/admin/events/${event.id}`}
                                >
                                    <Info className="w-3 h-3" /> Ver Detalles
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2 text-xs" 
                                    onClick={() => window.location.href = `/admin/events/${event.id}/config`}
                                >
                                    <Settings className="w-3 h-3" /> Editar
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
