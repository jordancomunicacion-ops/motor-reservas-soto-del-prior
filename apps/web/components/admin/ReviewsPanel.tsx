"use client";
import { useEffect, useState } from 'react';
import { Star, ExternalLink, Loader2, MessageSquareQuote } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export type ReviewItem = {
    id: string;
    serviceScore: number;
    ambianceScore: number;
    foodScore: number;
    advice: string | null;
    redirectedToGoogle: boolean;
    createdAt: string;
    booking: { id: string; guestName: string; guestEmail: string | null; date: string; pax: number };
};

export type ReviewsResponse = {
    total: number;
    averages: { service: number | null; ambiance: number | null; food: number | null; overall: number | null };
    redirectedToGoogleCount: number;
    items: ReviewItem[];
};

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
    const px = size === 'md' ? 'size-4' : 'size-3.5';
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star
                    key={n}
                    className={cn(
                        px,
                        n <= value ? 'fill-primary text-primary' : 'fill-transparent text-border'
                    )}
                />
            ))}
        </div>
    );
}

function AverageCard({ label, value }: { label: string; value: number | null }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription className="text-eyebrow">{label}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-medium tabular-nums">{value !== null ? value.toFixed(1) : '—'}</span>
                    <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
            </CardContent>
        </Card>
    );
}

interface ReviewsPanelProps {
    endpoint: string; // p.ej. `/restaurant/${id}/reviews` o `/restaurant/hotel/${id}/reviews`
    /** Banner adicional encima de los cards (e.g. aviso de hotel sin restaurante). */
    headerBanner?: React.ReactNode;
}

export default function ReviewsPanel({ endpoint, headerBanner }: ReviewsPanelProps) {
    const [data, setData] = useState<ReviewsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let aborted = false;
        setLoading(true);
        fetchAPI<ReviewsResponse>(endpoint)
            .then(d => { if (!aborted) setData(d); })
            .catch(e => console.error(e))
            .finally(() => { if (!aborted) setLoading(false); });
        return () => { aborted = true; };
    }, [endpoint]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Cargando valoraciones…</span>
            </div>
        );
    }
    if (!data) {
        return (
            <EmptyState
                tone="danger"
                title="No se pudieron cargar las valoraciones"
                description="Inténtalo de nuevo en unos minutos."
            />
        );
    }

    return (
        <div className="space-y-6">
            {headerBanner}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AverageCard label="General" value={data.averages.overall} />
                <AverageCard label="Atención" value={data.averages.service} />
                <AverageCard label="Entorno" value={data.averages.ambiance} />
                <AverageCard label="Comida" value={data.averages.food} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-display text-base font-medium tracking-tight">Histórico</CardTitle>
                    <CardDescription>{data.total} valoraciones · {data.redirectedToGoogleCount} fueron a Google Reseñas.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.items.length === 0 ? (
                        <EmptyState
                            icon={MessageSquareQuote}
                            title="Aún no hay valoraciones"
                            description="El primer email se envía 24h después de la primera reserva finalizada."
                        />
                    ) : (
                        <div className="divide-y divide-border/60">
                            {data.items.map(r => (
                                <div key={r.id} className="py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm flex-wrap">
                                            <span className="font-medium text-foreground">{r.booking.guestName}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">{format(new Date(r.booking.date), "d MMM yyyy 'a las' HH:mm", { locale: es })}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">{r.booking.pax} pax</span>
                                            {r.redirectedToGoogle && (
                                                <StatusBadge tone="success" dot={false} className="gap-1">
                                                    <ExternalLink className="size-3" /> Google
                                                </StatusBadge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Atención</span><Stars value={r.serviceScore} /></div>
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Entorno</span><Stars value={r.ambianceScore} /></div>
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Comida</span><Stars value={r.foodScore} /></div>
                                        </div>
                                        {r.advice && (
                                            <blockquote className="text-sm italic text-muted-foreground border-l-2 border-border pl-3 mt-2">
                                                {r.advice}
                                            </blockquote>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground text-right">
                                        {format(new Date(r.createdAt), "d MMM 'a las' HH:mm", { locale: es })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
