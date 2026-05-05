'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchAPI } from '@/lib/api';
import { Sparkles, Copy, Check, ExternalLink } from 'lucide-react';

interface WidgetConfigSectionProps {
    entityId: string;
    type: 'hotel' | 'restaurant';
}

export function WidgetConfigSection({ entityId, type }: WidgetConfigSectionProps) {
    const [config, setConfig] = useState({
        primaryColor: '#3b82f6',
        customCss: '',
        showLogo: true
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
                    primaryColor: data.primaryColor || '#3b82f6',
                    customCss: data.customCss || '',
                    showLogo: data.showLogo !== undefined ? data.showLogo : true
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
            alert('Configuración del widget guardada');
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

    if (loading) return <div className="py-4 text-sm text-muted-foreground italic">Cargando configuración del widget...</div>;

    return (
        <div className="space-y-6">
            <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/5 dark:bg-blue-950/10">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle>Personalización del Widget</CardTitle>
                            <CardDescription>Ajusta el diseño del motor de reservas para tu web.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Color Principal</Label>
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
                                placeholder="#3B82F6"
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
                            className="font-mono text-xs h-32"
                            value={config.customCss}
                            onChange={e => setConfig({ ...config, customCss: e.target.value })}
                            placeholder=".widget-container { background: transparent; }"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Añade estilos CSS adicionales para integrar mejor el widget en tu sitio web.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4">
                    <Button onClick={saveConfig} disabled={saving} size="sm">
                        {saving ? 'Guardando...' : 'Guardar Diseño'}
                    </Button>
                </CardFooter>
            </Card>

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

                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-400 text-[11px] rounded border border-yellow-100 dark:border-yellow-900/30">
                        <strong>Tip:</strong> Puedes insertar este enlace usando un <code>&lt;iframe&gt;</code> en cualquier parte de tu web principal.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
