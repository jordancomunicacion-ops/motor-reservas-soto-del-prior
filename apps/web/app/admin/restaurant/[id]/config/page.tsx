"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Building2, Trash2, Hotel, Users, Sparkles, Mail, CreditCard, Key, BellRing } from 'lucide-react';
import Link from 'next/link';
import { ShiftsManager } from '@/components/admin/ShiftsManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WidgetConfigSection } from '@/components/admin/WidgetConfigSection';
import { Switch } from '@/components/ui/switch';




import AccessManager from '@/components/admin/AccessManager';

function RestaurantConfigContent() {
    const params = useParams();
    const router = useRouter();
    const restaurantId = params.id as string;
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'general';
    const [activeTemplate, setActiveTemplate] = useState<'created' | 'confirmed' | 'cancelled' | 'modified' | 'reminder'>('created');
    
    const [restaurant, setRestaurant] = useState<any>(null);
    const [hotels, setHotels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        hotelId: '',
        defaultDuration: 90,
        contactEmail: '',
        emailTemplates: {
            created: '<h1>¡Hola {{name}}!</h1><p>Hemos recibido tu reserva para el día {{date}} a las {{time}}.</p>',
            confirmed: '<h1>Reserva Confirmada</h1><p>Tu mesa está lista para el {{date}}.</p>',
            cancelled: '<h1>Reserva Cancelada</h1><p>Lamentamos informarte que tu reserva ha sido cancelada.</p>',
            modified: '<h1>Reserva Modificada</h1><p>Hola {{name}}, tu reserva para el día {{date}} a las {{time}} ha sido modificada.</p>',
            reminder: '<h1>Recordatorio de Reserva</h1><p>Hola {{name}}, te recordamos tu reserva para el {{date}} a las {{time}}. Por favor, confirma tu asistencia o cancela si no puedes venir.</p>',
            waitlist_join: '<h1>Estás en lista de espera</h1><p>Hola {{name}}, te hemos añadido a la lista de espera para el {{date}}.</p>',
            waitlist_available: '<h1>¡Hay un hueco libre!</h1><p>Hola {{name}}, se ha liberado una mesa para tu solicitud del {{date}}. Por favor, confirma para reservarla.</p>'
        },
        mailConfig: {
            host: '',
            port: '587',
            user: '',
            pass: '',
            from: '',
            notificationsEnabled: true
        }

    });

    useEffect(() => {
        loadRestaurant();
        loadHotels();
    }, [restaurantId]);

    async function loadRestaurant() {
        try {
            const data = await fetchAPI(`/restaurant/${restaurantId}`);
            setRestaurant(data);
            setFormData({
                name: data.name || '',
                currency: data.currency || 'EUR',
                hotelId: data.hotel?.id || '',
                defaultDuration: data.defaultDuration || 90,
                contactEmail: data.contactEmail || '',
                emailTemplates: data.emailTemplates || formData.emailTemplates,
                mailConfig: data.mailConfig || {
                    host: '',
                    port: '587',
                    user: '',
                    pass: '',
                    from: '',
                    notificationsEnabled: true
                }

            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function loadHotels() {
        try {
            const data = await fetchAPI('/property/hotels');
            setHotels(data);
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
            await fetchAPI(`/restaurant/${restaurantId}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    name: formData.name, 
                    currency: formData.currency,
                    hotelId: formData.hotelId,
                    defaultDuration: Number(formData.defaultDuration),
                    contactEmail: formData.contactEmail,
                    emailTemplates: formData.emailTemplates,
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
        const confirm = window.confirm('¿Estás seguro de que quieres eliminar este restaurante y todos sus datos? Esta acción no se puede deshacer.');
        if (!confirm) return;

        try {
            await fetchAPI(`/restaurant/${restaurantId}`, {
                method: 'DELETE'
            });
            alert('Restaurante eliminado correctamente');
            router.push('/admin/restaurant');
        } catch (e) {
            console.error('Error deleting restaurant:', e);
            alert('Error al eliminar el restaurante');
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
                    entityId: restaurantId,
                    entityType: 'restaurant',
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
                <Link href={`/admin/restaurant/${restaurantId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">
                        {tab === 'general' ? 'Ajustes' : 'Gestión de Accesos'}
                        : {restaurant?.name}
                    </h1>
                    <p className="text-muted-foreground">
                        {tab === 'general' ? 'Configuración general y operativa.' : 'Gestión de permisos de personal.'}
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
                            <CardDescription>Modifica los datos básicos del restaurante.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rest-name">Nombre del Restaurante</Label>
                            <Input 
                                id="rest-name"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Ej: El Cenador de Soto"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="rest-email">Email de Notificaciones</Label>
                            <Input 
                                id="rest-email"
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                                placeholder="reservas@tudominio.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rest-duration">Tiempo por Reserva (minutos)</Label>
                        <div className="flex items-center gap-2">
                            <Input 
                                id="rest-duration"
                                type="number"
                                value={formData.defaultDuration}
                                onChange={(e) => setFormData({...formData, defaultDuration: parseInt(e.target.value)})}
                                className="w-32"
                            />
                            <span className="text-sm text-muted-foreground italic">Duración estimada de una comida/cena.</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
                            <Hotel className="w-4 h-4" /> Hotel Asociado (Sinergia)
                        </div>
                        <div className="space-y-2">
                            <Label>Este restaurante pertenece al hotel:</Label>
                            <Select 
                                value={formData.hotelId} 
                                onValueChange={(val) => setFormData({...formData, hotelId: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un hotel..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguno</SelectItem>
                                    {hotels.map(h => (
                                        <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6">
                    <div className="text-sm text-muted-foreground">
                        ID: {restaurant?.id}
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardFooter>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">


            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle>Configuración del Servidor de Envío</CardTitle>
                            <CardDescription>Define la cuenta de correo desde la que se enviarán las notificaciones de este restaurante.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 text-white rounded-full">
                                <BellRing className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Notificaciones por Email</p>
                                <p className="text-xs text-muted-foreground italic">Activa o desactiva el envío de correos automáticos.</p>
                            </div>
                        </div>
                        <Switch 
                            checked={formData.mailConfig.notificationsEnabled !== false}
                            onCheckedChange={(checked) => setFormData({
                                ...formData, 
                                mailConfig: { ...formData.mailConfig, notificationsEnabled: checked }
                            })}
                        />

                    </div>

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
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle>Notificaciones Automáticas</CardTitle>
                            <CardDescription>Personaliza los correos que reciben tus clientes.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-lg flex gap-3">
                        <div className="text-amber-600">⚠️</div>
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                            Usa etiquetas como <strong>{"{{name}}"}</strong>, <strong>{"{{date}}"}</strong>, <strong>{"{{time}}"}</strong> o <strong>{"{{modify_link}}"}</strong> para personalizar el contenido dinámicamente.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex flex-wrap gap-2">
                                {['created', 'confirmed', 'cancelled', 'modified', 'reminder', 'waitlist_join', 'waitlist_available'].map((t) => (
                                    <Button 
                                        key={t}
                                        variant={activeTemplate === t ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setActiveTemplate(t as any)}
                                        className="capitalize"
                                    >
                                        {t === 'created' ? 'Nueva Reserva' : 
                                         t === 'confirmed' ? 'Confirmación' : 
                                         t === 'cancelled' ? 'Cancelación' : 
                                         t === 'modified' ? 'Modificación' : 
                                         t === 'reminder' ? 'Recordatorio' :
                                         t === 'waitlist_join' ? 'L. Espera (Unirse)' : 'L. Espera (Disponible)'}
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
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Contenido HTML de la Plantilla</Label>
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

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
                            <ArrowLeft className="w-5 h-5 rotate-180" />
                        </div>
                        <div>
                            <CardTitle>Gestión de Turnos y Horarios</CardTitle>
                            <CardDescription>Define las franjas horarias disponibles para reservas.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ShiftsManager restaurantId={restaurantId} />
                </CardContent>
            </Card>
            <div className="h-4" /> {/* Espaciador */}
                </>
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
                    <WidgetConfigSection entityId={restaurantId} type="restaurant" />
                </div>
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
                                <CardDescription>Autoriza a empleados para acceder a la operativa de este restaurante.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <AccessManager contextId={restaurantId} contextType="restaurant" />
                    </CardContent>
                </Card>
            )}

            {tab === 'general' && (
                <Card className="border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">

                <CardHeader>
                    <CardTitle className="text-red-600 dark:text-red-400">Zona de Peligro</CardTitle>
                    <CardDescription>Acciones destructivas para este restaurante.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4" /> Eliminar Restaurante
                    </Button>
                </CardContent>
            </Card>
            )}
        </div>
    );
}

export default function RestaurantConfigPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <RestaurantConfigContent />
        </Suspense>
    );
}
