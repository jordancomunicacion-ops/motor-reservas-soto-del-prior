"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type ReviewItem = {
    id: string;
    serviceScore: number;
    ambianceScore: number;
    foodScore: number;
    advice: string | null;
    redirectedToGoogle: boolean;
    createdAt: string;
    booking: { id: string; guestName: string; guestEmail: string | null; date: string; pax: number };
};

type ReviewsResponse = {
    total: number;
    averages: { service: number | null; ambiance: number | null; food: number | null; overall: number | null };
    redirectedToGoogleCount: number;
    items: ReviewItem[];
};

function Stars({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star
                    key={n}
                    className="w-3.5 h-3.5"
                    style={{
                        color: n <= value ? '#C59D5F' : '#E5E7EB',
                        fill: n <= value ? '#C59D5F' : 'transparent',
                    }}
                />
            ))}
        </div>
    );
}

function AverageCard({ label, value }: { label: string; value: number | null }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-semibold">{label}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{value !== null ? value.toFixed(1) : '—'}</span>
                    <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function RestaurantReviewsPage() {
    const params = useParams();
    const restaurantId = params.id as string;
    const [data, setData] = useState<ReviewsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAPI<ReviewsResponse>(`/restaurant/${restaurantId}/reviews`)
            .then(setData)
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, [restaurantId]);

    if (loading) return <div className="p-8">Cargando valoraciones…</div>;

    if (!data) return <div className="p-8 text-red-600">No se pudieron cargar las valoraciones.</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/admin/restaurant/${restaurantId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Valoraciones</h1>
                    <p className="text-muted-foreground">{data.total} valoraciones recibidas · {data.redirectedToGoogleCount} fueron a Google Reseñas.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AverageCard label="General" value={data.averages.overall} />
                <AverageCard label="Atención" value={data.averages.service} />
                <AverageCard label="Entorno" value={data.averages.ambiance} />
                <AverageCard label="Comida" value={data.averages.food} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico</CardTitle>
                    <CardDescription>Últimas 200 valoraciones, más recientes primero.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.items.length === 0 ? (
                        <p className="text-sm italic text-muted-foreground py-8 text-center">Aún no hay valoraciones. El primer email se envía 24h después de la primera reserva finalizada.</p>
                    ) : (
                        <div className="divide-y">
                            {data.items.map(r => (
                                <div key={r.id} className="py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-bold">{r.booking.guestName}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">{format(new Date(r.booking.date), "d MMM yyyy 'a las' HH:mm", { locale: es })}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">{r.booking.pax} pax</span>
                                            {r.redirectedToGoogle && (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                    <ExternalLink className="w-3 h-3" /> Google
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Atención</span><Stars value={r.serviceScore} /></div>
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Entorno</span><Stars value={r.ambianceScore} /></div>
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-16">Comida</span><Stars value={r.foodScore} /></div>
                                        </div>
                                        {r.advice && (
                                            <blockquote className="text-sm italic text-muted-foreground border-l-2 border-gray-200 pl-3 mt-2">
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
