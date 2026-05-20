"use client";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    Building2,
    Utensils,
    Calendar,
    CreditCard,
    TrendingUp,
    Star,
    Inbox,
    ArrowUpRight,
} from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

interface RecentBooking {
    id: string;
    type: 'hotel' | 'restaurant';
    customerName: string;
    customerEmail?: string | null;
    date: string;
    amount: number;
    entityName?: string;
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

interface TrendsMonth {
    month: string;
    bookings: number;
    covers: number;
    revenue: number;
    hotelBookings: number;
    restaurantBookings: number;
}

interface TrendsResponse {
    months: TrendsMonth[];
}

export default function AdminDashboard() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');
    const isGlobal = !contextId;

    const [entity, setEntity] = useState<ContextEntity | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [reviews, setReviews] = useState<ReviewsSummary | null>(null);
    const [trendsData, setTrendsData] = useState<TrendsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextId, contextType]);

    async function loadData() {
        setLoading(true);
        try {
            const ctxQs = contextId ? `?ctxType=${contextType}&ctxId=${encodeURIComponent(contextId)}` : '';
            const statsUrl = `/global/stats${ctxQs}`;
            const trendsUrl = `/global/trends${ctxQs}${ctxQs ? '&' : '?'}months=12`;

            const [statsData, entityData, trendsResp] = await Promise.all([
                fetchAPI<DashboardStats>(statsUrl),
                contextId
                    ? fetchAPI<ContextEntity>(contextType === 'hotel' ? `/property/hotels/${contextId}` : `/restaurant/${contextId}`)
                    : Promise.resolve(null),
                fetchAPI<TrendsResponse>(trendsUrl).catch(() => null),
            ]);
            setStats(statsData);
            setEntity(entityData);
            setTrendsData(trendsResp);

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

    const showActive = isGlobal || contextType === 'hotel';
    const showOccupancy = isGlobal || contextType === 'hotel';
    const showCovers = isGlobal || contextType === 'restaurant' || !!entity?.restaurantId;
    const showReviews = !isGlobal;
    const linkedRestaurant = !!entity?.restaurantId && contextType === 'hotel';

    // Series mensuales reales del backend (últimos 12 meses).
    // Si aún no llegan los datos devolvemos arrays vacíos → MetricCard no pinta sparkline.
    const trends = useMemo(() => {
        const months = trendsData?.months ?? [];
        return {
            revenue: months.map(m => m.revenue),
            active: months.map(m => m.bookings),
            covers: months.map(m => m.covers),
            occupancy: [] as number[], // pendiente — requiere agregar capacidad/inventario
            visits: [] as number[],    // pendiente — requiere integración analytics
        };
    }, [trendsData]);

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Panel de control"
                title={contextLabel}
                description={
                    isGlobal
                        ? 'Actividad agregada de todas las propiedades.'
                        : `Actividad de ${contextType === 'hotel' ? 'este hotel' : 'este restaurante'}.`
                }
            />

            {/* KPIs densos en grid */}
            <section className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {loading && !stats ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="rounded-md border border-border/70 bg-card p-4 space-y-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-7 w-24" />
                            <Skeleton className="h-7 w-full" />
                        </div>
                    ))
                ) : (
                    <>
                        <MetricCard
                            label={`Ingresos${isGlobal ? '' : contextType === 'hotel' ? ' hotel' : ' restaurante'}`}
                            value={`€${(stats?.revenue?.total ?? 0).toLocaleString('es-ES')}`}
                            hint="vs mes pasado"
                            change={stats?.revenue?.change ?? 0}
                            icon={CreditCard}
                            trend={trends.revenue}
                            trendColor="var(--primary)"
                        />
                        {showActive && (
                            <MetricCard
                                label="Reservas activas"
                                value={stats?.activeReservations?.total ?? 0}
                                hint="vs mes pasado"
                                change={stats?.activeReservations?.change ?? 0}
                                icon={Calendar}
                                trend={trends.active}
                            />
                        )}
                        {showOccupancy && (
                            <MetricCard
                                label="Ocupación"
                                value={`${stats?.occupancy?.percentage ?? 0}%`}
                                hint="vs mes pasado"
                                change={stats?.occupancy?.change ?? 0}
                                icon={Building2}
                                trend={trends.occupancy}
                            />
                        )}
                        {showCovers && (
                            <MetricCard
                                label={`Cubiertos${linkedRestaurant ? ' · vinculado' : ''}`}
                                value={stats?.covers?.total ?? 0}
                                hint="última hora"
                                change={stats?.covers?.change ?? 0}
                                icon={Utensils}
                                highlight={linkedRestaurant}
                                trend={trends.covers}
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
                                hint={`${reviews?.total ?? 0} ${(reviews?.total ?? 0) === 1 ? 'opinión' : 'opiniones'}`}
                                icon={Star}
                            />
                        )}
                        <MetricCard
                            label="Visitas web"
                            value="0"
                            hint="vs ayer"
                            change={0}
                            icon={TrendingUp}
                            trend={trends.visits}
                        />
                    </>
                )}
            </section>

            {/* Recent bookings (tabla densa) + Acciones rápidas */}
            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2 gap-0 py-0 overflow-hidden">
                    <CardHeader className="flex-row items-center justify-between space-y-0 px-5 py-3 border-b border-border/60 bg-muted/30">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                            Reservas recientes
                        </CardTitle>
                        <Link
                            href={getContextLink('/admin/calendar')}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Ver todas <ArrowUpRight className="size-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0">
                        {(stats?.recentBookings?.length ?? 0) > 0 ? (
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground bg-muted/20 border-b border-border/60">
                                    <tr>
                                        <th className="text-left font-semibold px-5 py-2.5">Cliente</th>
                                        <th className="text-left font-semibold px-3 py-2.5 w-24 hidden sm:table-cell">Tipo</th>
                                        <th className="text-left font-semibold px-3 py-2.5 w-32 hidden md:table-cell">Establecimiento</th>
                                        <th className="text-right font-semibold px-3 py-2.5 w-20">Fecha</th>
                                        <th className="text-right font-semibold px-5 py-2.5 w-24">Importe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {stats!.recentBookings!.map((b) => (
                                        <tr key={b.id} className="hover:bg-accent/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-medium text-foreground truncate">{b.customerName}</div>
                                                {b.customerEmail && (
                                                    <div className="text-xs text-muted-foreground truncate">{b.customerEmail}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 hidden sm:table-cell">
                                                <StatusBadge tone={b.type === 'hotel' ? 'info' : 'accent'} dot={false} className="text-[10px]">
                                                    {b.type === 'hotel' ? 'Hotel' : 'Restaurante'}
                                                </StatusBadge>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell truncate">
                                                {b.entityName ?? '—'}
                                            </td>
                                            <td className="px-3 py-3 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                                {new Date(b.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className="px-5 py-3 text-right text-sm font-medium tabular-nums">
                                                {b.amount > 0 ? `€${b.amount.toLocaleString('es-ES')}` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-2">
                                <EmptyState
                                    icon={Inbox}
                                    title="Sin reservas recientes"
                                    description="Las nuevas reservas aparecerán aquí en cuanto se confirmen."
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="gap-0 py-0 overflow-hidden">
                    <CardHeader className="space-y-0 px-5 py-3 border-b border-border/60 bg-muted/30">
                        <CardTitle className="text-sm font-semibold tracking-tight">
                            Acciones rápidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 space-y-1.5">
                        {(isGlobal || contextType === 'hotel' || entity?.restaurantId) && (
                            <ActionRow
                                icon={Building2}
                                label={entity?.restaurantId && contextType === 'restaurant' ? 'Hotel vinculado' : 'Gestionar habitaciones'}
                                href={getContextLink('/admin/hotels')}
                            />
                        )}
                        {(isGlobal || contextType === 'restaurant' || entity?.restaurantId) && (
                            <ActionRow
                                icon={Utensils}
                                label={entity?.restaurantId && contextType === 'hotel' ? 'Restaurante vinculado' : 'Mesas restaurante'}
                                href={getContextLink('/admin/restaurant')}
                            />
                        )}
                        <ActionRow
                            icon={Calendar}
                            label="Crear reserva de hotel"
                            href={getContextLink('/admin/calendar')}
                            highlight
                        />
                        <ActionRow
                            icon={Utensils}
                            label="Crear reserva de restaurante"
                            href={getContextLink('/admin/restaurant')}
                            highlight
                        />
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}

function ActionRow({
    icon: Icon,
    label,
    href,
    highlight,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    highlight?: boolean;
}) {
    return (
        <Button
            asChild
            variant={highlight ? "tonal" : "ghost"}
            className="w-full justify-start h-9 text-[13px] font-medium"
        >
            <Link href={href}>
                <Icon className={cn("size-4", highlight ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{label}</span>
                <ArrowUpRight className={cn("size-3.5 ml-auto", highlight ? "text-primary" : "text-muted-foreground/60")} />
            </Link>
        </Button>
    );
}
