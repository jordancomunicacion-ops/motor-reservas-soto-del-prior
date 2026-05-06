"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PartyPopper, Calendar, Users, Euro, ArrowLeft, Save, Trash2, Building2, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function EventConfigPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        capacity: 50,
        price: 0,
        description: '',
        isActive: true,
        hotelId: '',
        restaurantId: '',
        zoneIds: [] as string[]
    });

    const [hotels, setHotels] = useState<any[]>([]);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [availableZones, setAvailableZones] = useState<any[]>([]);

    useEffect(() => {
        if (formData.restaurantId) {
            fetchAPI(`/restaurant/${formData.restaurantId}/zones`)
                .then(setAvailableZones)
                .catch(() => setAvailableZones([]));
        } else {
            setAvailableZones([]);
        }
    }, [formData.restaurantId]);

    useEffect(() => {
        if (params.id) {
            loadData();
        }
    }, [params.id]);

    async function loadData() {
        setLoading(true);
        try {
            console.log('Loading data for event:', params.id);
            const [event, hotelsData, restaurantsData] = await Promise.all([
                fetchAPI(`/event/${params.id}`),
                fetchAPI('/property/hotels'),
                fetchAPI('/restaurant')
            ]).catch(err => {
                console.error('Error in Promise.all loadData:', err);
                return [null, [], []];
            });
            
            console.log('Data fetched:', { event, hotelsData, restaurantsData });

            if (event) {
                // Check if event is an array (mock data issue)
                const eventObj = Array.isArray(event) ? event[0] : event;
                if (eventObj) {
                    const eventDate = new Date(eventObj.date);
                    const formattedDate = format(eventDate, "yyyy-MM-dd'T'HH:mm");

                    setFormData({
                        name: eventObj.name,
                        date: formattedDate,
                        capacity: eventObj.capacity,
                        price: Number(eventObj.price),
                        description: eventObj.description || '',
                        isActive: eventObj.isActive,
                        hotelId: eventObj.hotelId || '',
                        restaurantId: eventObj.restaurantId || '',
                        zoneIds: eventObj.zones?.map((z: any) => z.id) || []
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

    if (loading) return <div className="p-8">Cargando configuración del evento...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Configurar Evento</h1>
                        <p className="text-muted-foreground text-sm">Edita los detalles y vinculaciones del evento</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="text-red-500 hover:text-red-600 border-red-200" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                        <Save className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <PartyPopper className="w-5 h-5 text-blue-500" /> Información General
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre del Evento</label>
                                <input
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Fecha y Hora</label>
                                    <input
                                        type="datetime-local"
                                        className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Estado</label>
                                    <select
                                        className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.isActive ? 'true' : 'false'}
                                        onChange={e => setFormData({...formData, isActive: e.target.value === 'true'})}
                                    >
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo / Borrador</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descripción</label>
                                <textarea
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none h-32"
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-500" /> Vinculación de Establecimiento
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Building2 className="w-4 h-4" /> Hotel
                                </label>
                                <select
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.hotelId}
                                    onChange={e => setFormData({...formData, hotelId: e.target.value, restaurantId: e.target.value ? '' : formData.restaurantId})}
                                >
                                    <option value="">Ninguno</option>
                                    {hotels.map(h => (
                                        <option key={h.id} value={h.id}>{h.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Utensils className="w-4 h-4" /> Restaurante
                                </label>
                                <select
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.restaurantId}
                                    onChange={e => setFormData({...formData, restaurantId: e.target.value, hotelId: e.target.value ? '' : formData.hotelId})}
                                >
                                    <option value="">Ninguno</option>
                                    {restaurants.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-orange-500" /> Salas / Áreas Reservadas
                        </h2>
                        {formData.restaurantId ? (
                            availableZones.length > 0 ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-muted-foreground mb-4">
                                        Selecciona las salas que ocupará este evento. Las mesas en estas áreas quedarán bloqueadas para reservas normales.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableZones.map(zone => (
                                            <label key={zone.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={formData.zoneIds.includes(zone.id)}
                                                    onChange={(e) => {
                                                        const newIds = e.target.checked 
                                                            ? [...formData.zoneIds, zone.id]
                                                            : formData.zoneIds.filter(id => id !== zone.id);
                                                        setFormData({...formData, zoneIds: newIds});
                                                    }}
                                                />
                                                <span className="text-sm font-medium">{zone.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic bg-gray-50 p-4 rounded-lg">Este restaurante no tiene salas configuradas.</p>
                            )
                        ) : (
                            <p className="text-sm text-muted-foreground italic bg-gray-50 p-4 rounded-lg">Selecciona un restaurante primero para ver sus salas.</p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Euro className="w-5 h-5 text-green-500" /> Precios y Capacidad
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Precio por Persona (€)</label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="number"
                                        className="border pl-10 pr-4 py-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.price}
                                        onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Capacidad Total (Pax)
                                </label>
                                <input
                                    type="number"
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.capacity}
                                    onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
