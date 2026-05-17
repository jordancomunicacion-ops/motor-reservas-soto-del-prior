"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    ArrowLeft, 
    Plus, 
    BedDouble, 
    Tags, 
    Save, 
    Trash2, 
    Users, 
    Euro, 
    Calendar as CalendarIcon,
    Loader2,
    Settings
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

interface HotelSummary {
    id: string;
    name?: string;
}
interface RoomTypeRow {
    id: string;
    name: string;
    basePrice: number;
    capacity: number;
    rooms?: Array<{ id: string }>;
}
interface RatePlanRow {
    id: string;
    name: string;
    mealsIncluded?: string | null;
    isDefault?: boolean;
}

function HotelInventoryContent() {
    const params = useParams();
    const router = useRouter();
    const hotelId = params.id as string;

    const [hotel, setHotel] = useState<HotelSummary | null>(null);
    const [roomTypes, setRoomTypes] = useState<RoomTypeRow[]>([]);
    const [ratePlans, setRatePlans] = useState<RatePlanRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("rooms");

    // Room Type Form State
    const [showRoomForm, setShowRoomForm] = useState(false);
    const [roomFormData, setRoomFormData] = useState({
        id: '',
        name: '',
        basePrice: 0,
        capacity: 2,
        quantity: 1
    });

    // Rate Update Form State
    const [rateFormData, setRateFormData] = useState({
        ratePlanId: '',
        roomTypeId: '',
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
        price: 0,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6] // Default all days
    });

    // Rate Plan Management State
    const [showRatePlanForm, setShowRatePlanForm] = useState(false);
    const [ratePlanFormData, setRatePlanFormData] = useState({
        id: '',
        name: '',
        mealsIncluded: 'Solo alojamiento',
        isDefault: false
    });

    useEffect(() => {
        loadAllData();
    }, [hotelId]);

    async function loadAllData() {
        setLoading(true);
        try {
            const [hotelData, roomsData, ratesData] = await Promise.all([
                fetchAPI<HotelSummary>(`/property/hotels/${hotelId}`),
                fetchAPI<RoomTypeRow[]>(`/property/hotels/${hotelId}/room-types`),
                fetchAPI<RatePlanRow[]>(`/rates/plans/${hotelId}`),
            ]);
            setHotel(hotelData);
            setRoomTypes(roomsData);
            setRatePlans(ratesData);
            
            if (ratesData.length > 0) {
                setRateFormData(prev => ({ ...prev, ratePlanId: ratesData[0].id }));
            }
            if (roomsData.length > 0) {
                setRateFormData(prev => ({ ...prev, roomTypeId: roomsData[0].id }));
            }
        } catch (e) {
            console.error("Error loading inventory data", e);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveRoom = async () => {
        try {
            const method = roomFormData.id ? 'PATCH' : 'POST';
            const url = roomFormData.id 
                ? `/property/room-types/${roomFormData.id}` 
                : `/property/hotels/${hotelId}/room-types`;
            
            await fetchAPI(url, {
                method,
                body: JSON.stringify(roomFormData)
            });
            
            setShowRoomForm(false);
            loadAllData();
            alert("Habitación guardada");
        } catch (e) {
            alert("Error al guardar habitación");
        }
    };

    const handleSaveRatePlan = async () => {
        if (!ratePlanFormData.name) {
            alert("El nombre del plan es obligatorio");
            return;
        }
        try {
            const method = ratePlanFormData.id ? 'PATCH' : 'POST';
            const url = ratePlanFormData.id 
                ? `/rates/plans/${ratePlanFormData.id}` 
                : `/rates/plans`;
            
            await fetchAPI(url, {
                method,
                body: JSON.stringify({
                    ...ratePlanFormData,
                    hotelId
                })
            });
            
            setShowRatePlanForm(false);
            loadAllData();
            alert("Plan de tarifas guardado");
        } catch (e) {
            alert("Error al guardar plan de tarifas");
        }
    };

    const handleDeleteRatePlan = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este plan? Se perderán todos los precios asociados.")) return;
        try {
            await fetchAPI(`/rates/plans/${id}`, { method: 'DELETE' });
            loadAllData();
        } catch (e) {
            alert("Error al eliminar plan de tarifas");
        }
    };

    const handleBulkPriceUpdate = async () => {
        if (!rateFormData.price || !rateFormData.roomTypeId || !rateFormData.ratePlanId) {
            alert("Por favor completa todos los campos");
            return;
        }
        try {
            const res = await fetchAPI('/rates/prices/bulk', {
                method: 'POST',
                body: JSON.stringify({
                    hotelId,
                    ...rateFormData,
                    price: Number(rateFormData.price),
                    fromDate: rateFormData.start,
                    toDate: rateFormData.end
                })
            });
            alert(`Precios actualizados: ${res.count} registros afectados.`);
        } catch (e) {
            alert("Error al actualizar precios");
        }
    };

    const toggleDay = (day: number) => {
        setRateFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day) 
                ? prev.daysOfWeek.filter(d => d !== day) 
                : [...prev.daysOfWeek, day]
        }));
    };

    const setPreset = (type: 'weekends' | 'weekdays' | 'all') => {
        if (type === 'weekends') setRateFormData(prev => ({ ...prev, daysOfWeek: [5, 6, 0] })); // Fri, Sat, Sun
        if (type === 'weekdays') setRateFormData(prev => ({ ...prev, daysOfWeek: [1, 2, 3, 4] })); // Mon-Thu
        if (type === 'all') setRateFormData(prev => ({ ...prev, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-muted-foreground font-medium">Cargando inventario...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/hotels" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{hotel?.name}</h1>
                        <p className="text-muted-foreground">Gestión de Inventario y Tarifas</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => loadAllData()}>
                        Actualizar Datos
                    </Button>
                </div>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                    <TabsTrigger value="rooms" className="gap-2">
                        <BedDouble className="w-4 h-4" /> Habitaciones
                    </TabsTrigger>
                    <TabsTrigger value="rates" className="gap-2">
                        <Tags className="w-4 h-4" /> Precios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rooms" className="space-y-6 outline-none">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Tipos de Habitación</h2>
                            <p className="text-sm text-muted-foreground">Define las categorías de alojamiento disponibles.</p>
                        </div>
                        <Button onClick={() => {
                            setRoomFormData({ id: '', name: '', basePrice: 0, capacity: 2, quantity: 1 });
                            setShowRoomForm(true);
                        }} className="gap-2">
                            <Plus className="w-4 h-4" /> Añadir Categoría
                        </Button>
                    </div>

                    {showRoomForm && (
                        <Card className="border-blue-200 dark:border-blue-900 shadow-lg bg-blue-50/30 dark:bg-blue-900/10">
                            <CardHeader>
                                <CardTitle>{roomFormData.id ? 'Editar Categoría' : 'Nueva Categoría'}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre</Label>
                                    <Input 
                                        value={roomFormData.name} 
                                        onChange={e => setRoomFormData({...roomFormData, name: e.target.value})}
                                        placeholder="Ej: Suite Deluxe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Capacidad (pax)</Label>
                                    <Input 
                                        type="number" 
                                        value={roomFormData.capacity} 
                                        onChange={e => setRoomFormData({...roomFormData, capacity: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio Base (€)</Label>
                                    <Input 
                                        type="number" 
                                        value={roomFormData.basePrice} 
                                        onChange={e => setRoomFormData({...roomFormData, basePrice: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cantidad Habitaciones</Label>
                                    <Input 
                                        type="number" 
                                        value={roomFormData.quantity} 
                                        onChange={e => setRoomFormData({...roomFormData, quantity: Number(e.target.value)})}
                                    />
                                </div>
                            </CardContent>
                            <div className="p-6 border-t flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setShowRoomForm(false)}>Cancelar</Button>
                                <Button onClick={handleSaveRoom} className="gap-2">
                                    <Save className="w-4 h-4" /> Guardar
                                </Button>
                            </div>
                        </Card>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roomTypes.map((type) => (
                            <Card key={type.id} className="group hover:border-blue-400 transition-all shadow-sm">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{type.name}</CardTitle>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={async () => {
                                                if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${type.name}"?`)) {
                                                    try {
                                                        await fetchAPI(`/property/room-types/${type.id}`, { method: 'DELETE' });
                                                        loadAllData();
                                                    } catch (e) {
                                                        alert("Error al eliminar la categoría");
                                                    }
                                                }
                                            }}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                setRoomFormData({
                                                    id: type.id,
                                                    name: type.name,
                                                    basePrice: type.basePrice,
                                                    capacity: type.capacity,
                                                    quantity: type.rooms?.length || 1
                                                });
                                                setShowRoomForm(true);
                                            }}>
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="w-4 h-4" />
                                            <span>Capacidad: {type.capacity} personas</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <BedDouble className="w-4 h-4" />
                                            <span>Unidades: {type.rooms?.length || 0} habitaciones</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                                            <Euro className="w-5 h-5" />
                                            <span>{type.basePrice} / noche</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="rates" className="space-y-6 outline-none">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1 shadow-sm border-orange-100 dark:border-orange-900/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Tags className="w-5 h-5 text-orange-500" />
                                    Calendario de Precios
                                </CardTitle>
                                <CardDescription>Calendariza precios por temporada o días específicos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Plan de Tarifas</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-6 text-[10px] gap-1 px-1"
                                            onClick={() => {
                                                setRatePlanFormData({ id: '', name: '', mealsIncluded: 'Solo alojamiento', isDefault: false });
                                                setShowRatePlanForm(!showRatePlanForm);
                                            }}
                                        >
                                            {showRatePlanForm ? 'Cerrar' : '+ Nuevo'}
                                        </Button>
                                    </div>

                                    {showRatePlanForm ? (
                                        <div className="p-3 border rounded-lg bg-orange-50/50 dark:bg-orange-900/10 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <Label className="text-[10px]">Nombre del Plan</Label>
                                                <Input 
                                                    className="h-8 text-xs" 
                                                    placeholder="Ej: No Reembolsable" 
                                                    value={ratePlanFormData.name}
                                                    onChange={e => setRatePlanFormData({...ratePlanFormData, name: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px]">Régimen</Label>
                                                <select 
                                                    className="w-full p-1 text-xs border rounded bg-transparent"
                                                    value={ratePlanFormData.mealsIncluded}
                                                    onChange={e => setRatePlanFormData({...ratePlanFormData, mealsIncluded: e.target.value})}
                                                >
                                                    <option value="Solo alojamiento">Solo alojamiento</option>
                                                    <option value="Desayuno incluido">Desayuno incluido</option>
                                                    <option value="Media pensión">Media pensión</option>
                                                    <option value="Pensión completa">Pensión completa</option>
                                                </select>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button size="sm" className="h-7 text-[10px] flex-1" onClick={handleSaveRatePlan}>Guardar Plan</Button>
                                                {ratePlanFormData.id && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-7 w-7 p-0 text-red-500" 
                                                        onClick={() => handleDeleteRatePlan(ratePlanFormData.id)}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <select 
                                                className="flex-1 p-2 border rounded bg-transparent text-sm"
                                                value={rateFormData.ratePlanId}
                                                onChange={e => setRateFormData({...rateFormData, ratePlanId: e.target.value})}
                                            >
                                                {ratePlans.map(rp => <option key={rp.id} value={rp.id}>{rp.name}</option>)}
                                            </select>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="h-9 w-9"
                                                onClick={() => {
                                                    const plan = ratePlans.find(p => p.id === rateFormData.ratePlanId);
                                                    if (plan) {
                                                        setRatePlanFormData({
                                                            id: plan.id,
                                                            name: plan.name,
                                                            mealsIncluded: plan.mealsIncluded || 'Solo alojamiento',
                                                            isDefault: plan.isDefault ?? false,
                                                        });
                                                        setShowRatePlanForm(true);
                                                    }
                                                }}
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Habitación</Label>
                                    <select 
                                        className="w-full p-2 border rounded bg-transparent text-sm"
                                        value={rateFormData.roomTypeId}
                                        onChange={e => setRateFormData({...rateFormData, roomTypeId: e.target.value})}
                                    >
                                        {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Desde</Label>
                                        <Input 
                                            type="date" 
                                            className="text-xs"
                                            value={rateFormData.start} 
                                            onChange={e => setRateFormData({...rateFormData, start: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Hasta</Label>
                                        <Input 
                                            type="date" 
                                            className="text-xs"
                                            value={rateFormData.end} 
                                            onChange={e => setRateFormData({...rateFormData, end: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Días de aplicación</Label>
                                    <div className="flex justify-between gap-1">
                                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
                                            <button
                                                key={i}
                                                onClick={() => toggleDay(i)}
                                                className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all border ${rateFormData.daysOfWeek.includes(i) ? 'bg-orange-500 border-orange-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-orange-300'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 py-0" onClick={() => setPreset('weekends')}>Fines de semana</Button>
                                        <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 py-0" onClick={() => setPreset('weekdays')}>Entre semana</Button>
                                        <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 py-0" onClick={() => setPreset('all')}>Todos</Button>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t mt-4">
                                    <Label className="text-orange-600 font-bold">Precio Final (€)</Label>
                                    <div className="relative">
                                        <Euro className="absolute left-3 top-2.5 w-4 h-4 text-orange-400" />
                                        <Input 
                                            type="number" 
                                            className="pl-9 text-lg font-bold border-orange-200 focus:ring-orange-500"
                                            value={rateFormData.price} 
                                            onChange={e => setRateFormData({...rateFormData, price: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleBulkPriceUpdate} className="w-full gap-2 mt-4 bg-orange-600 hover:bg-orange-700 shadow-orange-200 shadow-lg">
                                    <Save className="w-4 h-4" /> Actualizar Calendario
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2 shadow-sm">
                            <CardHeader>
                                <CardTitle>Calendario de Precios (Vista rápida)</CardTitle>
                                <CardDescription>Próximos 7 días para el tipo seleccionado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 overflow-x-auto pb-4">
                                    {[...Array(7)].map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + i);
                                        return (
                                            <div key={i} className="min-w-[100px] flex-1 border rounded-lg p-3 text-center bg-gray-50 dark:bg-zinc-900/50">
                                                <div className="text-[10px] uppercase font-bold text-muted-foreground">
                                                    {format(d, 'EEE', { locale: undefined })}
                                                </div>
                                                <div className="text-lg font-bold">
                                                    {format(d, 'dd')}
                                                </div>
                                                <div className="mt-2 text-sm font-semibold text-blue-600">
                                                    {roomTypes.find(rt => rt.id === rateFormData.roomTypeId)?.basePrice || 0}€
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-100 dark:border-yellow-900/30 text-xs text-yellow-800 dark:text-yellow-200">
                                    <strong>Tip:</strong> Puedes usar la herramienta de la izquierda para cambiar los precios de un rango de fechas completo. Los cambios se verán reflejados en el motor de reservas inmediatamente.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function HotelInventoryPage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando inventario...</div>}>
            <HotelInventoryContent />
        </Suspense>
    );
}
