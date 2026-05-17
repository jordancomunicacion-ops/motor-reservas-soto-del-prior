"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Share2, Utensils, Database, ArrowLeft, Save, Globe, Sparkles, CreditCard, Key, Users, Calendar, Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

import type { WidgetConfigResponse } from '@/types/widget-config';

interface RestaurantIntegrations {
    crm: { enabled: boolean; url: string; token: string; syncBookings: boolean };
    stripe: { enabled: boolean; publicKey: string; secretKey: string };
}

interface RestaurantWithIntegrations {
    id: string;
    name: string;
    integrations?: Partial<RestaurantIntegrations> | null;
}

function RestaurantConnectionsContent() {
    const params = useParams();
    const restaurantId = params.id as string;
    const [restaurant, setRestaurant] = useState<RestaurantWithIntegrations | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [integrations, setIntegrations] = useState<RestaurantIntegrations>({
        crm: { enabled: false, url: 'https://crm.sotodelprior.com/api/integrations/restaurant', token: '', syncBookings: true },
        stripe: { enabled: false, publicKey: '', secretKey: '' }
    });

    const [config, setConfig] = useState({
        primaryColor: '#C59D5F',
        customCss: '',
        showLogo: true,
        stripeEnabled: false,
        noShowFeeAmount: 0,
        noShowFeeAll: false,
        noShowFeeGroups: false,
        noShowGroupMinPax: 8,
        noShowFeeEvents: false,
        showCrmFields: true,
        skipGuaranteeStep: false
    });

    useEffect(() => {
        loadRestaurant();
        loadConfig();
    }, [restaurantId]);

    async function loadRestaurant() {
        try {
            const data = await fetchAPI<RestaurantWithIntegrations>(`/restaurant/${restaurantId}`);
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

    async function loadConfig() {
        try {
            const data = await fetchAPI<WidgetConfigResponse>(`/config/${restaurantId}`);
            if (data) {
                setConfig({
                    primaryColor: data.primaryColor || '#C59D5F',
                    customCss: data.customCss || '',
                    showLogo: data.showLogo !== undefined ? data.showLogo : true,
                    stripeEnabled: data.stripeEnabled || false,
                    noShowFeeAmount: data.noShowFeeAmount || 0,
                    noShowFeeAll: data.noShowFeeAll || false,
                    noShowFeeGroups: data.noShowFeeGroups || false,
                    noShowGroupMinPax: data.noShowGroupMinPax || 8,
                    noShowFeeEvents: data.noShowFeeEvents || false,
                    showCrmFields: data.showCrmFields !== undefined ? data.showCrmFields : true,
                    skipGuaranteeStep: data.skipGuaranteeStep || false
                });
            }
        } catch (e) {
            console.error('Error loading widget config:', e);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            // Save Integrations
            await fetchAPI(`/restaurant/${restaurantId}`, {
                method: 'PATCH',
                body: JSON.stringify({ integrations })
            });

            // Save Config
            await fetchAPI(`/config/${restaurantId}`, {
                method: 'POST',
                body: JSON.stringify(config)
            });

            alert('Configuración y conexiones guardadas correctamente');
        } catch (e) {
            alert('Error al guardar los cambios');
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
                {/* FILA 1: IZQUIERDA - Conexión Stripe */}
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
                            Configura aquí tus claves de producción de Stripe para habilitar cobros y garantías.
                        </p>
                    </CardContent>
                </Card>

                {/* FILA 1: DERECHA - Estrategia de no show */}
                <Card className="border-amber-100 dark:border-amber-900/30 bg-amber-50/5 dark:bg-amber-950/10">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Estrategia de No-Show</CardTitle>
                                <CardDescription>Configura cuándo pedir tarjeta de crédito.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border">
                            <div className="space-y-0.5">
                                <Label className="text-base">Activar Garantía (Stripe)</Label>
                                <p className="text-xs text-muted-foreground">Requiere tarjeta como garantía según reglas.</p>
                            </div>
                            <Checkbox 
                                checked={config.stripeEnabled} 
                                onCheckedChange={(checked) => setConfig({ ...config, stripeEnabled: checked === true })}
                            />
                        </div>

                        {config.stripeEnabled && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label>Importe Penalización (€ por persona)</Label>
                                    <Input 
                                        type="number" 
                                        value={config.noShowFeeAmount} 
                                        onChange={e => setConfig({ ...config, noShowFeeAmount: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Aplicar a:</Label>
                                    
                                    <div className="flex items-start gap-3">
                                        <Checkbox 
                                            id="all" 
                                            checked={config.noShowFeeAll} 
                                            onCheckedChange={(checked) => setConfig({ ...config, noShowFeeAll: checked === true })}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="all" className="text-sm font-medium leading-none">
                                                Todas las reservas
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox 
                                            id="groups" 
                                            checked={config.noShowFeeGroups} 
                                            onCheckedChange={(checked) => setConfig({ ...config, noShowFeeGroups: checked === true })}
                                        />
                                        <div className="grid gap-1.5 leading-none w-full">
                                            <label htmlFor="groups" className="text-sm font-medium leading-none flex items-center gap-2">
                                                Reservas de Grupos
                                            </label>
                                            {config.noShowFeeGroups && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs">Mín:</span>
                                                    <Input 
                                                        type="number" 
                                                        className="w-16 h-7 text-xs" 
                                                        value={config.noShowGroupMinPax} 
                                                        onChange={e => setConfig({ ...config, noShowGroupMinPax: Number(e.target.value) })}
                                                    />
                                                    <span className="text-xs">pax</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* FILA 2: IZQUIERDA - Widget de Reservas Web */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>Widget de Reservas Web</CardTitle>
                            <CardDescription>Código para integrar en tu sitio web.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="inline" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="inline">Insertado</TabsTrigger>
                                <TabsTrigger value="popup">Pop-up</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="inline" className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <textarea
                                            className="w-full h-24 p-2 bg-zinc-950 text-green-400 font-mono text-[10px] rounded-md outline-none resize-none"
                                            readOnly
                                            value={`<script src="https://reservas.sotodelprior.com/widget.js"></script>\n<div id="soto-booking-widget" data-restaurant="${restaurantId}" data-mode="inline"></div>`}
                                        />
                                        <Button 
                                            className="absolute top-1 right-1 h-6 px-2 text-[10px]" 
                                            variant="secondary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`<script src="https://reservas.sotodelprior.com/widget.js"></script>\n<div id="soto-booking-widget" data-restaurant="${restaurantId}" data-mode="inline"></div>`);
                                                alert('Script copiado');
                                            }}
                                        >
                                            Copiar
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="popup" className="space-y-4">
                                <div className="space-y-2">
                                    <div className="relative">
                                        <textarea
                                            className="w-full h-24 p-2 bg-zinc-950 text-green-400 font-mono text-[10px] rounded-md outline-none resize-none"
                                            readOnly
                                            value={`<script src="https://reservas.sotodelprior.com/widget.js"></script>\n<div id="soto-booking-widget" data-restaurant="${restaurantId}" data-mode="popup"></div>\n<a href="#" class="soto-widget-trigger">Reservar</a>`}
                                        />
                                        <Button 
                                            className="absolute top-1 right-1 h-6 px-2 text-[10px]" 
                                            variant="secondary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`<script src="https://reservas.sotodelprior.com/widget.js"></script>\n<div id="soto-booking-widget" data-restaurant="${restaurantId}" data-mode="popup"></div>\n<a href="#" class="soto-widget-trigger">Reservar</a>`);
                                                alert('Script copiado');
                                            }}
                                        >
                                            Copiar
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* FILA 2: DERECHA - Personalización del Motor Web */}
                <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/5 dark:bg-blue-950/10">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Personalización del Motor Web</CardTitle>
                                <CardDescription>Diseño y colores del widget.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Color de Acento</Label>
                            <div className="flex gap-2">
                                <div 
                                    className="w-8 h-8 rounded-md border shadow-sm" 
                                    style={{ backgroundColor: config.primaryColor }}
                                />
                                <Input 
                                    type="text" 
                                    value={config.primaryColor} 
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="font-mono uppercase h-8 text-xs"
                                />
                                <input 
                                    type="color" 
                                    value={config.primaryColor} 
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="w-10 h-8 p-0 border-0 cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs">CSS Personalizado</Label>
                            <Textarea
                                className="font-mono text-[10px] h-20"
                                value={config.customCss}
                                onChange={e => setConfig({ ...config, customCss: e.target.value })}
                                placeholder=".widget-container { ... }"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* FILA INTERMEDIA: Código de Integración (Ocupa 2 columnas) */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Código de Integración</CardTitle>
                        <CardDescription>Usa este enlace para insertar el motor en tu sitio web.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg">
                            <code className="flex-1 text-sm font-mono break-all text-slate-600">
                                https://motor.sotodelprior.com/widget/restaurant?id={restaurantId}
                            </code>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="shrink-0 h-9 w-9"
                                onClick={() => {
                                    navigator.clipboard.writeText(`https://motor.sotodelprior.com/widget/restaurant?id=${restaurantId}`);
                                    alert('Enlace copiado');
                                }}
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <Link 
                            href={`https://motor.sotodelprior.com/widget/restaurant?id=${restaurantId}`} 
                            target="_blank"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline font-medium"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Previsualizar Widget
                        </Link>
                    </CardContent>
                </Card>

                {/* FILA 3: IZQUIERDA - API Key y Conexión Externa */}

                <Card>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                            <Database className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <CardTitle>API Key y Conexión Externa</CardTitle>
                            <CardDescription>Integración con CRMs externos.</CardDescription>
                        </div>
                        <Switch 
                            checked={integrations.crm.enabled}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                            <Label className="text-[10px] text-muted-foreground uppercase mb-1 block">Restaurant ID (API Key)</Label>
                            <div className="flex items-center gap-2">
                                <code className="bg-white dark:bg-black px-2 py-1 rounded border flex-1 text-[10px] font-mono text-purple-600">
                                    {restaurantId}
                                </code>
                                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                                    navigator.clipboard.writeText(restaurantId);
                                    alert('ID Copiado');
                                }}>Copiar</Button>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Sincronización Automática</span>
                            <Switch 
                                checked={integrations.crm.syncBookings}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, syncBookings: val } }))}
                                disabled={!integrations.crm.enabled}
                            />
                        </div>

                        <details className="group">
                            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-purple-600 transition-colors uppercase font-bold list-none flex items-center gap-1">
                                <span className="group-open:rotate-90 transition-transform">▶</span> Webhook Avanzado
                            </summary>
                            <div className="space-y-3 mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-dashed">
                                <Input 
                                    placeholder="URL Endpoint" 
                                    value={integrations.crm.url}
                                    onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, url: e.target.value } }))}
                                    className="h-7 text-[10px] font-mono"
                                />
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="w-full h-7 text-[10px] border-dashed" 
                                    onClick={handleTestConnection}
                                >
                                    Probar Conexión
                                </Button>
                            </div>
                        </details>
                    </CardContent>
                </Card>

                {/* FILA 3: DERECHA - Opciones Avanzadas del Flujo */}
                <Card className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/5 dark:bg-indigo-950/10">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Opciones del Paso 3</CardTitle>
                                <CardDescription>CRM y flujo de reserva.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border">
                            <div className="space-y-0.5">
                                <Label className="text-xs">Preguntas CRM</Label>
                                <p className="text-[10px] text-muted-foreground">Edad, redes sociales, etc.</p>
                            </div>
                            <Checkbox 
                                checked={config.showCrmFields} 
                                onCheckedChange={(checked) => setConfig({ ...config, showCrmFields: checked === true })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded-lg border">
                            <div className="space-y-0.5">
                                <Label className="text-xs">Saltar Garantía</Label>
                                <p className="text-[10px] text-muted-foreground">Si no hay pago, ir a confirmar.</p>
                            </div>
                            <Checkbox 
                                checked={config.skipGuaranteeStep} 
                                onCheckedChange={(checked) => setConfig({ ...config, skipGuaranteeStep: checked === true })}
                            />
                        </div>
                    </CardContent>
                </Card>
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
