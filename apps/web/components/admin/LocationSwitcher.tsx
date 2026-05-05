'use client';

import { Building2, Utensils, ChevronsUpDown, Check } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

type ContextItem = { id: string; name: string; restaurantId?: string | null };

function LocationSwitcherContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);

    // Remote Data
    const [hotels, setHotels] = useState<ContextItem[]>([]);
    const [restaurants, setRestaurants] = useState<ContextItem[]>([]);

    // Read URL state
    const contextType = searchParams.get('context') || 'hotel'; // hotel | restaurant
    const contextId = searchParams.get('id');

    useEffect(() => {
        loadContexts();
    }, []);

    useEffect(() => {
        if (open) {
            loadContexts();
        }
    }, [open]);

    async function loadContexts() {
        try {
            const data = await fetchAPI('/global/contexts');
            if (data) {
                setHotels(data.hotels || []);
                setRestaurants(data.restaurants || []);
            }
        } catch (e) {
            console.error("Failed to load contexts");
        }
    }

    // Determine active display label
    let activeLabel = "Seleccionar...";
    let ActiveIcon = Building2;

    if (contextType === 'hotel') {
        const h = hotels.find(h => h.id === contextId);
        activeLabel = h ? h.name : "Hotel (General)";
    } else {
        const r = restaurants.find(r => r.id === contextId);
        activeLabel = r ? r.name : "Restaurante (General)";
        ActiveIcon = Utensils;
    }

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
    const standaloneRestaurants = restaurants.filter(r => !hotels.some(h => h.restaurantId === r.id));

    return (
        <div className="relative">
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[280px] justify-between"
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center gap-2 truncate">
                    <ActiveIcon className="h-4 w-4 opacity-50 shrink-0" />
                    <span className="truncate">{activeLabel}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && (
                <div className="absolute top-12 left-0 w-[280px] bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded shadow-lg p-1 z-50 max-h-[500px] overflow-y-auto">
                    {/* Hotels & Their Restaurants */}
                    <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Propiedades y Servicios</div>
                    {hotels.map(h => {
                        const linkedRest = h.restaurantId ? getRestaurant(h.restaurantId) : null;
                        
                        return (
                            <div key={h.id} className="mb-1">
                                <div
                                    className={`flex items-center gap-2 px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer rounded ${contextType === 'hotel' && contextId === h.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium" : ""}`}
                                    onClick={() => handleSelect('hotel', h.id)}
                                >
                                    <Check className={`h-4 w-4 shrink-0 ${contextType === 'hotel' && contextId === h.id ? "opacity-100" : "opacity-0"}`} />
                                    <Building2 className="h-4 w-4 opacity-50 shrink-0" />
                                    <span className="truncate">{h.name}</span>
                                </div>
                                
                                {linkedRest && (
                                    <div
                                        className={`flex items-center gap-2 ml-6 mr-1 px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer rounded border-l-2 border-gray-100 dark:border-zinc-800 ${contextType === 'restaurant' && contextId === linkedRest.id ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-medium border-orange-200" : "text-muted-foreground"}`}
                                        onClick={() => handleSelect('restaurant', linkedRest.id)}
                                    >
                                        <Check className={`h-3 w-3 shrink-0 ${contextType === 'restaurant' && contextId === linkedRest.id ? "opacity-100" : "opacity-0"}`} />
                                        <Utensils className="h-3 w-3 opacity-50 shrink-0" />
                                        <span className="truncate">{linkedRest.name}</span>
                                        <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 px-1 rounded ml-auto font-bold uppercase">Sinergia</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {hotels.length === 0 && <div className="px-2 py-1 text-xs text-gray-400 italic">No hay hoteles</div>}

                    {standaloneRestaurants.length > 0 && (
                        <>
                            <div className="my-1 border-t dark:border-zinc-800" />
                            <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Otros Restaurantes</div>
                            {standaloneRestaurants.map(r => (
                                <div
                                    key={r.id}
                                    className={`flex items-center gap-2 px-2 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer rounded ${contextType === 'restaurant' && contextId === r.id ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 font-medium" : ""}`}
                                    onClick={() => handleSelect('restaurant', r.id)}
                                >
                                    <Check className={`h-4 w-4 shrink-0 ${contextType === 'restaurant' && contextId === r.id ? "opacity-100" : "opacity-0"}`} />
                                    <Utensils className="h-4 w-4 opacity-50 shrink-0" />
                                    <span className="truncate">{r.name}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function LocationSwitcher() {
    return (
        <Suspense fallback={<div className="w-[250px] h-10 bg-gray-100 animate-pulse rounded" />}>
            <LocationSwitcherContent />
        </Suspense>
    );
}
