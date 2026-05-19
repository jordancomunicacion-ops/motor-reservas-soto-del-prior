"use client";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Building2,
    Utensils,
    Calendar,
    CreditCard,
    TrendingUp,
    Star,
    Inbox,
} from 'lucide-react';
import { fetchAPI } from '@/lib/api';

interface RecentBooking {
    id: string;
    type: 'hotel' | 'restaurant';
    customerName: string;
    customerEmail?: string | null;
    date: string;
    amount: number;
}

interface DashboardStats {
    revenue?: { total: number; change: number };
    activeReservations?: { total: number; change: number };
    occupancy?: { percentage: number; change: number };
    covers?: { total: number; change: number };
    recentBookings?: RecentBooking[];
}

interface ContextEntity {
    id: string;
    name?: string;
    restaurantId?: string | null;
}

interface ReviewsSummary {
    total: number;
    overall: number | null;
}

export default function AdminDashboard() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');
    const isGlobal = !contextId;

    const [entity, setEntity] = useState<ContextEntity | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [reviews, setReviews] = useState<ReviewsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [contextId, contextType]);

    async function loadData() {
        setLoading(true);
        try {
            const [statsData, entityData] = await Promise.all([
                fetchAPI<DashboardStats>('/global/stats'),
                contextId
                    ? fetchAPI<ContextEntity>(contextType === 'hotel' ? `/property/hotels/${contextId}` : `/restaurant/${contextId}`)
                    : Promise.resolve(null),
            ]);
            setStats(statsData);
            setEntity(entityData);

            if (contextId) {
                const endpoint = contextType === 'hotel'
                    ? `/bookings/hotel/${contextId}/reviews`
                    : `/restaurant/${contextId}/reviews`;
                fetchAPI<{ total: number; averages: { overall: number | null } }>(endpoint)
                    .then(d => setReviews({ total: d.total, overall: d.averages?.overall ?? null }))
                    .catch(() => setReviews(null));
            } else {
                setReviews(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const getContextLink = (basePath: string) => {
        const params = new URLSearchParams(searchParams.toString());
        return `${basePath}?${params.toString()}`;
    };

    const contextLabel = isGlobal
        ? 'Visión global'
        : contextType === 'hotel'
            ? entity?.name ?? 'Hotel'
            : entity?.name ?? 'Restaurante';

    const showRevenue = true;
    const showActive = isGlobal || contextType === 'hotel';
    const showOccupancy = isGlobal || contextType === 'hotel';
    const showCovers = isGlobal || contextType === 'restaurant' || !!entity?.restaurantId;
    const showReviews = !isGlobal;
    const linkedRestaurant = entity?.restaurantId && contextType === 'hotel';

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Panel de control"
                title={contextLabel}
                description={
                    isGlobal
                        ? 'Actividad agregada de todas las propiedades.'
                        : `Actividad de ${contextType === 'hotel' ? 'este hotel' : 'este restaurante'}.`
                }
            />

            {/* KPIs */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loading && !stats ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="gap-3 py-5">
                            <CardContent className="space-y-3">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-8 w-20" />
                                <Skeleton className="h-3 w-32" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <>
                        {showRevenue && (
                            <MetricCard
                                label={`Ingresos ${isGlobal ? 'totales' : contextType === 'hotel' ? 'hotel' : 'restaurante'}`}
                                value={`€${stats?.revenue?.total.toLocaleString() ?? '0'}`}
                                hint="vs mes pasado"
                                change={stats?.revenue?.change ?? 0}
                                icon={CreditCard}
                            />
                        )}
                        {showActive && (
                            <MetricCard
                                label="Reservas activas"
                                value={stats?.activeReservations?.total ?? 0}
                                hint="vs mes pasado"
                                change={stats?.activeReservations?.change ?? 0}
                                icon={Calendar}
                            />
                        )}
                        {showOccupancy && (
                            <MetricCard
                                label="Ocupación"
                                value={`${stats?.occupancy?.percentage ?? 0}%`}
                                hint="vs mes pasado"
                                change={stats?.occupancy?.change ?? 0}
                                icon={Building2}
                            />
                        )}
                        {showCovers && (
                            <MetricCard
                                label={`Cubiertos ${isGlobal ? 'totales' : ''}${linkedRestaurant ? ' · vinculado' : ''}`.trim()}
                                value={stats?.covers?.total ?? 0}
                                hint="última hora"
                                change={stats?.covers?.change ?? 0}
                                icon={Utensils}
                                highlight={!!linkedRestaurant}
                            />
                        )}
                        {showReviews && (
                            <MetricCard
                                label="Valoración"
                                value={
                                    reviews?.overall !== null && reviews?.overall !== undefined
                                        ? `${reviews.overall.toFixed(1)} / 5`
                                        : '—'
                                }
                                hint={`${reviews?.total ?? 0} ${(reviews?.total ?? 0) === 1 ? 'opinión recibida' : 'opiniones recibidas'}`}
                                icon={Star}
                            />
                        )}
                        <MetricCard
                            label="Visitas web"
                            value="0"
                            hint="vs ayer"
                            change={0}
                            icon={TrendingUp}
                        />
                    </>
                )}
            </section>

            {/* Recent + Quick actions */}
            <section className="grid gap-4 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="font-display text-lg font-medium tracking-tight">
                            Reservas recientes
                        </CardTitle>
                        <CardDescription>
                            {isGlobal
                                ? 'Actividad de toda la propiedad.'
                                : `Actividad de ${contextType === 'hotel' ? 'este hotel' : 'este restaurante'}.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {(stats?.recentBookings?.length ?? 0) > 0 ? (
                            <ul className="divide-y divide-border/60 -my-3">
                                {stats!.recentBookings!.map((booking) => (
                                    <li key={booking.id} className="flex items-center gap-3 py-3">
                                        <span className="grid place-items-center size-9 rounded-md bg-muted text-muted-foreground shrink-0">
                                            {booking.type === 'hotel'
                                                ? <Building2 className="size-4" />
                                                : <Utensils className="size-4" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-foreground truncate">{booking.customerName}</p>
                                            {booking.customerEmail && (
                                                <p className="text-xs text-muted-foreground truncate">{booking.customerEmail}</p>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground shrink-0">
                                            {new Date(booking.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                        </div>
                                        <div className="text-sm font-medium tabular-nums shrink-0 min-w-[60px] text-right">
                                            {booking.amount > 0 ? `€${booking.amount.toLocaleString()}` : '—'}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={Inbox}
                                title="Sin reservas recientes"
                                description="Las nuevas reservas aparecerán aquí en cuanto se confirmen."
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-display text-lg font-medium tracking-tight">
                            Acciones rápidas
                        </CardTitle>
                        <CardDescription>Acceso directo a herramientas clave.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2.5">
                        {(isGlobal || contextType === 'hotel' || entity?.restaurantId) && (
                            <Button variant="outline" asChild className="justify-start h-10">
                                <Link href={getContextLink('/admin/hotels')}>
                                    <Building2 className="size-4 text-muted-foreground" />
                                    {entity?.restaurantId && contextType === 'restaurant'
                                        ? 'Gestionar hotel vinculado'
                                        : 'Gestionar habitaciones'}
                                </Link>
                            </Button>
                        )}

                        {(isGlobal || contextType === 'restaurant' || entity?.restaurantId) && (
                            <Button variant="outline" asChild className="justify-start h-10">
                                <Link href={getContextLink('/admin/restaurant')}>
                                    <Utensils className="size-4 text-muted-foreground" />
                                    {entity?.restaurantId && contextType === 'hotel'
                                        ? 'Gestionar restaurante vinculado'
                                        : 'Mesas restaurante'}
                                </Link>
                            </Button>
                        )}

                        <Button variant="tonal" asChild className="justify-start h-10">
                            <Link href={getContextLink('/admin/calendar')}>
                                <Calendar className="size-4" />
                                Crear reserva de hotel
                            </Link>
                        </Button>

                        <Button variant="tonal" asChild className="justify-start h-10">
                            <Link href={getContextLink('/admin/restaurant')}>
                                <Utensils className="size-4" />
                                Crear reserva de restaurante
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
