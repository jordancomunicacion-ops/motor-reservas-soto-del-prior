"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Globe, Database, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function HotelConnectionsContent() {
    const params = useParams();
    const hotelId = params.id as string;
    const [hotel, setHotel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [integrations, setIntegrations] = useState({
        booking: { enabled: false, apiKey: '', syncInventory: true },
        crm: { enabled: false, url: 'http://localhost:3004/api/integrations/hotel', syncBookings: true },
        agora: { enabled: false, endpoint: '', apiToken: '' }
    });

    useEffect(() => {
        loadHotel();
    }, [hotelId]);

    async function loadHotel() {
        try {
            const data = await fetchAPI(`/property/hotels/${hotelId}`);
            setHotel(data);
            if (data.integrations) {
                // Merge with defaults
                setIntegrations(prev => ({ ...prev, ...data.integrations }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            await fetchAPI(`/property/hotels/${hotelId}`, {
                method: 'PATCH',
                body: JSON.stringify({ integrations })
            });
            alert('Conexiones guardadas correctamente');
        } catch (e) {
            alert('Error al guardar conexiones');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8">Cargando...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/admin/hotels" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Conexiones: {hotel?.name}</h1>
                    <p className="text-muted-foreground">Gestiona las integraciones externas para este hotel.</p>
                </div>
                <Button className="ml-auto gap-2" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Booking.com */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Booking.com</CardTitle>
                            <CardDescription>Sincronización de inventario y reservas.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.booking.enabled} 
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Key / ID Hotel</Label>
                            <Input 
                                placeholder="ID de Booking.com" 
                                value={integrations.booking.apiKey}
                                onChange={e => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, apiKey: e.target.value } }))}
                                disabled={!integrations.booking.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar Inventario automáticamente</span>
                            <Switch 
                                checked={integrations.booking.syncInventory}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, syncInventory: val } }))}
                                disabled={!integrations.booking.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* CRM Soto del Prior */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>CRM Soto del Prior</CardTitle>
                            <CardDescription>Envío de perfiles y analítica.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.crm.enabled}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Endpoint CRM</Label>
                            <Input 
                                placeholder="URL del CRM" 
                                value={integrations.crm.url}
                                onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, url: e.target.value } }))}
                                disabled={!integrations.crm.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar reservas en tiempo real</span>
                            <Switch 
                                checked={integrations.crm.syncBookings}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, syncBookings: val } }))}
                                disabled={!integrations.crm.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Agora POS */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Agora POS</CardTitle>
                            <CardDescription>Integración con sistema de ventas.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.agora.enabled}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, agora: { ...prev.agora, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Endpoint Agora</Label>
                            <Input 
                                placeholder="https://api.agora.com/..." 
                                value={integrations.agora.endpoint}
                                onChange={e => setIntegrations(prev => ({ ...prev, agora: { ...prev.agora, endpoint: e.target.value } }))}
                                disabled={!integrations.agora.enabled}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Token de API</Label>
                            <Input 
                                type="password"
                                placeholder="••••••••••••••••" 
                                value={integrations.agora.apiToken}
                                onChange={e => setIntegrations(prev => ({ ...prev, agora: { ...prev.agora, apiToken: e.target.value } }))}
                                disabled={!integrations.agora.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function HotelConnectionsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <HotelConnectionsContent />
        </Suspense>
    );
}
