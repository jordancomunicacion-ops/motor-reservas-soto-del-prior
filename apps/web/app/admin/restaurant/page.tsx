"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Utensils, Settings, LayoutDashboard, Share2, Users, RefreshCw } from 'lucide-react';

export default function RestaurantListPage() {
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadRestaurants();
    }, []);

    async function loadRestaurants() {
        setLoading(true);
        try {
            const data = await fetchAPI('/restaurant');
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
                <h1 className="text-2xl font-bold">Gestión de Restaurantes</h1>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow border border-gray-100 dark:border-zinc-700">
                <h2 className="text-lg font-semibold mb-4">Crear Nuevo Restaurante</h2>
                <div className="flex flex-col gap-2">
                    <label htmlFor="new-rest-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Restaurante</label>
                    <div className="flex gap-4">
                        <input
                            id="new-rest-name"
                            name="restaurant-name"
                            className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: El Cenador de Soto"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                        />
                        <Button onClick={handleCreate} className="gap-2">
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
                        <div key={rest.id} className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                                        <Utensils className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">{rest.name}</h3>
                                        <p className="text-xs text-muted-foreground">ID: {rest.id}</p>
                                    </div>
                                </div>
                                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-200 uppercase">
                                    Abierto
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-6">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2 text-xs" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}`}
                                >
                                    <LayoutDashboard className="w-3 h-3" /> Dashboard
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2 text-xs" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}/config?tab=general`}
                                >
                                    <Settings className="w-3 h-3" /> Ajustes
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2 text-xs" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}/connections`}
                                >
                                    <Share2 className="w-3 h-3" /> Conexiones
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="gap-2 text-xs" 
                                    onClick={() => window.location.href = `/admin/restaurant/${rest.id}/config?tab=access`}
                                >
                                    <Users className="w-3 h-3" /> Accesos
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
