"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Building2,
    Settings,
    Share2,
    LayoutDashboard,
    BedDouble,
    Users,
    Plus,
} from 'lucide-react';

interface HotelRow {
    id: string;
    name: string;
    currency: string;
    timezone: string;
}

export default function HotelsPage() {
    const [hotels, setHotels] = useState<HotelRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadHotels();
    }, []);

    async function loadHotels() {
        setLoading(true);
        try {
            const data = await fetchAPI<HotelRow[]>('/property/hotels');
            if (Array.isArray(data)) setHotels(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e?: React.FormEvent) {
        e?.preventDefault();
        if (!newName.trim()) {
            alert('Introduce un nombre para el hotel.');
            return;
        }
        setCreating(true);
        try {
            await fetchAPI('/property/hotels', {
                method: 'POST',
                body: JSON.stringify({ name: newName.trim(), currency: 'EUR', timezone: 'Europe/Madrid' }),
            });
            setNewName('');
            loadHotels();
        } catch (e) {
            console.error('Error creating hotel:', e);
            alert('Error creando hotel. Asegúrate de que el servidor está funcionando.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Propiedades"
                title="Gestión de hoteles"
                description="Configura y administra tus propiedades hoteleras."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="font-display text-base font-medium tracking-tight">
                        Crear nuevo hotel
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-hotel-name" className="text-eyebrow">Nombre del hotel</Label>
                            <Input
                                id="new-hotel-name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Ej. Soto del Prior Boutique"
                                className="h-10"
                            />
                        </div>
                        <Button type="submit" disabled={creating} className="h-10">
                            <Plus className="size-4" />
                            {creating ? 'Creando…' : 'Crear hotel'}
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
                    ) : hotels.length === 0 ? (
                        <Card className="sm:col-span-2 lg:col-span-3">
                            <CardContent>
                                <EmptyState
                                    icon={Building2}
                                    title="Aún no hay hoteles"
                                    description="Crea tu primer hotel desde el formulario de arriba."
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        hotels.map(hotel => <HotelCard key={hotel.id} hotel={hotel} />)
                    )}
                </div>
            </section>
        </div>
    );
}

function HotelCard({ hotel }: { hotel: HotelRow }) {
    const actions: { icon: typeof Building2; label: string; href: string; full?: boolean }[] = [
        { icon: LayoutDashboard, label: 'Dashboard', href: `/admin/hotels/${hotel.id}` },
        { icon: Settings, label: 'Ajustes', href: `/admin/hotels/${hotel.id}/config?tab=general` },
        { icon: BedDouble, label: 'Inventario', href: `/admin/hotels/${hotel.id}/inventory` },
        { icon: Share2, label: 'Conexiones', href: `/admin/hotels/${hotel.id}/connections` },
        { icon: Users, label: 'Gestionar accesos', href: `/admin/hotels/${hotel.id}/config?tab=access`, full: true },
    ];

    return (
        <Card className="transition-shadow hover:shadow-md gap-4">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="grid place-items-center size-10 rounded-md bg-primary/10 text-primary shrink-0">
                        <Building2 className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-display text-base font-medium tracking-tight truncate">{hotel.name}</h3>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">#{hotel.id.substring(0, 8)}</p>
                    </div>
                </div>
                <StatusBadge tone="success">Activo</StatusBadge>
            </CardHeader>
            <CardContent className="space-y-4">
                <dl className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs divide-y divide-border/40">
                    <div className="flex justify-between py-1.5">
                        <dt className="text-muted-foreground">Moneda</dt>
                        <dd className="font-medium text-foreground">{hotel.currency}</dd>
                    </div>
                    <div className="flex justify-between py-1.5">
                        <dt className="text-muted-foreground">Zona horaria</dt>
                        <dd className="font-medium text-foreground">{hotel.timezone}</dd>
                    </div>
                </dl>
                <div className="grid grid-cols-2 gap-2">
                    {actions.map(({ icon: Icon, label, href, full }) => (
                        <Button
                            key={href}
                            variant="outline"
                            size="sm"
                            asChild
                            className={full ? 'col-span-2 justify-start' : 'justify-start'}
                        >
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
