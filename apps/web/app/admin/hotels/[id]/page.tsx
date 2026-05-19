"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { MetricCard } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BedDouble,
    Tags,
    Share2,
    ArrowLeft,
    Calendar,
    Users,
    TrendingUp,
    ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

interface HotelDetail {
    id: string;
    name: string;
    integrations?: Record<string, { enabled?: boolean }> | null;
}
interface RoomTypeRow { id: string }
interface RatePlanRow { id: string }

function HotelDashboardContent() {
    const params = useParams();
    const hotelId = params.id as string;
    const [hotel, setHotel] = useState<HotelDetail | null>(null);
    const [stats, setStats] = useState({ rooms: 0, activeRates: 0, connections: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [hotelId]);

    async function loadData() {
        try {
            const [hotelData, roomsData, ratesData] = await Promise.all([
                fetchAPI<HotelDetail>(`/property/hotels/${hotelId}`),
                fetchAPI<RoomTypeRow[]>(`/property/hotels/${hotelId}/room-types`),
                fetchAPI<RatePlanRow[]>(`/rates/plans/${hotelId}`),
            ]);
            setHotel(hotelData);
            const integrations = hotelData.integrations || {};
            setStats({
                rooms: roomsData.length,
                activeRates: ratesData.length,
                connections: Object.values(integrations).filter(i => i?.enabled).length,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const modules: { title: string; description: string; icon: LucideIcon; href: string; stat: string }[] = [
        {
            title: "Inventario de habitaciones",
            description: "Define tipos de habitación, capacidades y stock.",
            icon: BedDouble,
            href: `/admin/hotels/${hotelId}/inventory`,
            stat: `${stats.rooms} tipos`,
        },
        {
            title: "Tarifas y precios",
            description: "Gestiona planes de precios y actualizaciones masivas.",
            icon: Tags,
            href: `/admin/hotels/${hotelId}/inventory?tab=rates`,
            stat: `${stats.activeRates} planes`,
        },
        {
            title: "Conexiones y canales",
            description: "Sincroniza con Booking, Airbnb y otros.",
            icon: Share2,
            href: `/admin/hotels/${hotelId}/connections`,
            stat: `${stats.connections} activas`,
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon-sm" asChild aria-label="Volver">
                    <Link href="/admin/hotels">
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <PageHeader
                    className="flex-1 pb-0 border-b-0"
                    eyebrow="Hotel"
                    title={loading ? <Skeleton className="h-8 w-64" /> : hotel?.name ?? 'Hotel'}
                    description="Panel de gestión centralizada."
                />
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Ocupación hoy" value="85%" icon={Calendar} />
                <MetricCard label="RevPAR (media)" value="124€" icon={TrendingUp} />
                <MetricCard label="Nuevas reservas" value="12" icon={Users} />
                <MetricCard label="Reservas activas" value="48" icon={Tags} />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((m) => (
                    <Link key={m.href} href={m.href} className="group">
                        <Card className="transition-shadow hover:shadow-md gap-0 py-5">
                            <CardContent className="flex items-center gap-4">
                                <span className="grid place-items-center size-12 rounded-md bg-primary/10 text-primary shrink-0">
                                    <m.icon className="size-5" />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-display text-base font-medium tracking-tight truncate">
                                            {m.title}
                                        </h3>
                                        <span className="text-[11px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                            {m.stat}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>
                                </div>
                                <ChevronRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </section>
        </div>
    );
}

export default function HotelDashboardPage() {
    return (
        <Suspense
            fallback={
                <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-32 w-full" />
                </div>
            }
        >
            <HotelDashboardContent />
        </Suspense>
    );
}
