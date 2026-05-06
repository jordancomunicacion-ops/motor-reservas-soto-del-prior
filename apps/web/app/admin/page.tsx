"use client";
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { Building2, Utensils, Calendar, Users, TrendingUp, CreditCard, Sparkles } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { useEffect, useState } from 'react';



export default function AdminDashboard() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');
    const isGlobal = !contextId;

    const [entity, setEntity] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [contextId, contextType]);

    async function loadData() {
        setLoading(true);
        try {
            const [statsData, entityData] = await Promise.all([
                fetchAPI('/global/stats'),
                contextId ? fetchAPI(contextType === 'hotel' ? `/property/hotels/${contextId}` : `/restaurant/${contextId}`) : Promise.resolve(null)
            ]);
            setStats(statsData);
            setEntity(entityData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    // Helper to keep context in links
    const getContextLink = (basePath: string) => {
        const params = new URLSearchParams(searchParams.toString());
        return `${basePath}?${params.toString()}`;
    };

    if (loading && !stats) {
        return <div className="flex items-center justify-center h-[400px] text-muted-foreground animate-pulse">Cargando estadísticas reales...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos {isGlobal ? 'Totales' : (contextType === 'hotel' ? 'Hotel' : 'Restaurante')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{stats?.revenue?.total.toLocaleString() || '0.00'}</div>
                        <p className="text-xs text-muted-foreground">{stats?.revenue?.change >= 0 ? '+' : ''}{stats?.revenue?.change}% vs mes pasado</p>
                    </CardContent>
                </Card>
                
                {/* Conditional Metric 1 */}
                {(isGlobal || contextType === 'hotel') && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Reservas Activas</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+{stats?.activeReservations?.total || '0'}</div>
                            <p className="text-xs text-muted-foreground">{stats?.activeReservations?.change >= 0 ? '+' : ''}{stats?.activeReservations?.change}% vs mes pasado</p>
                        </CardContent>
                    </Card>
                )}

                {(isGlobal || contextType === 'hotel') && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats?.occupancy?.percentage || '0'}%</div>
                            <p className="text-xs text-muted-foreground">{stats?.occupancy?.change >= 0 ? '+' : ''}{stats?.occupancy?.change}% vs mes pasado</p>
                        </CardContent>
                    </Card>
                )}

                {/* Restaurant Specific Metric */}
                {(isGlobal || contextType === 'restaurant' || entity?.restaurantId) && (
                    <Card className={entity?.restaurantId ? "border-blue-200 bg-blue-50/10" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Cubiertos {isGlobal ? 'Totales' : ''} 
                                {entity?.restaurantId && contextType === 'hotel' && (
                                    <span className="text-[10px] ml-2 text-blue-500 font-bold uppercase tracking-tighter">
                                        (Vinculado)
                                    </span>
                                )}
                            </CardTitle>
                            <Utensils className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+{stats?.covers?.total || '0'}</div>
                            <p className="text-xs text-muted-foreground">{stats?.covers?.change >= 0 ? '+' : ''}{stats?.covers?.change} última hora</p>
                        </CardContent>
                    </Card>
                )}


                {/* Visitor Metric */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Visitas Web</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+0</div>
                        <p className="text-xs text-muted-foreground">+0% vs ayer</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Reservas Recientes</CardTitle>
                        <CardDescription>
                            {isGlobal 
                                ? "Viendo actividad de toda la propiedad." 
                                : `Viendo actividad de ${contextType === 'hotel' ? 'este hotel' : 'este restaurante'}.`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats?.recentBookings?.length > 0 ? stats.recentBookings.map((booking: any) => (
                                <div key={booking.id} className="flex items-center">
                                    <div className="p-2 bg-blue-100 rounded-full text-blue-600 mr-2">
                                        {booking.type === 'hotel' ? <Building2 className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                                    </div>
                                    <div className="ml-2 space-y-1">
                                        <p className="text-sm font-medium leading-none">{booking.customerName}</p>
                                        <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                                    </div>
                                    <div className="ml-auto text-xs text-muted-foreground">
                                        {new Date(booking.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                    </div>
                                    <div className="ml-4 font-medium">
                                        {booking.amount > 0 ? `+€${booking.amount.toLocaleString()}` : '-'}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-muted-foreground italic">No hay reservas recientes.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Acciones Rápidas</CardTitle>
                        <CardDescription>Acceso directo a herramientas clave</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {(isGlobal || contextType === 'hotel' || entity?.restaurantId) && (
                            <Link href={getContextLink('/admin/hotels')} className="w-full">
                                <Button className="w-full justify-start gap-2" variant="outline">
                                    <Building2 className="w-4 h-4" /> 
                                    {entity?.restaurantId && contextType === 'restaurant' ? 'Gestionar Hotel Vinculado' : 'Gestionar Habitaciones'}
                                </Button>
                            </Link>
                        )}
                        
                        {(isGlobal || contextType === 'restaurant' || entity?.restaurantId) && (
                            <Link href={getContextLink('/admin/restaurant')} className="w-full">
                                <Button className="w-full justify-start gap-2" variant="outline">
                                    <Utensils className="w-4 h-4" /> 
                                    {entity?.restaurantId && contextType === 'hotel' ? 'Gestionar Restaurante Vinculado' : 'Mesas Restaurante'}
                                </Button>
                            </Link>
                        )}

                        <Link href={getContextLink('/admin/calendar')} className="w-full">
                            <Button className="w-full justify-start gap-2 bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 border-purple-600/20 font-semibold" variant="outline">
                                <Calendar className="w-4 h-4" /> Crear Reserva de Hotel
                            </Button>
                        </Link>

                        <Link href={getContextLink('/admin/restaurant')} className="w-full">
                            <Button className="w-full justify-start gap-2 bg-orange-600/10 text-orange-600 hover:bg-orange-600/20 border-orange-600/20 font-semibold" variant="outline">
                                <Utensils className="w-4 h-4" /> Crear Reserva de Restaurante
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
