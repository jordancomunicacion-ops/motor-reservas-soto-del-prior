"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Utensils, Settings, LayoutDashboard, Share2, Users } from 'lucide-react';

interface RestaurantRow {
    id: string;
    name: string;
    currency?: string;
}

export default function RestaurantListPage() {
    const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadRestaurants();
    }, []);

    async function loadRestaurants() {
        setLoading(true);
        try {
            const data = await fetchAPIAdmin<RestaurantRow[]>('/restaurant');
            if (Array.isArray(data)) setRestaurants(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e?: React.FormEvent) {
        e?.preventDefault();
        if (!newName.trim()) {
            alert('Introduce un nombre para el restaurante.');
            return;
        }
        setCreating(true);
        try {
            await fetchAPIAdmin('/restaurant', {
                method: 'POST',
                body: JSON.stringify({ name: newName.trim(), currency: 'EUR' }),
            });
            setNewName('');
            loadRestaurants();
        } catch (e) {
            console.error('Error creating restaurant:', e);
            alert('Error creando restaurante. Asegúrate de que el servidor está funcionando.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Centros"
                title="Gestión de restaurantes"
                description="Configura y administra tus centros de restauración."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="font-display text-base font-medium tracking-tight">
                        Crear nuevo restaurante
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-rest-name" className="text-eyebrow">Nombre del restaurante</Label>
                            <Input
                                id="new-rest-name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ej. El Cenador de Soto"
                                className="h-10"
                            />
                        </div>
                        <Button type="submit" disabled={creating} className="h-10">
                            <Plus className="size-4" />
                            {creating ? 'Creando…' : 'Crear restaurante'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <section>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="size-10 rounded-md" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-2/3" />
                                            <Skeleton className="h-3 w-1/3" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-16 w-full" />
                                </CardContent>
                            </Card>
                        ))
                    ) : restaurants.length === 0 ? (
                        <Card className="sm:col-span-2 lg:col-span-3">
                            <CardContent>
                                <EmptyState
                                    icon={Utensils}
                                    title="Aún no hay restaurantes"
                                    description="Crea tu primer restaurante desde el formulario de arriba."
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        restaurants.map(rest => <RestaurantCard key={rest.id} restaurant={rest} />)
                    )}
                </div>
            </section>
        </div>
    );
}

function RestaurantCard({ restaurant }: { restaurant: RestaurantRow }) {
    const qs = `?context=restaurant&id=${restaurant.id}`;
    const actions: { icon: typeof Utensils; label: string; href: string }[] = [
        { icon: LayoutDashboard, label: 'Dashboard', href: `/admin/restaurant/${restaurant.id}${qs}` },
        { icon: Settings, label: 'Ajustes', href: `/admin/restaurant/${restaurant.id}/config?tab=general&context=restaurant&id=${restaurant.id}` },
        { icon: Share2, label: 'Conexiones', href: `/admin/restaurant/${restaurant.id}/connections${qs}` },
        { icon: Users, label: 'Accesos', href: `/admin/restaurant/${restaurant.id}/config?tab=access&context=restaurant&id=${restaurant.id}` },
    ];

    return (
        <Card className="transition-shadow hover:shadow-md gap-4">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="grid place-items-center size-10 rounded-md bg-primary/10 text-primary shrink-0">
                        <Utensils className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-display text-base font-medium tracking-tight truncate">{restaurant.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">#{restaurant.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                </div>
                <StatusBadge tone="success">Abierto</StatusBadge>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-2">
                    {actions.map(({ icon: Icon, label, href }) => (
                        <Button key={href} variant="outline" size="sm" asChild className="justify-start">
                            <Link href={href}>
                                <Icon className="size-3.5 text-muted-foreground" />
                                <span className="truncate">{label}</span>
                            </Link>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
