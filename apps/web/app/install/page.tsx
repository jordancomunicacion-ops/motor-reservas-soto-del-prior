"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { ArrowLeft, Check, Loader2, Rocket, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ZoneDraft = { name: string; tables: number };

export default function InstallPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [hotelName, setHotelName] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [createRestaurant, setCreateRestaurant] = useState(true);
    const [restaurantName, setRestaurantName] = useState('');
    const [zones, setZones] = useState<ZoneDraft[]>([{ name: 'Salón', tables: 6 }]);

    useEffect(() => {
        if (hotelName && !restaurantName) {
            setRestaurantName(`Restaurante ${hotelName}`);
        }
    }, [hotelName]);

    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            const res = await fetchAPI<{ isInstalled?: boolean }>('/installer/status');
            if (res.isInstalled) router.push('/admin');
        } catch { /* ignore */ }
    }

    async function handleSetup() {
        if (!hotelName || !adminEmail || !adminPassword) {
            return alert('Por favor, rellena todos los campos obligatorios');
        }
        if (adminPassword.length < 8) {
            return alert('La contraseña del administrador debe tener al menos 8 caracteres');
        }
        setLoading(true);
        try {
            await fetchAPI('/installer/setup', {
                method: 'POST',
                body: JSON.stringify({
                    hotelName,
                    currency,
                    adminEmail,
                    adminPassword,
                    createRestaurant,
                    restaurantName: createRestaurant ? restaurantName : undefined,
                    zones: createRestaurant ? zones : undefined,
                }),
            });
            setStep(4);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Error desconocido';
            alert('Error en instalación: ' + message);
        } finally {
            setLoading(false);
        }
    }

    const addZone = () => setZones([...zones, { name: 'Nueva zona', tables: 4 }]);
    const removeZone = (idx: number) => setZones(zones.filter((_, i) => i !== idx));
    const updateZone = <K extends keyof ZoneDraft>(idx: number, field: K, val: ZoneDraft[K]) => {
        const next = [...zones];
        next[idx] = { ...next[idx], [field]: val };
        setZones(next);
    };

    const totalSteps = 4;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <Image src="/logo-icon.png" alt="Soto del Prior" width={48} height={48} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-eyebrow">Instalador</p>
                        <h1 className="font-display text-2xl font-medium tracking-tight">
                            Soto PMS
                        </h1>
                    </div>
                </div>

                <Card className="border-border/60 shadow-sm">
                    <div className="px-6 pt-5">
                        <div className="flex items-center justify-between mb-2 text-[11px] text-muted-foreground tabular-nums">
                            <span>Paso {Math.min(step, totalSteps)} / {totalSteps}</span>
                        </div>
                        <div className="flex gap-1">
                            {Array.from({ length: totalSteps }).map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1 flex-1 rounded-full transition-colors",
                                        i < step ? "bg-primary" : "bg-muted",
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                    <CardContent>
                        {step === 1 && (
                            <div className="text-center space-y-5 py-4">
                                <div className="mx-auto grid place-items-center size-14 rounded-full bg-primary/10 text-primary">
                                    <Rocket className="size-6" />
                                </div>
                                <div className="space-y-1.5">
                                    <h2 className="font-display text-xl font-medium tracking-tight">
                                        Bienvenido a su nuevo PMS
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Este asistente le ayudará a configurar su hotel, restaurante y cuenta de administrador.
                                    </p>
                                </div>
                                <Button size="lg" className="w-full" onClick={() => setStep(2)}>Comenzar</Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5">
                                <h3 className="font-display text-base font-medium tracking-tight pb-2 border-b border-border/60">
                                    Configuración del hotel
                                </h3>
                                <div className="space-y-1.5">
                                    <Label htmlFor="hotel-name" className="text-eyebrow">Nombre del hotel</Label>
                                    <Input id="hotel-name" className="h-10" value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="Gran Hotel Soto" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="currency" className="text-eyebrow">Moneda</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger id="currency" className="w-full h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="pt-4 border-t border-border/60 space-y-3">
                                    <h3 className="font-display text-base font-medium tracking-tight">Cuenta admin</h3>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="admin-email" className="text-eyebrow">Email</Label>
                                        <Input id="admin-email" type="email" className="h-10" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@ejemplo.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="admin-pwd" className="text-eyebrow">Contraseña (mín. 8 caracteres)</Label>
                                        <Input id="admin-pwd" type="password" minLength={8} className="h-10" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                                    </div>
                                </div>

                                <Button size="lg" className="w-full" onClick={() => setStep(3)}>Siguiente: restaurante</Button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5">
                                <h3 className="font-display text-base font-medium tracking-tight pb-2 border-b border-border/60">
                                    Configuración del restaurante
                                </h3>

                                <label className="flex items-center gap-3 p-3 rounded-md border border-border cursor-pointer hover:bg-accent/40 transition-colors">
                                    <Checkbox
                                        checked={createRestaurant}
                                        onCheckedChange={(v) => setCreateRestaurant(!!v)}
                                    />
                                    <span className="text-sm font-medium">Activar módulo de restaurante</span>
                                </label>

                                {createRestaurant && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="rest-name" className="text-eyebrow">Nombre del restaurante</Label>
                                            <Input id="rest-name" className="h-10" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="Restaurante del Hotel" />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-eyebrow">Zonas y mesas</Label>
                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                {zones.map((z, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center">
                                                        <Input
                                                            className="flex-1 h-9"
                                                            value={z.name}
                                                            onChange={e => updateZone(idx, 'name', e.target.value)}
                                                            placeholder="Nombre zona"
                                                        />
                                                        <Input
                                                            type="number"
                                                            className="w-20 h-9 tabular-nums"
                                                            value={z.tables}
                                                            onChange={e => updateZone(idx, 'tables', parseInt(e.target.value) || 0)}
                                                            min={1}
                                                            max={50}
                                                            title="Nº mesas"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => removeZone(idx)}
                                                            className="text-destructive hover:bg-destructive/10"
                                                            aria-label="Eliminar zona"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={addZone} className="w-full border-dashed">
                                                + Añadir zona
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                                        <ArrowLeft className="size-4" /> Atrás
                                    </Button>
                                    <Button className="flex-1" onClick={handleSetup} disabled={loading}>
                                        {loading && <Loader2 className="size-4 animate-spin" />}
                                        {loading ? 'Instalando…' : 'Finalizar instalación'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="text-center space-y-5 py-4">
                                <div className="mx-auto grid place-items-center size-14 rounded-full bg-success/10 text-success">
                                    <Check className="size-7" strokeWidth={2.5} />
                                </div>
                                <div className="space-y-1.5">
                                    <h2 className="font-display text-xl font-medium tracking-tight">
                                        ¡Instalación completada!
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Su sistema está listo para recibir reservas.
                                    </p>
                                </div>
                                <Button size="lg" className="w-full" onClick={() => router.push('/admin')}>
                                    Ir al panel de control
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="text-center justify-center text-[11px] text-muted-foreground border-t border-border/60 pt-3">
                        Soto PMS v2.0 · Next.js & NestJS
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
