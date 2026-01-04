"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export default function InstallPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form Data
    const [hotelName, setHotelName] = useState('');
    const [currency, setCurrency] = useState('EUR');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [createRestaurant, setCreateRestaurant] = useState(true);
    const [restaurantName, setRestaurantName] = useState('');
    const [zones, setZones] = useState([{ name: 'Salón', tables: 6 }]);

    // Pre-fill restaurant name when hotel name changes
    useEffect(() => {
        if (hotelName && !restaurantName) {
            setRestaurantName(`Restaurante ${hotelName}`);
        }
    }, [hotelName]);

    // Check status on load
    useEffect(() => {
        checkStatus();
    }, []);

    async function checkStatus() {
        try {
            const res = await fetchAPI('/installer/status');
            if (res.isInstalled) {
                // alert('System already installed. Redirecting to admin...');
                router.push('/admin');
            }
        } catch (e) { }
    }

    async function handleSetup() {
        if (!hotelName || !adminEmail || !adminPassword) return alert('Por favor, rellena todos los campos obligatorios');
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
                    zones: createRestaurant ? zones : undefined
                })
            });
            setStep(4); // Success (was 3, now 4 because of extra step)
        } catch (e: any) {
            alert('Error en instalación: ' + e.message);
        } finally {
            setLoading(false);
        }
    }

    const addZone = () => setZones([...zones, { name: 'Nueva Zona', tables: 4 }]);
    const removeZone = (idx: number) => setZones(zones.filter((_, i) => i !== idx));
    const updateZone = (idx: number, field: string, val: any) => {
        const newZones = [...zones];
        // @ts-ignore
        newZones[idx][field] = val;
        setZones(newZones);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Instalador SOTO PMS</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Step 1: Welcome */}
                    {step === 1 && (
                        <div className="text-center space-y-4">
                            <div className="text-4xl">🚀</div>
                            <h2 className="text-xl font-semibold">Bienvenido a su nuevo PMS</h2>
                            <p className="text-gray-500">Este asistente le ayudará a configurar su hotel, restaurante y cuenta de administrador.</p>
                            <Button className="w-full" onClick={() => setStep(2)}>Comenzar</Button>
                        </div>
                    )}

                    {/* Step 2: Hotel Configuration */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Configuración del Hotel</h3>
                            <div>
                                <label className="text-sm font-medium">Nombre del Hotel</label>
                                <input className="w-full border p-2 rounded" value={hotelName} onChange={e => setHotelName(e.target.value)} placeholder="Gran Hotel Soto" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Moneda</label>
                                <select className="w-full border p-2 rounded" value={currency} onChange={e => setCurrency(e.target.value)}>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="font-semibold mb-2">Cuenta Admin</h3>
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-sm font-medium">Email</label>
                                        <input className="w-full border p-2 rounded" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@ejemplo.com" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Contraseña</label>
                                        <input type="password" className="w-full border p-2 rounded" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="AguyStrongPassword123" />
                                    </div>
                                </div>
                            </div>

                            <Button className="w-full" onClick={() => setStep(3)}>Siguiente: Restaurante</Button>
                        </div>
                    )}

                    {/* Step 3: Restaurant Configuration */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-medium border-b pb-2">Configuración del Restaurante</h3>

                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                                <input
                                    type="checkbox"
                                    id="enableRest"
                                    checked={createRestaurant}
                                    onChange={e => setCreateRestaurant(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="enableRest" className="text-sm font-medium cursor-pointer">Activar Módulo de Restaurante</label>
                            </div>

                            {createRestaurant && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-sm font-medium">Nombre del Restaurante</label>
                                        <input className="w-full border p-2 rounded" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="Restaurante del Hotel" />
                                    </div>

                                    <div className="pt-2">
                                        <label className="text-sm font-medium mb-2 block">Zonas y Mesas</label>
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {zones.map((z, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        className="flex-1 border p-2 rounded text-sm"
                                                        value={z.name}
                                                        onChange={e => updateZone(idx, 'name', e.target.value)}
                                                        placeholder="Nombre Zona"
                                                    />
                                                    <input
                                                        type="number"
                                                        className="w-20 border p-2 rounded text-sm"
                                                        value={z.tables}
                                                        onChange={e => updateZone(idx, 'tables', parseInt(e.target.value))}
                                                        min={1} max={50}
                                                        title="Nº Mesas"
                                                    />
                                                    <Button variant="ghost" size="icon" onClick={() => removeZone(idx)} className="text-red-500 w-8 h-8">×</Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={addZone} className="w-full mt-2 text-xs border-dashed">
                                            + Añadir Zona
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Atrás</Button>
                                <Button className="flex-1" onClick={handleSetup} disabled={loading}>
                                    {loading ? 'Instalando...' : 'Finalizar Instalación'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="text-center space-y-4">
                            <div className="text-4xl">✅</div>
                            <h2 className="text-xl font-semibold">¡Instalación Completada!</h2>
                            <p className="text-gray-500">Su sistema está listo para recibir reservas.</p>
                            <Button className="w-full" onClick={() => router.push('/admin')}>Ir al Panel de Control</Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="text-center text-xs text-gray-400 justify-center">
                    SOTO PMS v2.0 • Powered by Next.js & NestJS
                </CardFooter>
            </Card>
        </div>
    );
}
