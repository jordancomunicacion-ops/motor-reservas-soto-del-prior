"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { Share2, Globe, Database, ArrowLeft, Save, Sparkles, CreditCard, Users, Copy, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { WidgetConfigResponse } from '@/types/widget-config';

interface OtaConfig { enabled: boolean; apiKey: string; syncInventory: boolean }
interface AirbnbConfig { enabled: boolean; icalUrl: string; syncInventory: boolean }
interface CrmConfig { enabled: boolean; url: string; token: string; syncBookings: boolean }
interface StripeConfig { enabled: boolean; publicKey: string; secretKey: string }

interface HotelIntegrations {
    booking: OtaConfig;
    airbnb: AirbnbConfig;
    expedia: OtaConfig;
    agoda: OtaConfig;
    hostelworld: OtaConfig;
    crm: CrmConfig;
    stripe: StripeConfig;
}

interface HotelWithIntegrations {
    id: string;
    name: string;
    integrations?: Partial<HotelIntegrations> | null;
}

function HotelConnectionsContent() {
    const params = useParams();
    const hotelId = params.id as string;
    const [hotel, setHotel] = useState<HotelWithIntegrations | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [integrations, setIntegrations] = useState<HotelIntegrations>({
        booking: { enabled: false, apiKey: '', syncInventory: true },
        airbnb: { enabled: false, icalUrl: '', syncInventory: true },
        expedia: { enabled: false, apiKey: '', syncInventory: true },
        agoda: { enabled: false, apiKey: '', syncInventory: true },
        hostelworld: { enabled: false, apiKey: '', syncInventory: true },
        crm: { enabled: false, url: 'https://crm.sotodelprior.com/api/integrations/hotel', token: '', syncBookings: true },
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
        loadHotel();
        loadConfig();
    }, [hotelId]);

    async function loadHotel() {
        try {
            const data = await fetchAPI<HotelWithIntegrations>(`/property/hotels/${hotelId}`);
            setHotel(data);
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
            const data = await fetchAPI<WidgetConfigResponse>(`/config/${hotelId}`);
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
            await fetchAPI(`/property/hotels/${hotelId}`, {
                method: 'PATCH',
                body: JSON.stringify({ integrations })
            });

            await fetchAPI(`/config/${hotelId}`, {
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

    if (loading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <PageHeader
                eyebrow="Hotel"
                title={`Conexiones · ${hotel?.name ?? ''}`}
                description="Gestiona las integraciones externas para este hotel."
                actions={
                    <>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/admin/hotels"><ArrowLeft className="size-4" /></Link>
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="size-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FILA 1: IZQUIERDA - Conexión Stripe */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3">
                        <div className="grid place-items-center size-9 rounded-md bg-success/10 text-success">
                            <CreditCard className="size-4" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="font-display text-base font-medium tracking-tight">Conexión Stripe</CardTitle>
                            <CardDescription>Pasarela de pago y garantía por tarjetas.</CardDescription>
                        </div>
                        <Switch
                            checked={integrations.stripe?.enabled || false}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, stripe: { ...(prev.stripe || {}), enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-eyebrow">Clave Pública (Publishable Key)</Label>
                            <Input
                                className="h-10"
                                placeholder="pk_live_..."
                                value={integrations.stripe?.publicKey || ''}
                                onChange={e => setIntegrations(prev => ({ ...prev, stripe: { ...prev.stripe, publicKey: e.target.value } }))}
                                disabled={!integrations.stripe?.enabled}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-eyebrow">Clave Secreta (Secret Key)</Label>
                            <Input
                                type="password"
                                className="h-10"
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
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="grid place-items-center size-9 rounded-md bg-warning/15 text-warning-foreground">
                                <CreditCard className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Estrategia de No-Show</CardTitle>
                                <CardDescription>Configura cuándo pedir tarjeta de crédito.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
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
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Importe Penalización (€ por persona)</Label>
                                    <Input
                                        type="number"
                                        className="h-10"
                                        value={config.noShowFeeAmount}
                                        onChange={e => setConfig({ ...config, noShowFeeAmount: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Label className="text-eyebrow">Aplicar a:</Label>

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
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* FILA 2: IZQUIERDA - Widget de Reservas Web */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3">
                        <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                            <Globe className="size-4" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="font-display text-base font-medium tracking-tight">Widget de Reservas Web (Hotel)</CardTitle>
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
                                <div className="relative">
                                    <Textarea
                                        className="h-24 font-mono text-xs resize-none"
                                        readOnly
                                        value={`<script src="https://reservas.sotodelprior.com/hotel-widget.js"></script>\n<div id="soto-hotel-booking-widget" data-hotel="${hotelId}" data-mode="inline"></div>`}
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="absolute top-2 right-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`<script src="https://reservas.sotodelprior.com/hotel-widget.js"></script>\n<div id="soto-hotel-booking-widget" data-hotel="${hotelId}" data-mode="inline"></div>`);
                                            alert('Script copiado');
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="popup" className="space-y-4">
                                <div className="relative">
                                    <Textarea
                                        className="h-24 font-mono text-xs resize-none"
                                        readOnly
                                        value={`<script src="https://reservas.sotodelprior.com/hotel-widget.js"></script>\n<div id="soto-hotel-booking-widget" data-hotel="${hotelId}" data-mode="popup"></div>\n<a href="#" class="soto-hotel-widget-trigger">Reservar</a>`}
                                    />
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="absolute top-2 right-2"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`<script src="https://reservas.sotodelprior.com/hotel-widget.js"></script>\n<div id="soto-hotel-booking-widget" data-hotel="${hotelId}" data-mode="popup"></div>\n<a href="#" class="soto-hotel-widget-trigger">Reservar</a>`);
                                            alert('Script copiado');
                                        }}
                                    >
                                        Copiar
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* FILA 2: DERECHA - Personalización del Motor Web */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                                <Sparkles className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Personalización del Motor Web</CardTitle>
                                <CardDescription>Diseño y colores del widget.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-eyebrow">Color de Acento</Label>
                            <div className="flex gap-2">
                                <div
                                    className="size-10 rounded-md border border-border shrink-0"
                                    style={{ backgroundColor: config.primaryColor }}
                                />
                                <Input
                                    type="text"
                                    className="h-10 font-mono uppercase"
                                    value={config.primaryColor}
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                />
                                <input
                                    type="color"
                                    value={config.primaryColor}
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="h-10 w-12 p-1 rounded-md border border-border cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-eyebrow">CSS Personalizado</Label>
                            <Textarea
                                className="font-mono text-xs h-24 resize-none"
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
                        <CardTitle className="font-display text-base font-medium tracking-tight">Código de Integración</CardTitle>
                        <CardDescription>Usa este enlace para insertar el motor en tu sitio web.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-muted/40 border border-border rounded-md">
                            <code className="flex-1 text-sm font-mono break-all text-foreground">
                                https://motor.sotodelprior.com/widget?hotelId={hotelId}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                className="shrink-0"
                                onClick={() => {
                                    navigator.clipboard.writeText(`https://motor.sotodelprior.com/widget?hotelId=${hotelId}`);
                                    alert('Enlace copiado');
                                }}
                            >
                                <Copy className="size-4" />
                            </Button>
                        </div>
                        <Link
                            href={`https://motor.sotodelprior.com/widget?hotelId=${hotelId}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                        >
                            <ExternalLink className="size-4" />
                            Previsualizar Widget
                        </Link>
                    </CardContent>
                </Card>

                {/* FILA 3: IZQUIERDA - API Key y Conexión Externa */}
                <Card>
                    <CardHeader className="flex flex-row items-center gap-3">
                        <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                            <Database className="size-4" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="font-display text-base font-medium tracking-tight">API Key y Conexión Externa</CardTitle>
                            <CardDescription>Integración con CRMs externos.</CardDescription>
                        </div>
                        <Switch
                            checked={integrations.crm.enabled}
                            onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, enabled: val } }))}
                        />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/40 p-3 rounded-md border border-border">
                            <Label className="text-eyebrow mb-1.5 block">Hotel ID (API Key)</Label>
                            <div className="flex items-center gap-2">
                                <code className="bg-card px-2 py-1 rounded border border-border flex-1 text-xs font-mono text-primary">
                                    {hotelId}
                                </code>
                                <Button size="sm" variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(hotelId);
                                    alert('ID Copiado');
                                }}>Copiar</Button>
                            </div>
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
                            <summary className="text-eyebrow cursor-pointer hover:text-primary transition-colors list-none flex items-center gap-1">
                                <span className="group-open:rotate-90 transition-transform">▶</span> Webhook Avanzado
                            </summary>
                            <div className="space-y-3 mt-3 p-3 bg-muted/40 rounded-md border border-dashed border-border">
                                <Input
                                    placeholder="URL Endpoint"
                                    className="h-10 font-mono text-xs"
                                    value={integrations.crm.url}
                                    onChange={e => setIntegrations(prev => ({ ...prev, crm: { ...prev.crm, url: e.target.value } }))}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full border-dashed"
                                    onClick={handleTestConnection}
                                >
                                    Probar Conexión
                                </Button>
                            </div>
                        </details>
                    </CardContent>
                </Card>

                {/* FILA 3: DERECHA - Opciones Avanzadas del Flujo */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                                <Users className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Opciones del Paso 3</CardTitle>
                                <CardDescription>CRM y flujo de reserva.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                            <div className="space-y-0.5">
                                <Label>Preguntas CRM</Label>
                                <p className="text-xs text-muted-foreground">Edad, redes sociales, etc.</p>
                            </div>
                            <Checkbox
                                checked={config.showCrmFields}
                                onCheckedChange={(checked) => setConfig({ ...config, showCrmFields: checked === true })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                            <div className="space-y-0.5">
                                <Label>Saltar Garantía</Label>
                                <p className="text-xs text-muted-foreground">Si no hay pago, ir a confirmar.</p>
                            </div>
                            <Checkbox
                                checked={config.skipGuaranteeStep}
                                onCheckedChange={(checked) => setConfig({ ...config, skipGuaranteeStep: checked === true })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHANNEL MANAGER - OTAs */}
            <div className="pt-8 border-t border-border/60">
                <div className="flex items-center gap-3 mb-6">
                    <div className="grid place-items-center size-9 rounded-md bg-muted text-muted-foreground">
                        <Share2 className="size-4" />
                    </div>
                    <div>
                        <h2 className="font-display text-lg font-medium tracking-tight">Canales de Venta (Channel Manager)</h2>
                        <p className="text-sm text-muted-foreground">Sincroniza tu inventario con agencias externas.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Booking.com */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 py-4">
                            <div className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary font-semibold text-xs">B.</div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium">Booking.com</CardTitle>
                            </div>
                            <Switch
                                checked={integrations.booking.enabled}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, enabled: val } }))}
                            />
                        </CardHeader>
                        {integrations.booking.enabled && (
                            <CardContent className="pb-4 pt-0 space-y-3">
                                <Input
                                    placeholder="Property ID"
                                    className="h-10"
                                    value={integrations.booking.apiKey}
                                    onChange={e => setIntegrations(prev => ({ ...prev, booking: { ...prev.booking, apiKey: e.target.value } }))}
                                />
                            </CardContent>
                        )}
                    </Card>

                    {/* Airbnb */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 py-4">
                            <div className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary font-semibold text-xs">A.</div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium">Airbnb</CardTitle>
                            </div>
                            <Switch
                                checked={integrations.airbnb.enabled}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, airbnb: { ...prev.airbnb, enabled: val } }))}
                            />
                        </CardHeader>
                        {integrations.airbnb.enabled && (
                            <CardContent className="pb-4 pt-0 space-y-3">
                                <Input
                                    placeholder="URL iCal"
                                    className="h-10"
                                    value={integrations.airbnb.icalUrl}
                                    onChange={e => setIntegrations(prev => ({ ...prev, airbnb: { ...prev.airbnb, icalUrl: e.target.value } }))}
                                />
                            </CardContent>
                        )}
                    </Card>

                    {/* Expedia */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 py-4">
                            <div className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary font-semibold text-xs">E.</div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium">Expedia</CardTitle>
                            </div>
                            <Switch
                                checked={integrations.expedia.enabled}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, expedia: { ...prev.expedia, enabled: val } }))}
                            />
                        </CardHeader>
                        {integrations.expedia.enabled && (
                            <CardContent className="pb-4 pt-0 space-y-3">
                                <Input
                                    placeholder="Property ID"
                                    className="h-10"
                                    value={integrations.expedia.apiKey}
                                    onChange={e => setIntegrations(prev => ({ ...prev, expedia: { ...prev.expedia, apiKey: e.target.value } }))}
                                />
                            </CardContent>
                        )}
                    </Card>

                    {/* Agoda */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 py-4">
                            <div className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary font-semibold text-xs">Ag</div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium">Agoda</CardTitle>
                            </div>
                            <Switch
                                checked={integrations.agoda.enabled}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, agoda: { ...prev.agoda, enabled: val } }))}
                            />
                        </CardHeader>
                        {integrations.agoda.enabled && (
                            <CardContent className="pb-4 pt-0 space-y-3">
                                <Input
                                    placeholder="Hotel ID"
                                    className="h-10"
                                    value={integrations.agoda.apiKey}
                                    onChange={e => setIntegrations(prev => ({ ...prev, agoda: { ...prev.agoda, apiKey: e.target.value } }))}
                                />
                            </CardContent>
                        )}
                    </Card>

                    {/* Hostelworld */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 py-4">
                            <div className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary font-semibold text-xs">Hw</div>
                            <div className="flex-1">
                                <CardTitle className="text-sm font-medium">Hostelworld</CardTitle>
                            </div>
                            <Switch
                                checked={integrations.hostelworld.enabled}
                                onCheckedChange={(val) => setIntegrations(prev => ({ ...prev, hostelworld: { ...prev.hostelworld, enabled: val } }))}
                            />
                        </CardHeader>
                        {integrations.hostelworld.enabled && (
                            <CardContent className="pb-4 pt-0 space-y-3">
                                <Input
                                    placeholder="Property ID"
                                    className="h-10"
                                    value={integrations.hostelworld.apiKey}
                                    onChange={e => setIntegrations(prev => ({ ...prev, hostelworld: { ...prev.hostelworld, apiKey: e.target.value } }))}
                                />
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function HotelConnectionsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando...</div>}>
            <HotelConnectionsContent />
        </Suspense>
    );
}
