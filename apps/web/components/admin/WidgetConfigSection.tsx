'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { fetchAPI } from '@/lib/api';
import { Sparkles, Copy, Check, ExternalLink, CreditCard, Users, Calendar } from 'lucide-react';

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
        noShowFeeEvents: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadConfig();
    }, [entityId]);

    async function loadConfig() {
        try {
            const data = await fetchAPI(`/config/${entityId}`);
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
                    noShowFeeEvents: data.noShowFeeEvents || false
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
            await fetchAPI(`/config/${entityId}`, {
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

    if (loading) return <div className="py-4 text-sm text-muted-foreground italic">Cargando configuración...</div>;

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Visual Config */}
                <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/5 dark:bg-blue-950/10">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Diseño del Widget</CardTitle>
                                <CardDescription>Personaliza la apariencia visual.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Color de Acento</Label>
                            <div className="flex gap-2">
                                <div 
                                    className="w-10 h-10 rounded-md border shadow-sm" 
                                    style={{ backgroundColor: config.primaryColor }}
                                />
                                <Input 
                                    type="text" 
                                    value={config.primaryColor} 
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="font-mono uppercase"
                                />
                                <input 
                                    type="color" 
                                    value={config.primaryColor} 
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                    className="w-12 h-10 p-0 border-0 cursor-pointer bg-transparent"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>CSS Personalizado</Label>
                            <Textarea
                                className="font-mono text-xs h-24"
                                value={config.customCss}
                                onChange={e => setConfig({ ...config, customCss: e.target.value })}
                                placeholder=".widget-container { ... }"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* No-Show Fee Strategy */}
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
                                <Label className="text-base">Activar Stripe</Label>
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
                                            <label htmlFor="all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                                            <label htmlFor="groups" className="text-sm font-medium leading-none flex items-center gap-2">
                                                Reservas de Grupos
                                            </label>
                                            {config.noShowFeeGroups && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs">Mínimo de pax:</span>
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
                                            <label htmlFor="events" className="text-sm font-medium leading-none">
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
                    <CardTitle className="text-sm">Código de Integración</CardTitle>
                    <CardDescription className="text-xs">Usa este enlace para insertar el motor en tu sitio web.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <code className="bg-muted p-2 rounded text-[11px] flex-1 block overflow-x-auto whitespace-nowrap border">
                                {widgetUrl}
                            </code>
                            <Button variant="outline" size="icon" onClick={copyToClipboard} className="h-9 w-9 shrink-0">
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                        <a 
                            href={widgetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 w-fit"
                        >
                            <ExternalLink className="w-3 h-3" /> Previsualizar Widget
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
