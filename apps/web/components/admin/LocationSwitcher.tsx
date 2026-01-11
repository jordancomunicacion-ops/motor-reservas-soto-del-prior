'use client';

import { Building2, Utensils, ChevronsUpDown, Check } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';

type ContextItem = { id: string; name: string };

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

    return (
        <div className="relative">
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[250px] justify-between"
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center gap-2 truncate">
                    <ActiveIcon className="h-4 w-4 opacity-50 shrink-0" />
                    <span className="truncate">{activeLabel}</span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && (
                <div className="absolute top-12 left-0 w-[250px] bg-white border rounded shadow-lg p-1 z-50 max-h-[400px] overflow-y-auto">
                    {/* Hotels Group */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">HOTELES</div>
                    {hotels.map(h => (
                        <div
                            key={h.id}
                            className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() => handleSelect('hotel', h.id)}
                        >
                            <Check className={`h-4 w-4 ${contextType === 'hotel' && contextId === h.id ? "opacity-100" : "opacity-0"}`} />
                            <Building2 className="h-4 w-4 opacity-50" />
                            {h.name}
                        </div>
                    ))}
                    {hotels.length === 0 && <div className="px-2 py-1 text-xs text-gray-400">No hay hoteles</div>}

                    <div className="my-1 border-t" />

                    {/* Restaurants Group */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">RESTAURANTES</div>
                    {restaurants.map(r => (
                        <div
                            key={r.id}
                            className="flex items-center gap-2 px-2 py-2 text-sm hover:bg-gray-100 cursor-pointer rounded"
                            onClick={() => handleSelect('restaurant', r.id)}
                        >
                            <Check className={`h-4 w-4 ${contextType === 'restaurant' && contextId === r.id ? "opacity-100" : "opacity-0"}`} />
                            <Utensils className="h-4 w-4 opacity-50" />
                            {r.name}
                        </div>
                    ))}
                    {restaurants.length === 0 && <div className="px-2 py-1 text-xs text-gray-400">No hay restaurantes</div>}
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
