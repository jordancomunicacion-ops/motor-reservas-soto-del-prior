"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Building2, Settings, Share2, LayoutDashboard, BedDouble, Users, RefreshCw } from 'lucide-react';

export default function HotelsPage() {
    const [hotels, setHotels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Simple Create Form State
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadHotels();
    }, []);

    async function loadHotels() {
        setLoading(true);
        try {
            const data = await fetchAPI('/property/hotels');
            if (Array.isArray(data)) {
                setHotels(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!newName) {
            alert('Por favor, introduce un nombre para el hotel antes de crearlo.');
            return;
        }
        try {
            await fetchAPI('/property/hotels', {
                method: 'POST',
                body: JSON.stringify({ name: newName, currency: 'EUR', timezone: 'Europe/Madrid' })
            });
            alert('Hotel creado con éxito');
            setNewName('');
            loadHotels();
        } catch (e) {
            console.error('Error creating hotel:', e);
            alert('Error creando hotel. Por favor, asegúrese de que el servidor está funcionando.');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Gestión de Hoteles</h1>
                        <p className="text-xs text-muted-foreground">Configura y administra tus propiedades hoteleras.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-8 rounded-3xl shadow-xl border border-primary/5 dark:border-zinc-700">
                <h2 className="text-lg font-bold uppercase tracking-widest text-primary mb-6">Crear Nuevo Hotel</h2>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-3 space-y-2">
                            <label htmlFor="new-hotel-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nombre del Hotel</label>
                            <input
                                id="new-hotel-name"
                                name="hotel-name"
                                className="border-2 p-3 rounded-xl w-full dark:bg-zinc-900 focus:border-primary outline-none transition-all"
                                placeholder="Ej: Soto del Prior Boutique"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                            />
                        </div>
                        <Button onClick={handleCreate} className="h-12 bg-primary hover:opacity-90 text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4 mr-2" /> Crear Hotel
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Cargando hoteles...</p>
                ) : hotels.length === 0 ? (
                    <p className="text-muted-foreground">No hay hoteles registrados.</p>
                ) : (
                    hotels.map(hotel => (
                        <div key={hotel.id} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 hover:shadow-xl hover:translate-y-[-4px] transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4">
                                <span className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/20 uppercase tracking-wider">
                                    Activo
                                </span>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight">{hotel.name}</h3>
                                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">#{hotel.id.substring(0, 8)}</p>
                                </div>
                            </div>

                            <div className="space-y-2 mb-6 bg-secondary/30 dark:bg-zinc-900/50 p-4 rounded-xl border border-primary/5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest">Moneda</span>
                                    <span className="font-bold">{hotel.currency}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground font-bold uppercase text-[9px] tracking-widest">Zona Horaria</span>
                                    <span className="font-medium text-xs">{hotel.timezone}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-8">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/hotels/${hotel.id}`}
                                >
                                    <LayoutDashboard className="w-3.5 h-3.5 mr-2" /> Dashboard
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/hotels/${hotel.id}/config?tab=general`}
                                >
                                    <Settings className="w-3.5 h-3.5 mr-2" /> Ajustes
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/hotels/${hotel.id}/inventory`}
                                >
                                    <BedDouble className="w-3.5 h-3.5 mr-2" /> Inventario
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary" 
                                    onClick={() => window.location.href = `/admin/hotels/${hotel.id}/connections`}
                                >
                                    <Share2 className="w-3.5 h-3.5 mr-2" /> Conexiones
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-secondary col-span-2" 
                                    onClick={() => window.location.href = `/admin/hotels/${hotel.id}/config?tab=access`}
                                >
                                    <Users className="w-3.5 h-3.5 mr-2" /> Gestionar Accesos
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
