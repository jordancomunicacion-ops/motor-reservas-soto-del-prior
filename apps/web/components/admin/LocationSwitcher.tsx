'use client';

import { Building2, Utensils, ChevronsUpDown, Check, Plus, Loader2 } from 'lucide-react';
import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

type ContextItem = { id: string; name: string; restaurantId?: string | null };

function LocationSwitcherContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const [hotels, setHotels] = useState<ContextItem[]>([]);
    const [restaurants, setRestaurants] = useState<ContextItem[]>([]);

    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');

    useEffect(() => {
        loadContexts();
    }, []);

    useEffect(() => {
        if (open) loadContexts();
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    async function loadContexts() {
        setLoading(true);
        try {
            const data = await fetchAPI<{ hotels?: ContextItem[]; restaurants?: ContextItem[] }>('/global/contexts');
            if (data && typeof data === 'object') {
                const hList = Array.isArray(data.hotels) ? data.hotels : [];
                const rList = Array.isArray(data.restaurants) ? data.restaurants : [];
                setHotels(Array.from(new Map(hList.map(h => [h.id, h])).values()));
                setRestaurants(Array.from(new Map(rList.map(r => [r.id, r])).values()));
            }
        } catch (e) {
            console.error("Failed to load contexts", e);
        } finally {
            setLoading(false);
        }
    }

    const activeInfo = useMemo(() => {
        if (contextType === 'hotel') {
            const h = hotels.find(h => h.id === contextId);
            return { label: h ? h.name : 'Todos los hoteles', icon: Building2 };
        }
        const r = restaurants.find(r => r.id === contextId);
        return { label: r ? r.name : 'Todos los restaurantes', icon: Utensils };
    }, [contextType, contextId, hotels, restaurants]);

    const handleSelect = (type: string, id: string) => {
        setOpen(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set('context', type);
        params.set('id', id);
        router.push(`?${params.toString()}`);
    };

    const getRestaurant = (id: string) => restaurants.find(r => r.id === id);
    const standaloneRestaurants = restaurants.filter(r =>
        !hotels.some(h => h.restaurantId === r.id),
    );

    const ActiveIcon = activeInfo.icon;

    return (
        <div ref={containerRef} className="relative">
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                    "h-10 min-w-[260px] justify-between gap-3 px-3",
                    open && "ring-1 ring-primary/30 border-primary/40",
                )}
                onClick={() => setOpen(!open)}
            >
                <span className="flex items-center gap-2.5 min-w-0">
                    <ActiveIcon className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-sm font-medium text-foreground">{activeInfo.label}</span>
                </span>
                <ChevronsUpDown className="size-4 text-muted-foreground/60 shrink-0" />
            </Button>

            {open && (
                <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-[320px] origin-top-left animate-in fade-in zoom-in-95 duration-150">
                    <div className="rounded-lg border border-border/80 bg-popover shadow-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                            <span className="text-eyebrow">Propiedades y servicios</span>
                            {loading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                        </div>

                        <div className="max-h-[440px] overflow-y-auto p-1.5">
                            {hotels.length === 0 && !loading ? (
                                <div className="px-4 py-8 text-center space-y-3">
                                    <div className="mx-auto grid place-items-center size-10 rounded-full bg-muted border border-dashed border-border">
                                        <Building2 className="size-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">No hay hoteles configurados.</p>
                                    <Button
                                        size="sm"
                                        variant="tonal"
                                        onClick={() => { window.location.href = '/admin/hotels'; }}
                                    >
                                        <Plus className="size-3.5" /> Configurar
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-0.5">
                                    {hotels.map(h => {
                                        const linkedRest = h.restaurantId ? getRestaurant(h.restaurantId) : null;
                                        const isActive = contextType === 'hotel' && contextId === h.id;
                                        const isLinkedActive = linkedRest && contextType === 'restaurant' && contextId === linkedRest.id;

                                        return (
                                            <div key={h.id}>
                                                <ContextRow
                                                    icon={Building2}
                                                    label={h.name}
                                                    active={isActive}
                                                    onClick={() => handleSelect('hotel', h.id)}
                                                />
                                                {linkedRest && (
                                                    <div className="ml-3 pl-3 border-l border-border/60">
                                                        <ContextRow
                                                            icon={Utensils}
                                                            label={linkedRest.name}
                                                            active={!!isLinkedActive}
                                                            badge="Vinculado"
                                                            indent
                                                            onClick={() => handleSelect('restaurant', linkedRest.id)}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {standaloneRestaurants.length > 0 && (
                                <>
                                    <div className="my-2 mx-2 border-t border-border/60" />
                                    <div className="px-3 py-1.5">
                                        <span className="text-eyebrow">Otros centros</span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {standaloneRestaurants.map(r => {
                                            const isActive = contextType === 'restaurant' && contextId === r.id;
                                            return (
                                                <ContextRow
                                                    key={r.id}
                                                    icon={Utensils}
                                                    label={r.name}
                                                    active={isActive}
                                                    onClick={() => handleSelect('restaurant', r.id)}
                                                />
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface ContextRowProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
    badge?: string;
    indent?: boolean;
    onClick: () => void;
}

function ContextRow({ icon: Icon, label, active, badge, indent, onClick }: ContextRowProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-2.5 px-2.5 rounded-md text-left transition-colors",
                indent ? "py-1.5" : "py-2",
                active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent/60",
            )}
        >
            <Icon className={cn(indent ? "size-3.5" : "size-4", "shrink-0", active ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("truncate flex-1 text-sm", active && "font-medium", indent && "text-[13px]")}>
                {label}
            </span>
            {badge && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {badge}
                </span>
            )}
            {active && <Check className="size-3.5 shrink-0" />}
        </button>
    );
}

export function LocationSwitcher() {
    return (
        <Suspense fallback={<div className="h-10 w-[260px] bg-muted/60 animate-pulse rounded-md" />}>
            <LocationSwitcherContent />
        </Suspense>
    );
}
