"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, Building2, Trash2, Hotel, Users, Sparkles, Mail, Star, Info } from 'lucide-react';
import Link from 'next/link';
import { ShiftsManager } from '@/components/admin/ShiftsManager';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WidgetConfigSection } from '@/components/admin/WidgetConfigSection';
import { MailConfigSection, type MailConfigValue } from '@/components/admin/MailConfigSection';
import AccessManager from '@/components/admin/AccessManager';

interface RestaurantDetail {
    id: string;
    name: string;
    currency: string;
    timezone?: string;
    hotel?: { id: string } | null;
    defaultDuration?: number;
    contactEmail?: string | null;
    emailTemplates?: typeof DEFAULT_EMAIL_TEMPLATES | null;
    mailConfig?: MailConfigValue | null;
    googleReviewUrl?: string | null;
    reviewMinScoreForGoogle?: number | null;
}

interface HotelOption {
    id: string;
    name: string;
}

const DEFAULT_EMAIL_TEMPLATES = {
    created: '<h1>¡Hola {{name}}!</h1><p>Hemos recibido tu reserva para el día {{date}} a las {{time}}.</p>',
    confirmed: '<h1>Reserva Confirmada</h1><p>Tu mesa está lista para el {{date}}.</p>',
    cancelled: '<h1>Reserva Cancelada</h1><p>Lamentamos informarte que tu reserva ha sido cancelada.</p>',
    modified: '<h1>Reserva Modificada</h1><p>Hola {{name}}, tu reserva para el día {{date}} a las {{time}} ha sido modificada.</p>',
    reminder: '<h1>Recordatorio de Reserva</h1><p>Hola {{name}}, te recordamos tu reserva para el {{date}} a las {{time}}. Por favor, confirma tu asistencia o cancela si no puedes venir.</p>',
    waitlist_join: '<h1>Estás en lista de espera</h1><p>Hola {{name}}, te hemos añadido a la lista de espera para el {{date}}.</p>',
    waitlist_available: '<h1>¡Hay un hueco libre!</h1><p>Hola {{name}}, se ha liberado una mesa para tu solicitud del {{date}}. Por favor, confirma para reservarla.</p>',
    review: '<h1>¿Cómo fue tu experiencia, {{name}}?</h1><p>Nos encantaría conocer tu opinión sobre tu visita del {{date}}. Solo te robará un minuto: <a href="{{review_link}}">déjanos tu valoración aquí</a>.</p>',
};

const DEFAULT_MAIL_CONFIG: MailConfigValue = {
    host: '',
    port: '587',
    user: '',
    pass: '',
    from: '',
    notificationsEnabled: true,
    passConfigured: false,
    graph: { tenantId: '', clientId: '', senderEmail: '', clientSecretConfigured: false },
};

function RestaurantConfigContent() {
    const params = useParams();
    const router = useRouter();
    const restaurantId = params.id as string;
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'general';
    const [activeTemplate, setActiveTemplate] = useState<'created' | 'confirmed' | 'cancelled' | 'modified' | 'reminder' | 'waitlist_join' | 'waitlist_available' | 'review'>('created');
    
    const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
    const [hotels, setHotels] = useState<HotelOption[]>([]);
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
        googleReviewUrl: '',
        reviewMinScoreForGoogle: 4,
        emailTemplates: {
            created: '<h1>¡Hola {{name}}!</h1><p>Hemos recibido tu reserva para el día {{date}} a las {{time}}.</p>',
            confirmed: '<h1>Reserva Confirmada</h1><p>Tu mesa está lista para el {{date}}.</p>',
            cancelled: '<h1>Reserva Cancelada</h1><p>Lamentamos informarte que tu reserva ha sido cancelada.</p>',
            modified: '<h1>Reserva Modificada</h1><p>Hola {{name}}, tu reserva para el día {{date}} a las {{time}} ha sido modificada.</p>',
            reminder: '<h1>Recordatorio de Reserva</h1><p>Hola {{name}}, te recordamos tu reserva para el {{date}} a las {{time}}. Por favor, confirma tu asistencia o cancela si no puedes venir.</p>',
            waitlist_join: '<h1>Estás en lista de espera</h1><p>Hola {{name}}, te hemos añadido a la lista de espera para el {{date}}.</p>',
            waitlist_available: '<h1>¡Hay un hueco libre!</h1><p>Hola {{name}}, se ha liberado una mesa para tu solicitud del {{date}}. Por favor, confirma para reservarla.</p>',
            review: '<h1>¿Cómo fue tu experiencia, {{name}}?</h1><p>Nos encantaría conocer tu opinión sobre tu visita del {{date}}. Solo te robará un minuto: <a href="{{review_link}}">déjanos tu valoración aquí</a>.</p>'
        },
        mailConfig: {
            host: '',
            port: '587',
            user: '',
            pass: '',
            from: '',
            notificationsEnabled: true,
            passConfigured: false,
            graph: { tenantId: '', clientId: '', senderEmail: '', clientSecretConfigured: false }
        } as MailConfigValue

    });

    useEffect(() => {
        loadRestaurant();
        loadHotels();
    }, [restaurantId]);

    async function loadRestaurant() {
        try {
            const data = await fetchAPI<RestaurantDetail>(`/restaurant/${restaurantId}`);
            setRestaurant(data);
            setFormData({
                name: data.name || '',
                currency: data.currency || 'EUR',
                timezone: data.timezone || 'Europe/Madrid',
                hotelId: data.hotel?.id || '',
                defaultDuration: data.defaultDuration || 90,
                contactEmail: data.contactEmail || '',
                googleReviewUrl: data.googleReviewUrl || '',
                reviewMinScoreForGoogle: data.reviewMinScoreForGoogle ?? 4,
                emailTemplates: { ...formData.emailTemplates, ...(data.emailTemplates || {}) },
                mailConfig: data.mailConfig || DEFAULT_MAIL_CONFIG,
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function loadHotels() {
        try {
            const data = await fetchAPI<HotelOption[]>('/property/hotels');
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
                    googleReviewUrl: formData.googleReviewUrl?.trim() || null,
                    reviewMinScoreForGoogle: Number(formData.reviewMinScoreForGoogle) || 4,
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

    if (loading) return <div className="p-8 text-muted-foreground">Cargando configuración...</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <PageHeader
                eyebrow="Restaurante"
                title={`${tab === 'general' ? 'Ajustes' : 'Gestión de accesos'} · ${restaurant?.name ?? ''}`}
                description={tab === 'general' ? 'Configuración general y operativa.' : 'Gestión de permisos de personal.'}
                actions={
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/restaurant/${restaurantId}`}><ArrowLeft className="size-4" /></Link>
                    </Button>
                }
            />

            {tab === 'general' && (
                <>
                <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                            <Building2 className="size-4" />
                        </div>
                        <div>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Información General</CardTitle>
                            <CardDescription>Modifica los datos básicos del restaurante.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="rest-name" className="text-eyebrow">Nombre del Restaurante</Label>
                            <Input
                                id="rest-name"
                                className="h-10"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="Ej: El Cenador de Soto"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="rest-email" className="text-eyebrow">Email de Notificaciones</Label>
                            <Input
                                id="rest-email"
                                type="email"
                                className="h-10"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                                placeholder="reservas@tudominio.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="rest-duration" className="text-eyebrow">Tiempo por Reserva (minutos)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="rest-duration"
                                type="number"
                                className="h-10 w-32"
                                value={formData.defaultDuration}
                                onChange={(e) => setFormData({...formData, defaultDuration: parseInt(e.target.value)})}
                            />
                            <span className="text-sm text-muted-foreground italic">Duración estimada de una comida/cena.</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/60 space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Hotel className="size-4" /> Hotel Asociado (Sinergia)
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-eyebrow">Este restaurante pertenece al hotel:</Label>
                            <Select
                                value={formData.hotelId}
                                onValueChange={(val) => setFormData({...formData, hotelId: val})}
                            >
                                <SelectTrigger className="h-10">
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
                <CardFooter className="flex justify-between border-t border-border/60 p-6">
                    <div className="text-sm text-muted-foreground">
                        ID: {restaurant?.id}
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        <Save className="size-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </CardFooter>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">


            </div>

            <MailConfigSection
                mailConfig={formData.mailConfig}
                onChange={(mc) => setFormData({ ...formData, mailConfig: mc })}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                            <Mail className="size-4" />
                        </div>
                        <div>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Notificaciones Automáticas</CardTitle>
                            <CardDescription>Personaliza los correos que reciben tus clientes.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-warning/10 border border-warning/30 p-4 rounded-md flex gap-3 items-start">
                        <Info className="size-4 text-warning-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-warning-foreground">
                            Usa etiquetas como <strong>{"{{name}}"}</strong>, <strong>{"{{date}}"}</strong>, <strong>{"{{time}}"}</strong> o <strong>{"{{modify_link}}"}</strong> para personalizar el contenido dinámicamente.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                                {['created', 'confirmed', 'cancelled', 'modified', 'reminder', 'waitlist_join', 'waitlist_available', 'review'].map((t) => (
                                    <Button
                                        key={t}
                                        variant={activeTemplate === t ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setActiveTemplate(t as typeof activeTemplate)}
                                    >
                                        {t === 'created' ? 'Nueva Reserva' :
                                         t === 'confirmed' ? 'Confirmación' :
                                         t === 'cancelled' ? 'Cancelación' :
                                         t === 'modified' ? 'Modificación' :
                                         t === 'reminder' ? 'Recordatorio' :
                                         t === 'waitlist_join' ? 'L. Espera (Unirse)' :
                                         t === 'waitlist_available' ? 'L. Espera (Disponible)' :
                                         'Valoración (24h)'}
                                    </Button>
                                ))}
                                <div className="flex-1" />
                                <Button
                                    variant="tonal"
                                    size="sm"
                                    onClick={handleSendTest}
                                    disabled={sendingTest}
                                    className="gap-2"
                                >
                                    <Sparkles className="size-4" /> {sendingTest ? 'Enviando...' : 'Enviar Prueba'}
                                </Button>
                            </div>

                        <div className="space-y-1.5">
                            <Label className="text-eyebrow">Contenido HTML de la Plantilla</Label>
                            <Textarea
                                className="h-64 font-mono text-xs resize-none"
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
                        <div className="grid place-items-center size-9 rounded-md bg-warning/15 text-warning-foreground">
                            <Star className="size-4" />
                        </div>
                        <div>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Valoraciones y Google Reseñas</CardTitle>
                            <CardDescription>El email de valoración se envía automáticamente 24h después de la reserva. Si la puntuación es alta, redirigimos al cliente a tu página de Google Reseñas.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="review-google-url" className="text-eyebrow">URL de Google Reseñas</Label>
                        <Input
                            id="review-google-url"
                            type="url"
                            className="h-10"
                            value={formData.googleReviewUrl}
                            onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                            placeholder="https://g.page/r/.../review"
                        />
                        <p className="text-xs text-muted-foreground">Pega el enlace corto de Google Maps → Compartir → “Obtener más reseñas”. Si lo dejas vacío, el cliente solo verá el mensaje de agradecimiento.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="review-min-score" className="text-eyebrow">Puntuación mínima para redirigir a Google (1-5)</Label>
                        <Input
                            id="review-min-score"
                            type="number"
                            min={1}
                            max={5}
                            value={formData.reviewMinScoreForGoogle}
                            onChange={(e) => setFormData({ ...formData, reviewMinScoreForGoogle: parseInt(e.target.value) || 4 })}
                            className="h-10 w-32"
                        />
                        <p className="text-xs text-muted-foreground">Por defecto 4: si Atención, Entorno y Comida son ≥ 4, redirigimos a Google al enviar.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                            <ArrowLeft className="size-4 rotate-180" />
                        </div>
                        <div>
                            <CardTitle className="font-display text-base font-medium tracking-tight">Gestión de Turnos y Horarios</CardTitle>
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
                    <Card className="bg-primary text-primary-foreground border-primary/20">
                        <CardContent className="space-y-1.5">
                            <h2 className="font-display text-xl font-medium flex items-center gap-2">
                                <Sparkles className="size-5" /> Personalización del Motor Web
                            </h2>
                            <p className="text-sm opacity-90">
                                Configura cómo se ve y se comporta el widget de reservas en tu página web.
                            </p>
                        </CardContent>
                    </Card>
                    <WidgetConfigSection entityId={restaurantId} type="restaurant" />
                </div>
            )}

            {tab === 'access' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="grid place-items-center size-9 rounded-md bg-success/10 text-success">
                                <Users className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Gestión de Accesos</CardTitle>
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
                <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="font-display text-base font-medium tracking-tight text-destructive">Zona de Peligro</CardTitle>
                    <CardDescription>Acciones destructivas para este restaurante.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                        <Trash2 className="size-4" /> Eliminar Restaurante
                    </Button>
                </CardContent>
            </Card>
            )}
        </div>
    );
}

export default function RestaurantConfigPage() {
    return (
        <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando...</div>}>
            <RestaurantConfigContent />
        </Suspense>
    );
}
