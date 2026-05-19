"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
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
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground font-medium">Cargando inventario...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                eyebrow="Hotel"
                title={`Inventario · ${hotel?.name ?? ''}`}
                description="Gestión de habitaciones y planes de tarifas."
                actions={
                    <>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/admin/hotels"><ArrowLeft className="size-4" /></Link>
                        </Button>
                        <Button variant="outline" onClick={() => loadAllData()}>
                            Actualizar Datos
                        </Button>
                    </>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                    <TabsTrigger value="rooms" className="gap-2">
                        <BedDouble className="size-4" /> Habitaciones
                    </TabsTrigger>
                    <TabsTrigger value="rates" className="gap-2">
                        <Tags className="size-4" /> Precios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="rooms" className="space-y-6 outline-none">
                    <div className="flex justify-between items-center mb-4">
                        <div className="space-y-1">
                            <h2 className="font-display text-lg font-medium tracking-tight">Tipos de Habitación</h2>
                            <p className="text-sm text-muted-foreground">Define las categorías de alojamiento disponibles.</p>
                        </div>
                        <Button onClick={() => {
                            setRoomFormData({ id: '', name: '', basePrice: 0, capacity: 2, quantity: 1 });
                            setShowRoomForm(true);
                        }} className="gap-2">
                            <Plus className="size-4" /> Añadir Categoría
                        </Button>
                    </div>

                    {showRoomForm && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-display text-base font-medium tracking-tight">{roomFormData.id ? 'Editar Categoría' : 'Nueva Categoría'}</CardTitle>
                            </CardHeader>
                            <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Nombre</Label>
                                    <Input
                                        className="h-10"
                                        value={roomFormData.name}
                                        onChange={e => setRoomFormData({...roomFormData, name: e.target.value})}
                                        placeholder="Ej: Suite Deluxe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Capacidad (pax)</Label>
                                    <Input
                                        type="number"
                                        className="h-10"
                                        value={roomFormData.capacity}
                                        onChange={e => setRoomFormData({...roomFormData, capacity: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Precio Base (€)</Label>
                                    <Input
                                        type="number"
                                        className="h-10"
                                        value={roomFormData.basePrice}
                                        onChange={e => setRoomFormData({...roomFormData, basePrice: Number(e.target.value)})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Cantidad Habitaciones</Label>
                                    <Input
                                        type="number"
                                        className="h-10"
                                        value={roomFormData.quantity}
                                        onChange={e => setRoomFormData({...roomFormData, quantity: Number(e.target.value)})}
                                    />
                                </div>
                            </CardContent>
                            <div className="p-6 border-t border-border/60 flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setShowRoomForm(false)}>Cancelar</Button>
                                <Button onClick={handleSaveRoom} className="gap-2">
                                    <Save className="size-4" /> Guardar
                                </Button>
                            </div>
                        </Card>
                    )}

                    {roomTypes.length === 0 ? (
                        <EmptyState
                            icon={BedDouble}
                            title="Sin tipos de habitación"
                            description="Crea la primera categoría para empezar a gestionar el inventario."
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {roomTypes.map((type) => (
                                <Card key={type.id} className="group transition-all">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="font-display text-base font-medium tracking-tight">{type.name}</CardTitle>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={async () => {
                                                    if (confirm(`¿Estás seguro de que quieres eliminar la categoría "${type.name}"?`)) {
                                                        try {
                                                            await fetchAPI(`/property/room-types/${type.id}`, { method: 'DELETE' });
                                                            loadAllData();
                                                        } catch (e) {
                                                            alert("Error al eliminar la categoría");
                                                        }
                                                    }
                                                }}>
                                                    <Trash2 className="size-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon-sm" onClick={() => {
                                                    setRoomFormData({
                                                        id: type.id,
                                                        name: type.name,
                                                        basePrice: type.basePrice,
                                                        capacity: type.capacity,
                                                        quantity: type.rooms?.length || 1
                                                    });
                                                    setShowRoomForm(true);
                                                }}>
                                                    <Settings className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="size-4" />
                                                <span>Capacidad: {type.capacity} personas</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <BedDouble className="size-4" />
                                                <span>Unidades: {type.rooms?.length || 0} habitaciones</span>
                                            </div>
                                            <div className="flex items-center gap-2 font-display text-lg font-medium text-primary mt-2">
                                                <Euro className="size-4" />
                                                <span>{type.basePrice} / noche</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="rates" className="space-y-6 outline-none">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                                    <Tags className="size-4 text-primary" />
                                    Calendario de Precios
                                </CardTitle>
                                <CardDescription>Calendariza precios por temporada o días específicos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-eyebrow">Plan de Tarifas</Label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setRatePlanFormData({ id: '', name: '', mealsIncluded: 'Solo alojamiento', isDefault: false });
                                                setShowRatePlanForm(!showRatePlanForm);
                                            }}
                                        >
                                            {showRatePlanForm ? 'Cerrar' : '+ Nuevo'}
                                        </Button>
                                    </div>

                                    {showRatePlanForm ? (
                                        <div className="p-3 border border-border rounded-md bg-muted/40 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1.5">
                                                <Label className="text-eyebrow">Nombre del Plan</Label>
                                                <Input
                                                    className="h-10"
                                                    placeholder="Ej: No Reembolsable"
                                                    value={ratePlanFormData.name}
                                                    onChange={e => setRatePlanFormData({...ratePlanFormData, name: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-eyebrow">Régimen</Label>
                                                <Select
                                                    value={ratePlanFormData.mealsIncluded}
                                                    onValueChange={v => setRatePlanFormData({...ratePlanFormData, mealsIncluded: v})}
                                                >
                                                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Solo alojamiento">Solo alojamiento</SelectItem>
                                                        <SelectItem value="Desayuno incluido">Desayuno incluido</SelectItem>
                                                        <SelectItem value="Media pensión">Media pensión</SelectItem>
                                                        <SelectItem value="Pensión completa">Pensión completa</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <Button size="sm" className="flex-1" onClick={handleSaveRatePlan}>Guardar Plan</Button>
                                                {ratePlanFormData.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteRatePlan(ratePlanFormData.id)}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Select
                                                value={rateFormData.ratePlanId}
                                                onValueChange={v => setRateFormData({...rateFormData, ratePlanId: v})}
                                            >
                                                <SelectTrigger className="h-10 flex-1"><SelectValue placeholder="Selecciona plan..." /></SelectTrigger>
                                                <SelectContent>
                                                    {ratePlans.map(rp => <SelectItem key={rp.id} value={rp.id}>{rp.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                variant="outline"
                                                size="icon"
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
                                                <Settings className="size-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Tipo de Habitación</Label>
                                    <Select
                                        value={rateFormData.roomTypeId}
                                        onValueChange={v => setRateFormData({...rateFormData, roomTypeId: v})}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                                        <SelectContent>
                                            {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-eyebrow">Desde</Label>
                                        <Input
                                            type="date"
                                            className="h-10"
                                            value={rateFormData.start}
                                            onChange={e => setRateFormData({...rateFormData, start: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-eyebrow">Hasta</Label>
                                        <Input
                                            type="date"
                                            className="h-10"
                                            value={rateFormData.end}
                                            onChange={e => setRateFormData({...rateFormData, end: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label className="text-eyebrow">Días de aplicación</Label>
                                    <div className="flex justify-between gap-1">
                                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
                                            <button
                                                key={i}
                                                onClick={() => toggleDay(i)}
                                                className={`size-8 rounded-full text-[11px] font-medium transition-all border ${rateFormData.daysOfWeek.includes(i) ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/50'}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button variant="outline" size="sm" onClick={() => setPreset('weekends')}>Fines de semana</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPreset('weekdays')}>Entre semana</Button>
                                        <Button variant="outline" size="sm" onClick={() => setPreset('all')}>Todos</Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-border/60 mt-4">
                                    <Label className="text-eyebrow text-primary">Precio Final (€)</Label>
                                    <div className="relative">
                                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            className="h-10 pl-9 font-medium"
                                            value={rateFormData.price}
                                            onChange={e => setRateFormData({...rateFormData, price: Number(e.target.value)})}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleBulkPriceUpdate} className="w-full gap-2 mt-4">
                                    <Save className="size-4" /> Actualizar Calendario
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Calendario de Precios (Vista rápida)</CardTitle>
                                <CardDescription>Próximos 7 días para el tipo seleccionado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2 overflow-x-auto pb-4">
                                    {[...Array(7)].map((_, i) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + i);
                                        return (
                                            <div key={i} className="min-w-[100px] flex-1 border border-border rounded-md p-3 text-center bg-muted/40">
                                                <div className="text-eyebrow">
                                                    {format(d, 'EEE', { locale: undefined })}
                                                </div>
                                                <div className="font-display text-lg font-medium mt-1">
                                                    {format(d, 'dd')}
                                                </div>
                                                <div className="mt-2 text-sm font-medium text-primary">
                                                    {roomTypes.find(rt => rt.id === rateFormData.roomTypeId)?.basePrice || 0}€
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-md text-xs text-warning-foreground">
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
        <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando inventario...</div>}>
            <HotelInventoryContent />
        </Suspense>
    );
}
