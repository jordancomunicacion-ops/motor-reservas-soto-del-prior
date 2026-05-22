'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Sparkles, Copy, Check, ExternalLink, CreditCard, Users, Loader2 } from 'lucide-react';

interface WidgetConfigSectionProps {
    entityId: string;
    type: 'hotel' | 'restaurant';
}

export function WidgetConfigSection({ entityId, type }: WidgetConfigSectionProps) {
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadConfig();
    }, [entityId]);

    async function loadConfig() {
        try {
            const data = await fetchAPIAdmin(`/config/${entityId}`);
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
        } finally {
            setLoading(false);
        }
    }

    async function saveConfig() {
        setSaving(true);
        try {
            await fetchAPIAdmin(`/config/${entityId}`, {
                method: 'POST',
                body: JSON.stringify(config)
            });
            alert('Configuración guardada correctamente');
        } catch (e) {
            console.error('Error saving widget config:', e);
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    }

    const widgetUrl = type === 'hotel'
        ? `https://motor.sotodelprior.com/widget?hotelId=${entityId}`
        : `https://motor.sotodelprior.com/widget/restaurant?id=${entityId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(widgetUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Cargando configuración...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Visual Config */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                                <Sparkles className="size-4" />
                            </span>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Diseño del Widget</CardTitle>
                                <CardDescription>Personaliza la apariencia visual.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
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
                                    className="w-12 h-10 p-0 border-0 cursor-pointer bg-transparent"
                                    aria-label="Selector de color"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-eyebrow">CSS Personalizado</Label>
                            <Textarea
                                className="font-mono text-xs resize-none"
                                rows={5}
                                value={config.customCss}
                                onChange={e => setConfig({ ...config, customCss: e.target.value })}
                                placeholder=".widget-container { ... }"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Paso 3 Options */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                                <Users className="size-4" />
                            </span>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Opciones del Paso 3</CardTitle>
                                <CardDescription>Configura la pantalla de garantía y CRM.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Mostrar Preguntas Opcionales</Label>
                                <p className="text-xs text-muted-foreground">Edad, sexo, redes sociales, etc.</p>
                            </div>
                            <Checkbox
                                checked={config.showCrmFields}
                                onCheckedChange={(checked) => setConfig({ ...config, showCrmFields: checked === true })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Saltar Paso si no hay Pago</Label>
                                <p className="text-xs text-muted-foreground">Si no se requiere tarjeta, va directo a confirmar.</p>
                            </div>
                            <Checkbox
                                checked={config.skipGuaranteeStep}
                                onCheckedChange={(checked) => setConfig({ ...config, skipGuaranteeStep: checked === true })}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* No-Show Fee Strategy */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center size-9 rounded-md bg-warning/15 text-warning-foreground">
                                <CreditCard className="size-4" />
                            </span>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Estrategia de No-Show</CardTitle>
                                <CardDescription>Configura cuándo pedir tarjeta de crédito.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border">
                            <div className="space-y-0.5">
                                <Label className="text-sm">Activar Stripe</Label>
                                <p className="text-xs text-muted-foreground">Requiere tarjeta como garantía.</p>
                            </div>
                            <Checkbox
                                checked={config.stripeEnabled}
                                onCheckedChange={(checked) => setConfig({ ...config, stripeEnabled: checked === true })}
                            />
                        </div>

                        {config.stripeEnabled && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
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
                                            <label htmlFor="all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                                Todas las reservas
                                            </label>
                                            <p className="text-xs text-muted-foreground">Cualquier persona que reserve deberá poner tarjeta.</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="groups"
                                            checked={config.noShowFeeGroups}
                                            onCheckedChange={(checked) => setConfig({ ...config, noShowFeeGroups: checked === true })}
                                        />
                                        <div className="grid gap-1.5 leading-none w-full">
                                            <label htmlFor="groups" className="text-sm font-medium leading-none flex items-center gap-2 cursor-pointer">
                                                Reservas de Grupos
                                            </label>
                                            {config.noShowFeeGroups && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs text-muted-foreground">Mínimo de pax:</span>
                                                    <Input
                                                        type="number"
                                                        className="w-20 h-8 text-xs"
                                                        value={config.noShowGroupMinPax}
                                                        onChange={e => setConfig({ ...config, noShowGroupMinPax: Number(e.target.value) })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Checkbox
                                            id="events"
                                            checked={config.noShowFeeEvents}
                                            onCheckedChange={(checked) => setConfig({ ...config, noShowFeeEvents: checked === true })}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label htmlFor="events" className="text-sm font-medium leading-none cursor-pointer">
                                                Eventos Especiales
                                            </label>
                                            <p className="text-xs text-muted-foreground">Reservas vinculadas a eventos creados en el panel.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                <CardFooter className="flex justify-between items-center p-0">
                    <div className="text-xs text-muted-foreground">
                        Última sincronización: {new Date().toLocaleDateString()}
                    </div>
                    <Button onClick={saveConfig} disabled={saving} className="gap-2 px-8">
                        {saving ? 'Guardando...' : 'Guardar Toda la Configuración'}
                    </Button>
                </CardFooter>
            </Card>

            {/* Integration Link */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-display text-base font-medium tracking-tight">Código de Integración</CardTitle>
                    <CardDescription>Usa este enlace para insertar el motor en tu sitio web.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <code className="bg-muted p-2 rounded-md text-[11px] flex-1 block overflow-x-auto whitespace-nowrap border border-border">
                                {widgetUrl}
                            </code>
                            <Button variant="outline" size="icon" onClick={copyToClipboard} aria-label="Copiar URL">
                                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
                            </Button>
                        </div>
                        <a
                            href={widgetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline flex items-center gap-1 w-fit"
                        >
                            <ExternalLink className="size-3" /> Previsualizar Widget
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
