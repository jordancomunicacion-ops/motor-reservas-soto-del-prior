"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Building2, Trash2, Utensils, Sparkles, Settings, Mail, CreditCard, Key } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WidgetConfigSection } from '@/components/admin/WidgetConfigSection';


import AccessManager from '@/components/admin/AccessManager';
import { Users } from 'lucide-react';

function HotelConfigContent() {
    const params = useParams();
    const router = useRouter();
    const hotelId = params.id as string;
    
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'general';
    const [activeTemplate, setActiveTemplate] = useState<'created' | 'confirmed' | 'cancelled' | 'modified' | 'reminder'>('created');
    
    const [hotel, setHotel] = useState<any>(null);
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        restaurantId: '',
        contactEmail: '',
        emailTemplates: {
            created: '<h1>¡Bienvenido a {{hotel_name}}!</h1><p>Hola {{name}}, hemos recibido tu solicitud de reserva para la habitación {{room_type}}.</p>',
            confirmed: '<h1>Reserva Confirmada en {{hotel_name}}</h1><p>Tu estancia está confirmada del {{check_in}} al {{check_out}}.</p>',
            cancelled: '<h1>Reserva Cancelada</h1><p>Tu reserva en {{hotel_name}} ha sido cancelada.</p>',
            modified: '<h1>Reserva Modificada</h1><p>Hola {{name}}, tu reserva en {{hotel_name}} ha sido actualizada correctamente.</p>',
            reminder: '<h1>Recordatorio de Estancia</h1><p>Hola {{name}}, te recordamos tu próxima estancia en {{hotel_name}} para el día {{check_in}}.</p>'
        },
        stripeEnabled: false,
        noShowFee: 0,
        cancelHours: 48,
        mailConfig: {
            host: '',
            port: '587',
            user: '',
            pass: '',
            from: ''
        }
    });

    useEffect(() => {
        loadHotel();
        loadRestaurants();
    }, [hotelId]);

    async function loadHotel() {
        try {
            const data = await fetchAPI(`/property/hotels/${hotelId}`);
            setHotel(data);
            setFormData({
                name: data.name || '',
                currency: data.currency || 'EUR',
                timezone: data.timezone || 'Europe/Madrid',
                restaurantId: data.restaurantId || '',
                contactEmail: data.contactEmail || '',
                emailTemplates: data.emailTemplates || formData.emailTemplates,
                stripeEnabled: data.integrations?.stripeEnabled || false,
                noShowFee: data.integrations?.noShowFee || 0,
                cancelHours: data.integrations?.cancelHours || 48,
                mailConfig: data.mailConfig || {
                    host: '',
                    port: '587',
                    user: '',
                    pass: '',
                    from: ''
                }
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function loadRestaurants() {
        try {
            const data = await fetchAPI('/restaurant');
            setRestaurants(data);
        } catch (e) {
            console.error(e);
        }
    }


    async function handleSave() {
        if (!formData.name) {
            alert('El nombre es obligatorio');
            return;
        }

        setSaving(true);
        try {
            await fetchAPI(`/property/hotels/${hotelId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: formData.name,
                    currency: formData.currency,
                    timezone: formData.timezone,
                    restaurantId: formData.restaurantId,
                    contactEmail: formData.contactEmail,
                    emailTemplates: formData.emailTemplates,
                    integrations: {
                        stripeEnabled: formData.stripeEnabled,
                        noShowFee: formData.noShowFee,
                        cancelHours: formData.cancelHours,
                    },
                    mailConfig: formData.mailConfig
                })
            });
            alert('Configuración guardada correctamente');
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        const confirm = window.confirm('¿Estás seguro de que quieres eliminar este hotel y todos sus datos? Esta acción no se puede deshacer.');
        if (!confirm) return;

        try {
            await fetchAPI(`/property/hotels/${hotelId}`, {
                method: 'DELETE'
            });
            alert('Hotel eliminado correctamente');
            router.push('/admin/hotels');
        } catch (e) {
            console.error('Error deleting hotel:', e);
            alert('Error al eliminar el hotel');
        }
    }

    async function handleSendTest() {
        const email = window.prompt('Introduce el email para recibir la prueba:', formData.contactEmail);
        if (!email) return;

        setSendingTest(true);
        try {
            await fetchAPI('/mail/test', {
                method: 'POST',
                body: JSON.stringify({
                    to: email,
                    entityId: hotelId,
                    entityType: 'hotel',
                    templateType: activeTemplate
                })
            });
            alert('Correo de prueba enviado correctamente');
        } catch (e) {
            console.error(e);
            alert('Error al enviar el correo de prueba');
        } finally {
            setSendingTest(false);
        }
    }

    if (loading) return <div className="p-8">Cargando configuración...</div>;

    return (
        <div className="space-y-10 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Link href="/admin/hotels" className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">
                        {tab === 'general' ? 'Ajustes' : 'Gestión de Accesos'}
                        : {hotel?.name}
                    </h1>
                    <p className="text-muted-foreground">
                        {tab === 'general' ? 'Configuración general del hotel.' : 'Gestión de permisos de personal.'}
                    </p>
                </div>
            </div>

            {tab === 'general' && (
                <>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Información General</CardTitle>
                                <CardDescription>Modifica los datos básicos del hotel.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hotel-name">Nombre del Hotel</Label>
                                <Input 
                                    id="hotel-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej: Soto del Prior Boutique"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="hotel-email">Email de Notificaciones</Label>
                                <Input 
                                    id="hotel-email"
                                    type="email"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                                    placeholder="reservas@tudominio.com"
                                />
                            </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="hotel-currency">Moneda (Currency)</Label>
                                <Input 
                                    id="hotel-currency"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    placeholder="Ej: EUR, USD"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="hotel-timezone">Zona Horaria</Label>
                                <Input 
                                    id="hotel-timezone"
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                                    placeholder="Ej: Europe/Madrid"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                                <Utensils className="w-4 h-4" /> Restaurante Asociado (Sinergia)
                            </div>
                            <div className="space-y-2">
                                <Label>Restaurante para Desayunos y Comidas</Label>
                                <Select 
                                    value={formData.restaurantId} 
                                    onValueChange={(val) => setFormData({...formData, restaurantId: val})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un restaurante..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        {restaurants.map(r => (
                                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[11px] text-muted-foreground">
                                    Vincular un restaurante permitirá a los clientes reservar mesas directamente desde el motor de reservas del hotel.
                                </p>
                                {formData.restaurantId && formData.restaurantId !== 'none' && (
                                    <Link 
                                        href={`/admin/restaurant/${formData.restaurantId}/config`} 
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2 w-fit"
                                    >
                                        <Settings className="w-3 h-3" /> Ir a la configuración detallada del restaurante
                                    </Link>
                                )}
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                        <div className="text-sm text-muted-foreground">
                            ID: {hotel?.id}
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </CardFooter>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Políticas y Garantía</CardTitle>
                                    <CardDescription>Stripe y cancelaciones.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="stripe-enabled">Requerir Tarjeta (Stripe)</Label>
                                <input 
                                    type="checkbox" 
                                    id="stripe-enabled" 
                                    className="w-4 h-4"
                                    checked={formData.stripeEnabled}
                                    onChange={(e) => setFormData({...formData, stripeEnabled: e.target.checked})}
                                />
                            </div>
                            {formData.stripeEnabled && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Penalización por No-Show (€)</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.noShowFee}
                                            onChange={(e) => setFormData({...formData, noShowFee: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Horas límite de cancelación gratuita</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.cancelHours}
                                            onChange={(e) => setFormData({...formData, cancelHours: Number(e.target.value)})}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                </div>

                {/* SECCIÓN DE NOTIFICACIONES */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Notificaciones Automáticas</CardTitle>
                                <CardDescription>Configura los correos que reciben tus huéspedes. (Nota: La gestión de correos de hoteles se centralizará en el futuro).</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Servidor SMTP (ej: smtp.office365.com)</Label>
                                <Input 
                                    value={formData.mailConfig.host}
                                    onChange={(e) => setFormData({...formData, mailConfig: {...formData.mailConfig, host: e.target.value}})}
                                    placeholder="smtp.ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Puerto (ej: 587)</Label>
                                <Input 
                                    value={formData.mailConfig.port}
                                    onChange={(e) => setFormData({...formData, mailConfig: {...formData.mailConfig, port: e.target.value}})}
                                    placeholder="587"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Usuario / Email</Label>
                                <Input 
                                    value={formData.mailConfig.user}
                                    onChange={(e) => setFormData({...formData, mailConfig: {...formData.mailConfig, user: e.target.value}})}
                                    placeholder="usuario@ejemplo.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contraseña (o Contraseña de Aplicación)</Label>
                                <Input 
                                    type="password"
                                    value={formData.mailConfig.pass}
                                    onChange={(e) => setFormData({...formData, mailConfig: {...formData.mailConfig, pass: e.target.value}})}
                                    placeholder="••••••••••••"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label>Email remitente (Aparecerá como el 'De:')</Label>
                                <Input 
                                    value={formData.mailConfig.from}
                                    onChange={(e) => setFormData({...formData, mailConfig: {...formData.mailConfig, from: e.target.value}})}
                                    placeholder="reservas@tudominio.com"
                                />
                                <p className="text-[10px] text-muted-foreground">Si se deja vacío, se usará el usuario/email de arriba.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex gap-3">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                Etiquetas disponibles: <strong>{"{{name}}"}</strong>, <strong>{"{{hotel_name}}"}</strong>, <strong>{"{{room_type}}"}</strong>, <strong>{"{{check_in}}"}</strong>, <strong>{"{{check_out}}"}</strong>, <strong>{"{{reference}}"}</strong>, <strong>{"{{total_price}}"}</strong>, <strong>{"{{nights}}"}</strong>, <strong>{"{{modify_link}}"}</strong>.
                            </p>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-8">
                            <div className="flex flex-wrap gap-2">
                                {['created', 'confirmed', 'cancelled', 'modified', 'reminder'].map((t) => (
                                    <Button 
                                        key={t}
                                        variant={activeTemplate === t ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setActiveTemplate(t as any)}
                                        className="capitalize"
                                    >
                                        {t === 'created' ? 'Nueva Reserva' : t === 'confirmed' ? 'Confirmación' : t === 'cancelled' ? 'Cancelación' : t === 'modified' ? 'Modificación' : 'Recordatorio'}
                                    </Button>
                                ))}
                                <div className="flex-1" />
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleSendTest} 
                                    disabled={sendingTest}
                                    className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                >
                                    <Sparkles className="w-4 h-4" /> {sendingTest ? 'Enviando...' : 'Enviar Prueba'}
                                </Button>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Contenido HTML</Label>
                                <textarea 
                                    className="w-full h-64 p-4 font-mono text-xs bg-zinc-950 text-green-400 rounded-lg border outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.emailTemplates[activeTemplate as keyof typeof formData.emailTemplates]}
                                    onChange={(e) => setFormData({
                                        ...formData, 
                                        emailTemplates: {
                                            ...formData.emailTemplates,
                                            [activeTemplate]: e.target.value
                                        }
                                    })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                </>
            )}

            {tab === 'access' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle>Gestión de Accesos</CardTitle>
                                <CardDescription>Autoriza a empleados para acceder a la operativa de este hotel.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AccessManager contextId={hotelId} contextType="hotel" />
                    </CardContent>
                </Card>
            )}

            {tab === 'widget' && (
                <div className="space-y-6">
                    <div className="bg-indigo-600 p-6 rounded-xl text-white mb-4 shadow-lg">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Sparkles className="w-6 h-6" /> Personalización del Motor Web
                        </h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            Configura cómo se ve y se comporta el widget de reservas en tu página web.
                        </p>
                    </div>
                    <WidgetConfigSection entityId={hotelId} type="hotel" />
                </div>
            )}

            {tab === 'general' && (
                <Card className="border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                    <CardHeader>
                        <CardTitle className="text-red-600 dark:text-red-400">Zona de Peligro</CardTitle>
                        <CardDescription>Acciones destructivas para este hotel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4" /> Eliminar Hotel
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function HotelConfigPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <HotelConfigContent />
        </Suspense>
    );
}
