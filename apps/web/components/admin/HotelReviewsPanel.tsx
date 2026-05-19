"use client";
import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Stars } from '@/components/admin/ReviewsPanel';

export type HotelReviewItem = {
    id: string;
    serviceScore: number;
    roomScore: number;
    cleanlinessScore: number;
    advice: string | null;
    redirectedToGoogle: boolean;
    createdAt: string;
    booking: { id: string; guestName: string; guestEmail: string | null; checkInDate: string; checkOutDate: string; referenceCode: string };
};

export type HotelReviewsResponse = {
    total: number;
    averages: { service: number | null; room: number | null; cleanliness: number | null; overall: number | null };
    redirectedToGoogleCount: number;
    items: HotelReviewItem[];
};

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

interface HotelReviewsPanelProps {
    endpoint: string;
    headerBanner?: React.ReactNode;
}

export default function HotelReviewsPanel({ endpoint, headerBanner }: HotelReviewsPanelProps) {
    const [data, setData] = useState<HotelReviewsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let aborted = false;
        setLoading(true);
        fetchAPI<HotelReviewsResponse>(endpoint)
            .then(d => { if (!aborted) setData(d); })
            .catch(e => console.error(e))
            .finally(() => { if (!aborted) setLoading(false); });
        return () => { aborted = true; };
    }, [endpoint]);

    if (loading) return <div className="p-8 text-muted-foreground">Cargando valoraciones…</div>;
    if (!data) return <div className="p-8 text-red-600">No se pudieron cargar las valoraciones.</div>;

    return (
        <div className="space-y-6">
            {headerBanner}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AverageCard label="General" value={data.averages.overall} />
                <AverageCard label="Atención" value={data.averages.service} />
                <AverageCard label="Habitación" value={data.averages.room} />
                <AverageCard label="Limpieza" value={data.averages.cleanliness} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico</CardTitle>
                    <CardDescription>{data.total} valoraciones · {data.redirectedToGoogleCount} fueron a Google Reseñas.</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.items.length === 0 ? (
                        <p className="text-sm italic text-muted-foreground py-8 text-center">Aún no hay valoraciones. El primer email se envía 24h después del primer checkOut.</p>
                    ) : (
                        <div className="divide-y">
                            {data.items.map(r => (
                                <div key={r.id} className="py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm flex-wrap">
                                            <span className="font-bold">{r.booking.guestName}</span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">
                                                {format(new Date(r.booking.checkInDate), "d MMM", { locale: es })} → {format(new Date(r.booking.checkOutDate), "d MMM yyyy", { locale: es })}
                                            </span>
                                            <span className="text-muted-foreground">·</span>
                                            <span className="text-muted-foreground">{r.booking.referenceCode}</span>
                                            {r.redirectedToGoogle && (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                    <ExternalLink className="w-3 h-3" /> Google
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-20">Atención</span><Stars value={r.serviceScore} /></div>
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-20">Habitación</span><Stars value={r.roomScore} /></div>
                                            <div className="flex items-center gap-2"><span className="text-muted-foreground w-20">Limpieza</span><Stars value={r.cleanlinessScore} /></div>
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
