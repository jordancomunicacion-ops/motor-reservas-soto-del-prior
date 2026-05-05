"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Globe, Database, ArrowLeft, Save, CheckCircle2, Sparkles, CreditCard, Key } from 'lucide-react';
import Link from 'next/link';
import { WidgetConfigSection } from '@/components/admin/WidgetConfigSection';

function HotelConnectionsContent() {
    const params = useParams();
    const hotelId = params.id as string;
    const [hotel, setHotel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [integrations, setIntegrations] = useState({
        booking: { enabled: false, apiKey: '', syncInventory: true },
        airbnb: { enabled: false, icalUrl: '', syncInventory: true },
        expedia: { enabled: false, apiKey: '', syncInventory: true },
        agoda: { enabled: false, apiKey: '', syncInventory: true },
        hostelworld: { enabled: false, apiKey: '', syncInventory: true },
        crm: { enabled: false, url: 'http://localhost:3004/api/integrations/hotel', token: '', syncBookings: true },
        stripe: { enabled: false, publicKey: '', secretKey: '' }
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

    async function handleTestConnection() {
        if (!integrations.crm.url) {
            alert('Por favor, introduce una URL de endpoint');
            return;
        }
        
        try {
            // Replace /hotel or /restaurant with /test for testing
            const testUrl = integrations.crm.url.replace(/\/(hotel|restaurant)$/, '/test');
            
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(integrations.crm.token ? { 'Authorization': `Bearer ${integrations.crm.token}` } : {})
                },
                body: JSON.stringify({ test: true, source: 'ADMIN_TEST' })
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(`Conexión exitosa: ${data.message}`);
            } else {
                alert(`Error de conexión: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            alert('Error al conectar con el CRM. Asegúrate de que la URL es correcta y accesible.');
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
                            <CardDescription>Sincronización de inventario y reservas (Channel Manager).</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.booking.enabled} 
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Key / ID de Hotel en Booking</Label>
                            <Input 
                                placeholder="Ej: 1234567" 
                                value={integrations.booking.apiKey}
                                onChange={e => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, apiKey: e.target.value } }))}
                                disabled={!integrations.booking.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar inventario y tarifas automáticamente</span>
                            <Switch 
                                checked={integrations.booking.syncInventory}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, syncInventory: val } }))}
                                disabled={!integrations.booking.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Airbnb */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Airbnb</CardTitle>
                            <CardDescription>Conexión de calendario (iCal) y reservas.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.airbnb.enabled} 
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, airbnb: { ...prev.airbnb, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>URL de Calendario (iCal)</Label>
                            <Input 
                                placeholder="https://www.airbnb.es/calendar/ical/..." 
                                value={integrations.airbnb.icalUrl}
                                onChange={e => setIntegrations(prev => ({ ...prev, airbnb: { ...prev.airbnb, icalUrl: e.target.value } }))}
                                disabled={!integrations.airbnb.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar disponibilidad bidireccionalmente</span>
                            <Switch 
                                checked={integrations.airbnb.syncInventory}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, airbnb: { ...prev.airbnb, syncInventory: val } }))}
                                disabled={!integrations.airbnb.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Expedia */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Expedia</CardTitle>
                            <CardDescription>Channel Manager para la red Expedia (Hotels.com, etc).</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.expedia.enabled} 
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, expedia: { ...prev.expedia, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Key / Property ID</Label>
                            <Input 
                                placeholder="Ej: EXP-987654" 
                                value={integrations.expedia.apiKey}
                                onChange={e => setIntegrations(prev => ({ ...prev, expedia: { ...prev.expedia, apiKey: e.target.value } }))}
                                disabled={!integrations.expedia.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar inventario automáticamente</span>
                            <Switch 
                                checked={integrations.expedia.syncInventory}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, expedia: { ...prev.expedia, syncInventory: val } }))}
                                disabled={!integrations.expedia.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Agoda */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Agoda</CardTitle>
                            <CardDescription>Integración con la red asiática y global de Agoda.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.agoda.enabled} 
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, agoda: { ...prev.agoda, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Key / Hotel ID</Label>
                            <Input 
                                placeholder="Ej: AG-12345" 
                                value={integrations.agoda.apiKey}
                                onChange={e => setIntegrations(prev => ({ ...prev, agoda: { ...prev.agoda, apiKey: e.target.value } }))}
                                disabled={!integrations.agoda.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar inventario automáticamente</span>
                            <Switch 
                                checked={integrations.agoda.syncInventory}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, agoda: { ...prev.agoda, syncInventory: val } }))}
                                disabled={!integrations.agoda.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Hostelworld */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Hostelworld</CardTitle>
                            <CardDescription>Sincronización de camas y habitaciones compartidas.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.hostelworld.enabled} 
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, hostelworld: { ...prev.hostelworld, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>API Key / Property ID</Label>
                            <Input 
                                placeholder="Ej: HW-55443" 
                                value={integrations.hostelworld.apiKey}
                                onChange={e => setIntegrations(prev => ({ ...prev, hostelworld: { ...prev.hostelworld, apiKey: e.target.value } }))}
                                disabled={!integrations.hostelworld.enabled}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar inventario automáticamente</span>
                            <Switch 
                                checked={integrations.hostelworld.syncInventory}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, hostelworld: { ...prev.hostelworld, syncInventory: val } }))}
                                disabled={!integrations.hostelworld.enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* CRM Central */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>API Key y Conexión Externa</CardTitle>
                            <CardDescription>Usa esta clave para integrar el motor con CRMs u otros servicios externos.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.crm.enabled}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border mb-4">
                            <Label className="text-xs text-muted-foreground uppercase mb-2 block">API Key de este Hotel (SOTOdelPRIOR ID)</Label>
                            <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-black px-2 py-1 rounded border flex-1 text-xs font-mono text-purple-600 dark:text-purple-400">
                                    {hotelId}
                                </code>
                                <Button size="sm" variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(hotelId);
                                    alert('ID Copiado al portapapeles');
                                }}>Copiar ID</Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                Este es el identificador único del hotel que debes usar en tu CRM para referenciar este establecimiento.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>URL del Endpoint CRM</Label>
                            <Input 
                                placeholder="https://tu-crm.com/api/webhooks" 
                                value={integrations.crm.url}
                                onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, url: e.target.value } }))}
                                disabled={!integrations.crm.enabled}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Token de Autorización (Opcional)</Label>
                            <Input 
                                type="password"
                                placeholder="Bearer token o API Key" 
                                value={(integrations.crm as any).token || ''}
                                onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, token: e.target.value } }))}
                                disabled={!integrations.crm.enabled}
                            />
                            <p className="text-[10px] text-muted-foreground italic">Se enviará en la cabecera Authorization.</p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Sincronizar reservas automáticamente</span>
                            <Switch 
                                checked={integrations.crm.syncBookings}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, syncBookings: val } }))}
                                disabled={!integrations.crm.enabled}
                            />
                        </div>

                        <div className="pt-2">
                            <Button 
                                variant="outline" 
                                className="w-full gap-2 border-dashed" 
                                onClick={handleTestConnection}
                                disabled={!integrations.crm.enabled}
                            >
                                Probar Conexión
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stripe Connection */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Conexión Stripe</CardTitle>
                            <CardDescription>Pasarela de pago y garantía por tarjetas.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.stripe?.enabled || false}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, stripe: { ...(prev.stripe || {}), enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Clave Pública (Publishable Key)</Label>
                            <Input 
                                placeholder="pk_live_..." 
                                value={integrations.stripe?.publicKey || ''}
                                onChange={e => setIntegrations(prev => ({ ...prev, stripe: { ...prev.stripe, publicKey: e.target.value } }))}
                                disabled={!integrations.stripe?.enabled}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Clave Secreta (Secret Key)</Label>
                            <Input 
                                type="password"
                                placeholder="sk_live_..." 
                                value={integrations.stripe?.secretKey || ''}
                                onChange={e => setIntegrations(prev => ({ ...prev, stripe: { ...prev.stripe, secretKey: e.target.value } }))}
                                disabled={!integrations.stripe?.enabled}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Una vez configurada la cuenta bancaria de este hotel, puedes ir a la pestaña "Ajustes" para definir la penalización por No-Show.
                        </p>
                    </CardContent>
                </Card>

                {/* Web Widget Script */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Widget de Reservas Web (Hotel)</CardTitle>
                            <CardDescription>Copia este script para embeber el motor de habitaciones en tu web.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Script de Integración HTML</Label>
                            <div className="relative">
                                <textarea
                                    className="w-full h-32 p-3 bg-zinc-950 text-green-400 font-mono text-sm rounded-md outline-none resize-none"
                                    readOnly
                                    value={`<script src="https://reservas.sotodelprior.com/hotel-widget.js"></script>\n<div id="soto-hotel-booking-widget" data-hotel="${hotelId}"></div>`}
                                />
                                <Button 
                                    className="absolute top-2 right-2 h-8 px-3 text-xs" 
                                    variant="secondary"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`<script src="https://reservas.sotodelprior.com/hotel-widget.js"></script>\n<div id="soto-hotel-booking-widget" data-hotel="${hotelId}"></div>`);
                                        alert('Script copiado al portapapeles');
                                    }}
                                >
                                    Copiar
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Pega este código en el HTML de la página web donde quieras que aparezca el buscador de disponibilidad de habitaciones de este hotel.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CONFIGURACIÓN VISUAL DEL WIDGET */}
            <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Personalización del Motor Web</h2>
                        <p className="text-sm text-muted-foreground italic">Configura el diseño del motor que verán tus clientes.</p>
                    </div>
                </div>
                <WidgetConfigSection entityId={hotelId} type="hotel" />
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
