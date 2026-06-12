"use client";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { MonthlyBarChart } from '@/components/ui/monthly-bar-chart';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { fetchAPIAdmin } from '@/lib/api-admin';
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
    reviews?: { overall: number | null; total: number; change: number };
    visits?: { total: number; change: number };
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
    change: number;
}

interface TrendsMonth {
    month: string;
    bookings: number;
    covers: number;
    revenue: number;
    hotelBookings: number;
    restaurantBookings: number;
    nights: number;
    capacity: number;
    occupancy: number;
}

interface TrendsDay {
    date: string;
    bookings: number;
    covers: number;
    revenue: number;
    hotelBookings: number;
    restaurantBookings: number;
    nights: number;
    capacity: number;
    occupancy: number;
}

interface TrendsResponse {
    months: TrendsMonth[];
}

interface DailyTrendsResponse {
    days: TrendsDay[];
}

type MetricKey = 'revenue' | 'active' | 'occupancy' | 'covers';

// Colores por año en el detalle mensual: paleta fija y estable (el mismo año
// siempre se pinta igual), distinguible sobre el tema oscuro del admin.
const YEAR_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#a78bfa'];
const yearColor = (year: number) => YEAR_PALETTE[year % YEAR_PALETTE.length];

const METRIC_DETAIL: Record<MetricKey, {
    title: string;
    description: string;
    color: string;
    pick: (m: TrendsMonth) => number;
    format: (v: number) => string;
}> = {
    revenue: {
        title: 'Ingresos por mes',
        description: 'Total facturado cada mes del año en curso.',
        color: 'var(--primary)',
        pick: m => m.revenue,
        format: v => `€${Math.round(v).toLocaleString('es-ES')}`,
    },
    active: {
        title: 'Reservas por mes',
        description: 'Reservas de hotel y restaurante registradas cada mes del año en curso.',
        color: 'var(--success)',
        pick: m => m.bookings,
        format: v => v.toLocaleString('es-ES'),
    },
    occupancy: {
        title: 'Ocupación por mes',
        description: 'Porcentaje medio de ocupación de cada mes del año en curso.',
        color: 'var(--success)',
        pick: m => m.occupancy,
        format: v => `${Math.round(v)}%`,
    },
    covers: {
        title: 'Cubiertos por mes',
        description: 'Comensales atendidos cada mes del año en curso.',
        color: 'var(--success)',
        pick: m => m.covers,
        format: v => v.toLocaleString('es-ES'),
    },
};

export default function DashboardContent() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');
    const isGlobal = !contextId;

    const [entity, setEntity] = useState<ContextEntity | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [reviews, setReviews] = useState<ReviewsSummary | null>(null);
    const [trendsData, setTrendsData] = useState<DailyTrendsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // Detalle mensual (ene-dic) que se abre al pulsar una tarjeta, con
    // comparación entre años. Por defecto: año en curso vs año anterior.
    const currentYear = new Date().getFullYear();
    const yearOptions = useMemo(
        () => Array.from({ length: 5 }, (_, i) => currentYear - 4 + i),
        [currentYear],
    );
    const [detailMetric, setDetailMetric] = useState<MetricKey | null>(null);
    const [selectedYears, setSelectedYears] = useState<number[]>([currentYear - 1, currentYear]);
    const [yearlyByYear, setYearlyByYear] = useState<Record<number, TrendsMonth[]>>({});
    const [yearlyLoading, setYearlyLoading] = useState(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextId, contextType]);

    async function loadData() {
        setLoading(true);
        setYearlyByYear({}); // el detalle mensual depende del contexto
        try {
            const ctxQs = contextId ? `?ctxType=${contextType}&ctxId=${encodeURIComponent(contextId)}` : '';
            const statsUrl = `/global/stats${ctxQs}`;
            // Sparklines: serie diaria de todo el año en curso (ene-dic).
            const trendsUrl = `/global/trends${ctxQs}${ctxQs ? '&' : '?'}granularity=day&year=${new Date().getFullYear()}`;

            const [statsData, entityData, trendsResp] = await Promise.all([
                fetchAPIAdmin<DashboardStats>(statsUrl),
                contextId
                    ? fetchAPIAdmin<ContextEntity>(contextType === 'hotel' ? `/property/hotels/${contextId}` : `/restaurant/${contextId}`)
                    : Promise.resolve(null),
                fetchAPIAdmin<DailyTrendsResponse>(trendsUrl).catch(() => null),
            ]);
            setStats(statsData);
            setEntity(entityData);
            setTrendsData(trendsResp);

            // reviews ya vienen agregadas en stats.reviews (con change vs mes anterior).
            if (statsData?.reviews) {
                setReviews({
                    total: statsData.reviews.total,
                    overall: statsData.reviews.overall,
                    change: statsData.reviews.change,
                });
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

    // Series diarias reales del backend (año en curso, ene-dic).
    // Si aún no llegan los datos devolvemos arrays vacíos → MetricCard no pinta sparkline.
    const trends = useMemo(() => {
        const days = trendsData?.days ?? [];
        return {
            revenue: days.map(d => d.revenue),
            active: days.map(d => d.bookings),
            covers: days.map(d => d.covers),
            occupancy: days.map(d => d.occupancy),
            visits: [] as number[], // pendiente — requiere integración analytics
        };
    }, [trendsData]);

    // Carga (y cachea por contexto) la serie ene-dic de cada año seleccionado
    // que aún no esté en memoria. Se dispara al abrir el diálogo o cambiar años.
    useEffect(() => {
        if (detailMetric === null) return;
        const missing = selectedYears.filter(y => !(y in yearlyByYear));
        if (missing.length === 0) return;
        let cancelled = false;
        setYearlyLoading(true);
        const ctxQs = contextId ? `?ctxType=${contextType}&ctxId=${encodeURIComponent(contextId)}&` : '?';
        Promise.all(missing.map(async (y) => {
            const data = await fetchAPIAdmin<TrendsResponse>(`/global/trends${ctxQs}year=${y}`).catch(() => null);
            return [y, data?.months ?? []] as const;
        })).then(entries => {
            if (cancelled) return;
            setYearlyByYear(prev => ({ ...prev, ...Object.fromEntries(entries) }));
        }).finally(() => {
            if (!cancelled) setYearlyLoading(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detailMetric, selectedYears, contextId, contextType]);

    function openDetail(metric: MetricKey) {
        setDetailMetric(metric);
    }

    function toggleYear(year: number) {
        setSelectedYears(prev => {
            if (prev.includes(year)) {
                // Siempre debe quedar al menos un año seleccionado.
                return prev.length > 1 ? prev.filter(y => y !== year) : prev;
            }
            return [...prev, year].sort((a, b) => a - b);
        });
    }

    const detail = detailMetric ? METRIC_DETAIL[detailMetric] : null;
    const detailSeries = useMemo(() => {
        if (!detail) return null;
        const years = [...selectedYears].sort((a, b) => a - b);
        if (years.some(y => !(y in yearlyByYear))) return null; // aún cargando
        return years.map((y) => {
            const byMonth = new Array(12).fill(0) as number[];
            for (const m of yearlyByYear[y]) {
                const i = parseInt(m.month.slice(5), 10) - 1;
                if (i >= 0 && i < 12) byMonth[i] = detail.pick(m);
            }
            return { label: String(y), data: byMonth, color: yearColor(y) };
        });
    }, [detail, selectedYears, yearlyByYear]);

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
                            onClick={() => openDetail('revenue')}
                        />
                        {showActive && (
                            <MetricCard
                                label="Reservas activas"
                                value={stats?.activeReservations?.total ?? 0}
                                hint="vs mes pasado"
                                change={stats?.activeReservations?.change ?? 0}
                                icon={Calendar}
                                trend={trends.active}
                                onClick={() => openDetail('active')}
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
                                onClick={() => openDetail('occupancy')}
                            />
                        )}
                        {showCovers && (
                            <MetricCard
                                label={`Cubiertos${linkedRestaurant ? ' · vinculado' : ''}`}
                                value={stats?.covers?.total ?? 0}
                                hint="vs semana pasada"
                                change={stats?.covers?.change ?? 0}
                                icon={Utensils}
                                highlight={linkedRestaurant}
                                trend={trends.covers}
                                onClick={() => openDetail('covers')}
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
                                hint={`vs mes pasado · ${reviews?.total ?? 0} ${(reviews?.total ?? 0) === 1 ? 'opinión' : 'opiniones'}`}
                                change={reviews?.change ?? 0}
                                icon={Star}
                            />
                        )}
                        <MetricCard
                            label="Visitas web"
                            value={stats?.visits?.total ?? 0}
                            hint="vs semana pasada"
                            change={stats?.visits?.change ?? 0}
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

            {/* Detalle mensual ene-dic al pulsar una tarjeta KPI */}
            <Dialog open={detailMetric !== null} onOpenChange={(open) => { if (!open) setDetailMetric(null); }}>
                {/* El portal monta fuera del layout admin: hay que re-aplicar el tema. */}
                <DialogContent data-theme="admin-dark" className="sm:max-w-xl bg-background text-foreground">
                    {detail && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{detail.title}</DialogTitle>
                                <DialogDescription>{detail.description}</DialogDescription>
                            </DialogHeader>
                            {/* Selector de años a comparar */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {yearOptions.map((y) => {
                                    const active = selectedYears.includes(y);
                                    return (
                                        <button
                                            key={y}
                                            type="button"
                                            onClick={() => toggleYear(y)}
                                            aria-pressed={active}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium tabular-nums transition-colors",
                                                active
                                                    ? "text-foreground"
                                                    : "border-border/70 text-muted-foreground hover:bg-accent/40",
                                            )}
                                            style={active ? { borderColor: yearColor(y), backgroundColor: `${yearColor(y)}1a` } : undefined}
                                        >
                                            <span
                                                className="size-1.5 rounded-full"
                                                style={{ backgroundColor: active ? yearColor(y) : 'var(--muted-foreground)' }}
                                            />
                                            {y}
                                        </button>
                                    );
                                })}
                            </div>
                            {yearlyLoading || !detailSeries ? (
                                <div className="flex items-end gap-1.5 h-44 pt-2">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <Skeleton key={i} className="flex-1" style={{ height: `${30 + ((i * 23) % 60)}%` }} />
                                    ))}
                                </div>
                            ) : (
                                <MonthlyBarChart
                                    series={detailSeries}
                                    formatValue={detail.format}
                                    className="pt-1"
                                />
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
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
