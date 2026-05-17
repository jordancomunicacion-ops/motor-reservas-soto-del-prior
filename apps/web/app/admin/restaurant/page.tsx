"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Utensils, Settings, LayoutDashboard, Share2, Users, RefreshCw } from 'lucide-react';

interface RestaurantRow {
    id: string;
    name: string;
    currency?: string;
}

export default function RestaurantListPage() {
    const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadRestaurants();
    }, []);

    async function loadRestaurants() {
        setLoading(true);
        try {
            const data = await fetchAPI<RestaurantRow[]>('/restaurant');
            if (Array.isArray(data)) {
                setRestaurants(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName) {
            alert('Por favor, introduce un nombre para el restaurante antes de crearlo.');
            return;
        }
        try {
            await fetchAPI('/restaurant', {
                method: 'POST',
                body: JSON.stringify({ name: newName, currency: 'EUR' })
            });
            alert('Restaurante creado con éxito');
            setNewName('');
            loadRestaurants();
        } catch (e) {
            console.error('Error creating restaurant:', e);
            alert('Error creando restaurante. Por favor, asegúrese de que el servidor está funcionando.');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary">
                        <Utensils className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gestión de Restaurantes</h1>
                        <p className="text-xs text-muted-foreground">Configura y administra tus centros de restauración.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl shadow-xl border border-primary/5 dark:border-zinc-700">
                <h2 className="text-lg font-bold uppercase tracking-widest text-primary mb-6">Crear Nuevo Restaurante</h2>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-3 space-y-2">
                            <label htmlFor="new-rest-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre del Restaurante</label>
                            <input
                                id="new-rest-name"
                                name="restaurant-name"
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-primary outline-none transition-all"
                                placeholder="Ej: El Cenador de Soto"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleCreate} className="h-12 bg-primary hover:opacity-90 text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4" /> Crear Restaurante
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Cargando restaurantes...</p>
                ) : restaurants.length === 0 ? (
                    <p className="text-muted-foreground">No hay restaurantes registrados.</p>
                ) : (
                    restaurants.map(rest => (
                        <div key={rest.id} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 hover:shadow-xl hover:translate-y-[-4px] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-3 py-1 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400 uppercase tracking-wider">
                                    Abierto
                                </span>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                    <Utensils className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight">{rest.name}</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">#{rest.id.substring(0, 8).toUpperCase()}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}?context=restaurant&id=${rest.id}`}
                                >
                                    <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Dashboard
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}/config?tab=general&context=restaurant&id=${rest.id}`}
                                >
                                    <Settings className="w-3.5 h-3.5 mr-2" /> Ajustes
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}/connections?context=restaurant&id=${rest.id}`}
                                >
                                    <Share2 className="w-3.5 h-3.5 mr-2" /> Conexiones
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}/config?tab=access&context=restaurant&id=${rest.id}`}
                                >
                                    <Users className="w-3.5 h-3.5 mr-2" /> Accesos
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
