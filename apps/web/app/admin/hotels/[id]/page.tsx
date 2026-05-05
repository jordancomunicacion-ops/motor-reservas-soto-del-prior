"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
    Building2, 
    BedDouble, 
    Tags, 
    Share2, 
    Settings, 
    ArrowLeft,
    Calendar,
    Users,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';

function HotelDashboardContent() {
    const params = useParams();
    const router = useRouter();
    const hotelId = params.id as string;
    const [hotel, setHotel] = useState<any>(null);
    const [stats, setStats] = useState({ rooms: 0, activeRates: 0, connections: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [hotelId]);

    async function loadData() {
        try {
            const [hotelData, roomsData, ratesData] = await Promise.all([
                fetchAPI(`/property/hotels/${hotelId}`),
                fetchAPI(`/property/hotels/${hotelId}/room-types`),
                fetchAPI(`/rates/plans/${hotelId}`)
            ]);
            setHotel(hotelData);
            setStats({
                rooms: roomsData.length,
                activeRates: ratesData.length,
                connections: Object.keys(hotelData.integrations || {}).filter(k => hotelData.integrations[k].enabled).length
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Cargando dashboard...</div>;

    const modules = [
        {
            title: "Inventario de Habitaciones",
            description: "Define tipos de habitación, capacidades y stock.",
            icon: BedDouble,
            href: `/admin/hotels/${hotelId}/inventory`,
            color: "text-blue-600",
            bg: "bg-blue-100 dark:bg-blue-900/30",
            stat: `${stats.rooms} Tipos`
        },
        {
            title: "Tarifas y Precios",
            description: "Gestiona planes de precios y actualizaciones masivas.",
            icon: Tags,
            href: `/admin/hotels/${hotelId}/inventory?tab=rates`,
            color: "text-orange-600",
            bg: "bg-orange-100 dark:bg-orange-900/30",
            stat: `${stats.activeRates} Planes`
        },
        {
            title: "Conexiones y Canales",
            description: "Sincroniza con Booking, Airbnb y otros.",
            icon: Share2,
            href: `/admin/hotels/${hotelId}/connections`,
            color: "text-purple-600",
            bg: "bg-purple-100 dark:bg-purple-900/30",
            stat: `${stats.connections} Activas`
        }
    ];

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <header className="flex items-center gap-4">
                <Link href="/admin/hotels" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{hotel?.name}</h1>
                    <p className="text-muted-foreground">Panel de gestión centralizada</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-zinc-900 shadow-sm border-none ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ocupación Hoy</p>
                                <h3 className="text-2xl font-bold">85%</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 shadow-sm border-none ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">RevPAR (Media)</p>
                                <h3 className="text-2xl font-bold">124€</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 shadow-sm border-none ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Nuevas Reservas</p>
                                <h3 className="text-2xl font-bold">12</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 shadow-sm border-none ring-1 ring-gray-100 dark:ring-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                                <Tags className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Reservas Activas</p>
                                <h3 className="text-2xl font-bold">48</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {modules.map((m, i) => (
                    <Link key={i} href={m.href}>
                        <Card className="hover:shadow-md transition-all cursor-pointer group border-none ring-1 ring-gray-100 dark:ring-zinc-800 overflow-hidden">
                            <div className="flex items-center p-6 gap-6">
                                <div className={`p-4 rounded-2xl ${m.bg} ${m.color} transition-transform group-hover:scale-110`}>
                                    <m.icon className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold">{m.title}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${m.bg} ${m.color}`}>
                                            {m.stat}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground mt-1">{m.description}</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default function HotelDashboardPage() {
    return (
        <Suspense fallback={<div>Cargando dashboard...</div>}>
            <HotelDashboardContent />
        </Suspense>
    );
}
