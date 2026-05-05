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
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (contextId) {
            loadEntity();
        }
    }, [contextId, contextType]);

    async function loadEntity() {
        setLoading(true);
        try {
            const url = contextType === 'hotel' ? `/property/hotels/${contextId}` : `/restaurant/${contextId}`;
            const data = await fetchAPI(url);
            setEntity(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const hasSynergy = entity?.restaurantId || entity?.hotel;
    const synergyId = contextType === 'hotel' ? entity?.restaurantId : entity?.hotel?.id;



    // Helper to keep context in links
    const getContextLink = (basePath: string) => {
        const params = new URLSearchParams(searchParams.toString());
        return `${basePath}?${params.toString()}`;
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos {isGlobal ? 'Totales' : (contextType === 'hotel' ? 'Hotel' : 'Restaurante')}</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€45,231.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% vs mes pasado</p>
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
                            <div className="text-2xl font-bold">+2350</div>
                            <p className="text-xs text-muted-foreground">+180.1% vs mes pasado</p>
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
                            <div className="text-2xl font-bold">85%</div>
                            <p className="text-xs text-muted-foreground">+19% vs mes pasado</p>
                        </CardContent>
                    </Card>
                )}

                {/* Restaurant Specific Metric */}
                {(isGlobal || contextType === 'restaurant' || hasSynergy) && (
                    <Card className={hasSynergy ? "border-blue-200 bg-blue-50/10" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Cubiertos {isGlobal ? 'Totales' : ''} 
                                {hasSynergy && contextType === 'hotel' && (
                                    <span className="text-[10px] ml-2 text-blue-500 font-bold uppercase tracking-tighter">
                                        ({entity?.restaurant?.name || 'Restaurante'})
                                    </span>
                                )}
                            </CardTitle>
                            <Utensils className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+573</div>
                            <p className="text-xs text-muted-foreground">+201 última hora</p>
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
                        <div className="text-2xl font-bold">+12,234</div>
                        <p className="text-xs text-muted-foreground">+12% vs ayer</p>
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
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600 mr-2">
                                    {contextType === 'hotel' ? <Building2 className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                                </div>
                                <div className="ml-2 space-y-1">
                                    <p className="text-sm font-medium leading-none">Olivia Martin</p>
                                    <p className="text-sm text-muted-foreground">olivia.martin@email.com</p>
                                </div>
                                <div className="ml-auto font-medium">+€1,999.00</div>
                            </div>
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-full text-purple-600 mr-2">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div className="ml-2 space-y-1">
                                    <p className="text-sm font-medium leading-none">Jackson Lee</p>
                                    <p className="text-sm text-muted-foreground">jackson.lee@email.com</p>
                                </div>
                                <div className="ml-auto font-medium">+€39.00</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Acciones Rápidas</CardTitle>
                        <CardDescription>Acceso directo a herramientas clave</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        {/* Always show if global, or show specific one if in context */}
                        {(isGlobal || contextType === 'hotel' || hasSynergy) && (
                            <Link href={getContextLink('/admin/hotels')} className="w-full">
                                <Button className="w-full justify-start gap-2" variant="outline">
                                    <Building2 className="w-4 h-4" /> 
                                    {hasSynergy && contextType === 'restaurant' ? 'Gestionar Hotel Vinculado' : 'Gestionar Habitaciones'}
                                </Button>
                            </Link>
                        )}
                        
                        {(isGlobal || contextType === 'restaurant' || hasSynergy) && (
                            <Link href={getContextLink('/admin/restaurant')} className="w-full">
                                <Button className="w-full justify-start gap-2" variant="outline">
                                    <Utensils className="w-4 h-4" /> 
                                    {hasSynergy && contextType === 'hotel' ? 'Gestionar Restaurante Vinculado' : 'Mesas Restaurante'}
                                </Button>
                            </Link>
                        )}


                        {/* Hotel Reservation Button */}
                        <Link href={getContextLink('/admin/calendar')} className="w-full">
                            <Button className="w-full justify-start gap-2 bg-purple-600/10 text-purple-600 hover:bg-purple-600/20 border-purple-600/20 font-semibold" variant="outline">
                                <Calendar className="w-4 h-4" /> Crear Reserva de Hotel
                            </Button>
                        </Link>

                        {/* Restaurant Reservation Button */}
                        <Link href={getContextLink('/admin/restaurant')} className="w-full">
                            <Button className="w-full justify-start gap-2 bg-orange-600/10 text-orange-600 hover:bg-orange-600/20 border-orange-600/20 font-semibold" variant="outline">
                                <Utensils className="w-4 h-4" /> Crear Reserva de Restaurante
                            </Button>
                        </Link>

                        {hasSynergy && (
                             <Link href={`/admin/${contextType === 'hotel' ? 'restaurant' : 'hotels'}/${synergyId}`} className="w-full">
                                <Button className="w-full justify-start gap-2 bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 border-blue-600/20" variant="outline">
                                    <Sparkles className="w-4 h-4" /> Ver {contextType === 'hotel' ? 'Restaurante' : 'Hotel'} Vinculado
                                </Button>
                            </Link>
                        )}



                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
