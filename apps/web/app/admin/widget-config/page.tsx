"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Check, Copy, Info } from 'lucide-react';

const HOTEL_ID = "DEMO-HOTEL-ID";

export default function WidgetConfigPage() {
    const [config, setConfig] = useState({
        primaryColor: '#C59D5F',
        customCss: '',
        showLogo: true,
    });
    const [saving, setSaving] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    async function saveConfig() {
        setSaving(true);
        try {
            await fetchAPIAdmin(`/config/${HOTEL_ID}`, {
                method: 'POST',
                body: JSON.stringify(config),
            });
        } finally {
            setSaving(false);
        }
    }

    const copy = async (key: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 1500);
        } catch { /* ignore */ }
    };

    const hotelUrl = `https://motor.sotodelprior.com/widget?hotelId=${HOTEL_ID}`;
    const restaurantUrl = `https://motor.sotodelprior.com/widget/restaurant?id=${HOTEL_ID}`;

    return (
        <div className="space-y-8 max-w-5xl">
            <PageHeader
                eyebrow="Integraciones"
                title="Configuración del widget"
                description="Personaliza la apariencia del motor de reservas y obtén los enlaces para integrarlo."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight">
                            Apariencia
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="primary-color" className="text-eyebrow">Color principal</Label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    aria-label="Selector de color"
                                    className="w-10 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                                    value={config.primaryColor}
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                />
                                <Input
                                    id="primary-color"
                                    className="flex-1 font-mono"
                                    value={config.primaryColor}
                                    onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="custom-css" className="text-eyebrow">CSS personalizado</Label>
                            <Textarea
                                id="custom-css"
                                rows={6}
                                className="font-mono text-xs resize-none"
                                value={config.customCss}
                                onChange={e => setConfig({ ...config, customCss: e.target.value })}
                                placeholder=".widget-container { background: transparent; }"
                            />
                        </div>
                        <Button onClick={saveConfig} disabled={saving}>
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight">
                            Código de integración
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <CopyField
                            label="Widget de hotel"
                            value={hotelUrl}
                            copied={copiedKey === 'hotel'}
                            onCopy={() => copy('hotel', hotelUrl)}
                        />
                        <CopyField
                            label="Widget de restaurante"
                            value={restaurantUrl}
                            copied={copiedKey === 'restaurant'}
                            onCopy={() => copy('restaurant', restaurantUrl)}
                        />
                        <div className="flex items-start gap-2 rounded-md border border-info/20 bg-info/5 p-3 text-xs text-info-foreground/80">
                            <Info className="size-4 text-info shrink-0 mt-0.5" />
                            <span>
                                Puedes integrar estos enlaces en un{' '}
                                <code className="font-mono bg-muted px-1 py-0.5 rounded text-foreground">&lt;iframe&gt;</code>{' '}
                                en tu web principal.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function CopyField({
    label,
    value,
    copied,
    onCopy,
}: {
    label: string;
    value: string;
    copied: boolean;
    onCopy: () => void;
}) {
    return (
        <div className="space-y-1.5">
            <p className="text-eyebrow">{label}</p>
            <div className="flex gap-2">
                <code className="flex-1 min-w-0 bg-muted/60 border border-border px-3 h-9 inline-flex items-center text-xs font-mono rounded-md overflow-x-auto whitespace-nowrap">
                    {value}
                </code>
                <Button variant="outline" size="sm" onClick={onCopy}>
                    {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                </Button>
            </div>
        </div>
    );
}
