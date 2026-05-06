"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Utensils, Database, ArrowLeft, Save, Globe, Sparkles, CreditCard, Key } from 'lucide-react';
import Link from 'next/link';
import { WidgetConfigSection } from '@/components/admin/WidgetConfigSection';

function RestaurantConnectionsContent() {
    const params = useParams();
    const restaurantId = params.id as string;
    const [restaurant, setRestaurant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [integrations, setIntegrations] = useState({
        crm: { enabled: false, url: 'https://crm.sotodelprior.com/api/integrations/restaurant', token: '', syncBookings: true },
        stripe: { enabled: false, publicKey: '', secretKey: '' }
    });

    useEffect(() => {
        loadRestaurant();
    }, [restaurantId]);

    async function loadRestaurant() {
        try {
            const data = await fetchAPI(`/restaurant/${restaurantId}`);
            setRestaurant(data);
            if (data.integrations) {
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
            // Need to implement PATCH /restaurant/:id in backend
            await fetchAPI(`/restaurant/${restaurantId}`, {
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
                <Link href="/admin/restaurant" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Conexiones: {restaurant?.name}</h1>
                    <p className="text-muted-foreground">Gestiona las integraciones externas para este restaurante.</p>
                </div>
                <Button className="ml-auto gap-2" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CRM Central */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>API Key y Conexión Externa</CardTitle>
                            <CardDescription>Clave única para integrar el motor con CRMs u otros sistemas externos.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.crm.enabled}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border mb-4">
                            <Label className="text-xs text-muted-foreground uppercase mb-2 block">API Key de este Restaurante (SOTOdelPRIOR ID)</Label>
                            <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-black px-2 py-1 rounded border flex-1 text-xs font-mono text-purple-600 dark:text-purple-400">
                                    {restaurantId}
                                </code>
                                <Button size="sm" variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(restaurantId);
                                    alert('ID Copiado al portapapeles');
                                }}>Copiar ID</Button>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                Este es el identificador único del restaurante que debes usar en tu CRM para referenciar este establecimiento.
                            </p>
                        </div>
                        <div className="space-y-4 pt-2">
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${integrations.crm.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                    <span className="text-xs font-bold uppercase tracking-wider">
                                        {integrations.crm.enabled ? 'Sincronización Activa' : 'Sincronización Desactivada'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    {integrations.crm.enabled 
                                        ? 'Tus reservas y perfiles de clientes se están enviando automáticamente al CRM central de SOTOdelPRIOR.' 
                                        : 'Activa esta opción para unificar la base de datos de clientes y ver métricas avanzadas en el CRM.'}
                                </p>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground font-medium">Sincronización Automática</span>
                                <Switch 
                                    checked={integrations.crm.syncBookings}
                                    onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, syncBookings: val } }))}
                                    disabled={!integrations.crm.enabled}
                                />
                            </div>

                            <details className="group">
                                <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-purple-600 transition-colors uppercase font-bold list-none flex items-center gap-1">
                                    <span className="group-open:rotate-90 transition-transform">▶</span> Ajustes Avanzados de Endpoint
                                </summary>
                                <div className="space-y-3 mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border border-dashed">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px]">URL del CRM (Webhook)</Label>
                                        <Input 
                                            placeholder="https://crm.sotodelprior.com/api/integrations/restaurant" 
                                            value={integrations.crm.url}
                                            onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, url: e.target.value } }))}
                                            className="h-8 text-xs font-mono"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px]">Token de Validación</Label>
                                        <Input 
                                            type="password"
                                            placeholder="Token de seguridad" 
                                            value={(integrations.crm as any).token || ''}
                                            onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, token: e.target.value } }))}
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="w-full h-8 text-[11px] gap-2 border-dashed" 
                                        onClick={handleTestConnection}
                                    >
                                        Probar Conexión Manual
                                    </Button>
                                </div>
                            </details>
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
                            Una vez configurada la cuenta bancaria de este restaurante, puedes ir a la pestaña "Ajustes" para definir la penalización por No-Show.
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
                            <CardTitle>Widget de Reservas Web</CardTitle>
                            <CardDescription>Copia este script para embeber el motor en tu página web.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Script de Integración HTML</Label>
                            <div className="relative">
                                <textarea
                                    className="w-full h-32 p-3 bg-zinc-950 text-green-400 font-mono text-sm rounded-md outline-none resize-none"
                                    readOnly
                                    value={`<script src="https://reservas.sotodelprior.com/widget.js"></script>\n<div id="soto-booking-widget" data-restaurant="${restaurantId}"></div>`}
                                />
                                <Button 
                                    className="absolute top-2 right-2 h-8 px-3 text-xs" 
                                    variant="secondary"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`<script src="https://reservas.sotodelprior.com/widget.js"></script>\n<div id="soto-booking-widget" data-restaurant="${restaurantId}"></div>`);
                                        alert('Script copiado al portapapeles');
                                    }}
                                >
                                    Copiar
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Pega este código en el HTML de tu página web.
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
                <WidgetConfigSection entityId={restaurantId} type="restaurant" />
            </div>
        </div>
    );
}

export default function RestaurantConnectionsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <RestaurantConnectionsContent />
        </Suspense>
    );
}
