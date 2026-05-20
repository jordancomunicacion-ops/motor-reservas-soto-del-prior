"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Save, Building2, Trash2, Utensils, Sparkles, Settings, CreditCard, Star, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WidgetConfigSection } from '@/components/admin/WidgetConfigSection';
import { MailConfigSection, type MailConfigValue } from '@/components/admin/MailConfigSection';
import { HotelOpeningsManager } from '@/components/admin/HotelOpeningsManager';



import AccessManager from '@/components/admin/AccessManager';
import { Users } from 'lucide-react';

interface MailConfig {
    host: string;
    port: string;
    user: string;
    pass: string;
    from: string;
    notificationsEnabled: boolean;
}

interface EmailTemplates {
    created: string;
    confirmed: string;
    cancelled: string;
    modified: string;
    reminder: string;
    review?: string;
}

interface HotelDetail {
    id: string;
    name?: string;
    currency?: string;
    timezone?: string;
    restaurantId?: string | null;
    contactEmail?: string | null;
    emailTemplates?: EmailTemplates | null;
    mailConfig?: MailConfig | null;
    googleReviewUrl?: string | null;
    reviewMinScoreForGoogle?: number | null;
    integrations?: {
        stripeEnabled?: boolean;
        noShowFee?: number;
        cancelHours?: number;
    } | null;
}

interface RestaurantOption {
    id: string;
    name: string;
}

function HotelConfigContent() {
    const params = useParams();
    const router = useRouter();
    const hotelId = params.id as string;
    
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab') || 'general';
    const [activeTemplate, setActiveTemplate] = useState<'created' | 'confirmed' | 'cancelled' | 'modified' | 'reminder' | 'review'>('created');
    
    const [hotel, setHotel] = useState<HotelDetail | null>(null);
    const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        currency: 'EUR',
        timezone: 'Europe/Madrid',
        restaurantId: '',
        contactEmail: '',
        googleReviewUrl: '',
        reviewMinScoreForGoogle: 4,
        emailTemplates: {
            created: '<h1>¡Bienvenido a {{hotel_name}}!</h1><p>Hola {{name}}, hemos recibido tu solicitud de reserva para la habitación {{room_type}}.</p>',
            confirmed: '<h1>Reserva Confirmada en {{hotel_name}}</h1><p>Tu estancia está confirmada del {{check_in}} al {{check_out}}.</p>',
            cancelled: '<h1>Reserva Cancelada</h1><p>Tu reserva en {{hotel_name}} ha sido cancelada.</p>',
            modified: '<h1>Reserva Modificada</h1><p>Hola {{name}}, tu reserva en {{hotel_name}} ha sido actualizada correctamente.</p>',
            reminder: '<h1>Recordatorio de Estancia</h1><p>Hola {{name}}, te recordamos tu próxima estancia en {{hotel_name}} para el día {{check_in}}.</p>',
            review: '<h1>¿Cómo fue tu estancia, {{name}}?</h1><p>Nos encantaría conocer tu opinión sobre tu estancia del {{check_in}} al {{check_out}} en {{hotel_name}}. Solo te robará un minuto: <a href="{{review_link}}">déjanos tu valoración aquí</a>.</p>'
        },
        stripeEnabled: false,
        noShowFee: 0,
        cancelHours: 48,
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
        loadHotel();
        loadRestaurants();
    }, [hotelId]);

    async function loadHotel() {
        try {
            const data = await fetchAPI<HotelDetail>(`/property/hotels/${hotelId}`);
            setHotel(data);
            setFormData({
                name: data.name || '',
                currency: data.currency || 'EUR',
                timezone: data.timezone || 'Europe/Madrid',
                restaurantId: data.restaurantId || '',
                contactEmail: data.contactEmail || '',
                googleReviewUrl: data.googleReviewUrl || '',
                reviewMinScoreForGoogle: data.reviewMinScoreForGoogle ?? 4,
                emailTemplates: { ...formData.emailTemplates, ...(data.emailTemplates || {}) },
                stripeEnabled: data.integrations?.stripeEnabled || false,
                noShowFee: data.integrations?.noShowFee || 0,
                cancelHours: data.integrations?.cancelHours || 48,
                mailConfig: data.mailConfig || {
                    host: '',
                    port: '587',
                    user: '',
                    pass: '',
                    from: '',
                    notificationsEnabled: true,
                    passConfigured: false,
                    graph: { tenantId: '', clientId: '', senderEmail: '', clientSecretConfigured: false }
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
            const data = await fetchAPI<RestaurantOption[]>('/restaurant');
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
                    googleReviewUrl: formData.googleReviewUrl?.trim() || null,
                    reviewMinScoreForGoogle: Number(formData.reviewMinScoreForGoogle) || 4,
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

    if (loading) return <div className="p-8 text-muted-foreground">Cargando configuración...</div>;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <PageHeader
                eyebrow="Hotel"
                title={`${tab === 'general' ? 'Ajustes' : 'Gestión de accesos'} · ${hotel?.name ?? ''}`}
                description={tab === 'general' ? 'Configuración general del hotel.' : 'Gestión de permisos de personal.'}
                actions={
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/admin/hotels"><ArrowLeft className="size-4" /></Link>
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
                                <CardDescription>Modifica los datos básicos del hotel.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="hotel-name" className="text-eyebrow">Nombre del Hotel</Label>
                                <Input
                                    id="hotel-name"
                                    className="h-10"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ej: Soto del Prior Boutique"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="hotel-email" className="text-eyebrow">Email de Notificaciones</Label>
                                <Input
                                    id="hotel-email"
                                    type="email"
                                    className="h-10"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                                    placeholder="reservas@tudominio.com"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="hotel-currency" className="text-eyebrow">Moneda (Currency)</Label>
                                <Input
                                    id="hotel-currency"
                                    className="h-10"
                                    value={formData.currency}
                                    onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                    placeholder="Ej: EUR, USD"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="hotel-timezone" className="text-eyebrow">Zona Horaria</Label>
                                <Input
                                    id="hotel-timezone"
                                    className="h-10"
                                    value={formData.timezone}
                                    onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                                    placeholder="Ej: Europe/Madrid"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/60 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <Utensils className="size-4" /> Restaurante Asociado (Sinergia)
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-eyebrow">Restaurante para Desayunos y Comidas</Label>
                                <Select
                                    value={formData.restaurantId}
                                    onValueChange={(val) => setFormData({...formData, restaurantId: val})}
                                >
                                    <SelectTrigger className="h-10">
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
                                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-2 w-fit"
                                    >
                                        <Settings className="size-3" /> Ir a la configuración detallada del restaurante
                                    </Link>
                                )}
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-border/60 p-6">
                        <div className="text-sm text-muted-foreground">
                            ID: {hotel?.id}
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="size-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </CardFooter>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="grid place-items-center size-9 rounded-md bg-success/10 text-success">
                                    <CreditCard className="size-4" />
                                </div>
                                <div>
                                    <CardTitle className="font-display text-base font-medium tracking-tight">Políticas y Garantía</CardTitle>
                                    <CardDescription>Stripe y cancelaciones.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="stripe-enabled">Requerir Tarjeta (Stripe)</Label>
                                <Switch
                                    id="stripe-enabled"
                                    checked={formData.stripeEnabled}
                                    onCheckedChange={(v) => setFormData({...formData, stripeEnabled: v})}
                                />
                            </div>
                            {formData.stripeEnabled && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-eyebrow">Penalización por No-Show (€)</Label>
                                        <Input
                                            type="number"
                                            className="h-10"
                                            value={formData.noShowFee}
                                            onChange={(e) => setFormData({...formData, noShowFee: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-eyebrow">Horas límite de cancelación gratuita</Label>
                                        <Input
                                            type="number"
                                            className="h-10"
                                            value={formData.cancelHours}
                                            onChange={(e) => setFormData({...formData, cancelHours: Number(e.target.value)})}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                </div>

                <MailConfigSection
                    mailConfig={formData.mailConfig}
                    onChange={(mc) => setFormData({ ...formData, mailConfig: mc })}
                />

                <Card>
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight">Plantillas de correo</CardTitle>
                        <CardDescription>
                            Etiquetas disponibles: <code className="text-[11px] font-mono">{"{{name}}"}</code>, <code className="text-[11px] font-mono">{"{{hotel_name}}"}</code>, <code className="text-[11px] font-mono">{"{{room_type}}"}</code>, <code className="text-[11px] font-mono">{"{{check_in}}"}</code>, <code className="text-[11px] font-mono">{"{{check_out}}"}</code>, <code className="text-[11px] font-mono">{"{{reference}}"}</code>, <code className="text-[11px] font-mono">{"{{total_price}}"}</code>, <code className="text-[11px] font-mono">{"{{nights}}"}</code>, <code className="text-[11px] font-mono">{"{{modify_link}}"}</code>.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {['created', 'confirmed', 'cancelled', 'modified', 'reminder', 'review'].map((t) => (
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
                                <Label className="text-eyebrow">Contenido HTML</Label>
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
                </>
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
                    <WidgetConfigSection entityId={hotelId} type="hotel" />
                </div>
            )}

            {tab === 'general' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="grid place-items-center size-9 rounded-md bg-warning/15 text-warning-foreground">
                                <Star className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Valoraciones y Google Reseñas</CardTitle>
                                <CardDescription>El email de valoración se envía automáticamente 24h después del checkOut. Si la puntuación es alta, redirigimos al huésped a tu página de Google Reseñas.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="hotel-google-url" className="text-eyebrow">URL de Google Reseñas</Label>
                            <Input
                                id="hotel-google-url"
                                type="url"
                                className="h-10"
                                value={formData.googleReviewUrl}
                                onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                                placeholder="https://g.page/r/.../review"
                            />
                            <p className="text-xs text-muted-foreground">Pega el enlace corto de Google Maps → Compartir → «Obtener más reseñas». Si lo dejas vacío, el huésped solo verá el mensaje de agradecimiento.</p>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="hotel-review-min-score" className="text-eyebrow">Puntuación mínima para redirigir a Google (1-5)</Label>
                            <Input
                                id="hotel-review-min-score"
                                type="number"
                                min={1}
                                max={5}
                                value={formData.reviewMinScoreForGoogle}
                                onChange={(e) => setFormData({ ...formData, reviewMinScoreForGoogle: parseInt(e.target.value) || 4 })}
                                className="h-10 w-32"
                            />
                            <p className="text-xs text-muted-foreground">Por defecto 4: si Atención, Habitación y Limpieza son ≥ 4, redirigimos a Google al enviar.</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {tab === 'general' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="grid place-items-center size-9 rounded-md bg-emerald-500/10 text-emerald-600">
                                <CalendarCheck className="size-4" />
                            </div>
                            <div>
                                <CardTitle className="font-display text-base font-medium tracking-tight">Días de Apertura Excepcional</CardTitle>
                                <CardDescription>Abre el hotel días concretos aunque tengas stopSell, CTA o CTD activos en las restricciones.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <HotelOpeningsManager hotelId={hotelId} />
                    </CardContent>
                </Card>
            )}

            {tab === 'general' && (
                <Card className="border-destructive/30 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="font-display text-base font-medium tracking-tight text-destructive">Zona de Peligro</CardTitle>
                        <CardDescription>Acciones destructivas para este hotel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" className="gap-2" onClick={handleDelete}>
                            <Trash2 className="size-4" /> Eliminar Hotel
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function HotelConfigPage() {
    return (
        <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando...</div>}>
            <HotelConfigContent />
        </Suspense>
    );
}
