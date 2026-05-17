'use client';

import { Building2, Utensils, ChevronsUpDown, Check, MapPin, Sparkles, Plus } from 'lucide-react';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

type ContextItem = { id: string; name: string; restaurantId?: string | null };

function LocationSwitcherContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Remote Data
    const [hotels, setHotels] = useState<ContextItem[]>([]);
    const [restaurants, setRestaurants] = useState<ContextItem[]>([]);

    // Read URL state
    const contextType = searchParams.get('context') || 'hotel'; // hotel | restaurant
    const contextId = searchParams.get('id');

    useEffect(() => {
        loadContexts();
    }, []);

    // Refresh on open to ensure data is fresh, but avoid redundant calls
    useEffect(() => {
        if (open) {
            loadContexts();
        }
    }, [open]);

    async function loadContexts() {
        setLoading(true);
        try {
            const data = await fetchAPI<{ hotels?: ContextItem[]; restaurants?: ContextItem[] }>('/global/contexts');
            if (data && typeof data === 'object') {
                // Deduplicate items by ID to prevent UI glitches
                const hList = Array.isArray(data.hotels) ? data.hotels : [];
                const rList = Array.isArray(data.restaurants) ? data.restaurants : [];

                const uniqueHotels = Array.from(new Map(hList.map(h => [h.id, h])).values());
                const uniqueRestaurants = Array.from(new Map(rList.map(r => [r.id, r])).values());

                setHotels(uniqueHotels);
                setRestaurants(uniqueRestaurants);
            }
        } catch (e) {
            console.error("Failed to load contexts", e);
        } finally {
            setLoading(false);
        }
    }

    // Determine active display label
    const activeInfo = useMemo(() => {
        if (contextType === 'hotel') {
            const h = hotels.find(h => h.id === contextId);
            return {
                label: h ? h.name : "Hotel (General)",
                icon: Building2,
                color: "text-blue-500"
            };
        } else {
            const r = restaurants.find(r => r.id === contextId);
            return {
                label: r ? r.name : "Restaurante (General)",
                icon: Utensils,
                color: "text-orange-500"
            };
        }
    }, [contextType, contextId, hotels, restaurants]);

    const handleSelect = (type: string, id: string) => {
        setOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set('context', type);
        params.set('id', id);
        router.push(`?${params.toString()}`);
    };

    // Helper to find restaurant by id
    const getRestaurant = (id: string) => restaurants.find(r => r.id === id);
    
    // Find restaurants that are NOT linked to any hotel
    const standaloneRestaurants = restaurants.filter(r => {
        const isLinked = hotels.some(h => h.restaurantId === r.id);
        return !isLinked;
    });

    return (
        <div className="relative">
            <Button
                variant="ghost"
                role="combobox"
                aria-expanded={open}
                className={`w-[280px] h-11 justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900 shadow-sm transition-all duration-300 rounded-xl group ${open ? 'ring-2 ring-primary/20 border-primary/30' : ''}`}
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center gap-3 truncate">
                    <div className={`p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:scale-110 transition-transform ${activeInfo.color}`}>
                        <activeInfo.icon className="h-4 w-4 shrink-0" />
                    </div>
                    <span className="truncate font-bold text-xs uppercase tracking-widest">{activeInfo.label}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30 group-hover:opacity-100 transition-opacity" />
            </Button>

            {open && (
                <div className="absolute top-[52px] left-0 w-[320px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 max-h-[550px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200 origin-top">
                    {/* Header */}
                    <div className="px-3 py-2 flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Propiedades y Servicios</span>
                        {loading && <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                    </div>

                    {/* Hotels & Their Restaurants */}
                    <div className="space-y-1">
                        {hotels.map(h => {
                            const linkedRest = h.restaurantId ? getRestaurant(h.restaurantId) : null;
                            const isActive = contextType === 'hotel' && contextId === h.id;
                            
                            return (
                                <div key={h.id} className="group/item">
                                    <div
                                        className={`flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer rounded-xl transition-all ${isActive ? "bg-primary/10 text-primary font-bold shadow-inner" : "text-zinc-600 dark:text-zinc-400"}`}
                                        onClick={() => handleSelect('hotel', h.id)}
                                    >
                                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 group-hover/item:bg-white dark:group-hover/item:bg-zinc-700'}`}>
                                            <Building2 className="h-4 w-4 shrink-0" />
                                        </div>
                                        <span className="truncate flex-1">{h.name}</span>
                                        {isActive && <Check className="h-4 w-4 shrink-0" />}
                                    </div>
                                    
                                    {linkedRest && (
                                        <div
                                            className={`flex items-center gap-3 ml-8 mr-1 mt-1 px-3 py-2 text-xs hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer rounded-lg border-l-2 transition-all ${contextType === 'restaurant' && contextId === linkedRest.id ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-bold border-orange-400 shadow-sm" : "text-zinc-500 dark:text-zinc-500 border-zinc-100 dark:border-zinc-800"}`}
                                            onClick={() => handleSelect('restaurant', linkedRest.id)}
                                        >
                                            <Utensils className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                            <span className="truncate flex-1">{linkedRest.name}</span>
                                            <span className="text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-sm">Sinergia</span>
                                            {contextType === 'restaurant' && contextId === linkedRest.id && <Check className="h-3 w-3 shrink-0" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {hotels.length === 0 && !loading && (
                            <div className="px-4 py-8 text-center space-y-3">
                                <div className="mx-auto w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-700">
                                    <Building2 className="w-5 h-5 text-zinc-300" />
                                </div>
                                <div className="text-[10px] text-zinc-400 font-medium italic">No se encontraron hoteles configurados</div>
                                <Button size="sm" variant="outline" className="h-7 text-[9px] font-bold uppercase rounded-full" onClick={() => window.location.href='/admin/hotels'}>
                                    <Plus className="w-3 h-3 mr-1" /> Configurar Ahora
                                </Button>
                            </div>
                        )}
                    </div>

                    {standaloneRestaurants.length > 0 && (
                        <>
                            <div className="my-3 mx-2 border-t border-zinc-100 dark:border-zinc-800" />
                            <div className="px-3 py-1 flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Otros Centros</span>
                            </div>
                            <div className="space-y-1">
                                {standaloneRestaurants.map(r => {
                                    const isActive = contextType === 'restaurant' && contextId === r.id;
                                    return (
                                        <div
                                            key={r.id}
                                            className={`flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer rounded-xl transition-all ${isActive ? "bg-orange-50 dark:bg-orange-900/10 text-orange-600 font-bold shadow-inner" : "text-zinc-600 dark:text-zinc-400"}`}
                                            onClick={() => handleSelect('restaurant', r.id)}
                                        >
                                            <div className={`p-1.5 rounded-lg ${isActive ? 'bg-orange-500 text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                                                <Utensils className="h-4 w-4 shrink-0" />
                                            </div>
                                            <span className="truncate flex-1">{r.name}</span>
                                            {isActive && <Check className="h-4 w-4 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function LocationSwitcher() {
    return (
        <Suspense fallback={<div className="w-[280px] h-11 bg-zinc-100 animate-pulse rounded-xl" />}>
            <LocationSwitcherContent />
        </Suspense>
    );
}
