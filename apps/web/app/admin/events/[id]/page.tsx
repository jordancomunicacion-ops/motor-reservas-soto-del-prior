"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
    PartyPopper,
    Calendar as CalendarIcon,
    Users,
    Euro,
    ArrowLeft,
    Mail,
    Phone,
    Trash2,
    Building2,
    Utensils,
    Inbox,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventBooking {
    id: string;
    guestName: string;
    guestEmail?: string | null;
    guestPhone?: string | null;
    pax: number;
    totalPrice?: number;
    createdAt?: string;
}

interface EventDetail {
    id: string;
    name: string;
    description?: string | null;
    date: string;
    capacity: number;
    price?: number;
    hotel?: { id: string; name: string } | null;
    restaurant?: { id: string; name: string } | null;
    zones?: Array<{ id: string; name?: string }>;
    bookings?: EventBooking[];
}

export default function EventDetailPage() {
    const params = useParams();
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) loadEvent();
    }, [params.id]);

    async function loadEvent() {
        setLoading(true);
        try {
            const data = await fetchAPI<EventDetail>(`/event/${params.id}`);
            setEvent(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        );
    }
    if (!event) {
        return (
            <div className="min-h-[60vh] grid place-items-center">
                <EmptyState icon={PartyPopper} title="Evento no encontrado" />
            </div>
        );
    }

    const bookings = event.bookings || [];
    const totalPax = bookings.reduce((sum, b) => sum + b.pax, 0);

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon-sm" onClick={() => window.history.back()} aria-label="Volver">
                    <ArrowLeft className="size-4" />
                </Button>
                <PageHeader
                    className="flex-1 pb-0 border-b-0"
                    eyebrow="Evento"
                    title={event.name}
                    description={
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarIcon className="size-3.5" />
                            {format(new Date(event.date), "PPPP 'a las' p", { locale: es })}
                        </span>
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 gap-0 py-0">
                    <CardHeader className="px-6 py-4 border-b border-border/60 flex-row items-center justify-between space-y-0">
                        <CardTitle className="font-display text-base font-medium tracking-tight flex items-center gap-2">
                            <Users className="size-4 text-primary" /> Reservas del evento
                        </CardTitle>
                        <StatusBadge tone="accent">
                            {totalPax} / {event.capacity} pax
                        </StatusBadge>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        {bookings.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title="Sin reservas todavía"
                                description="Las reservas para este evento aparecerán aquí."
                            />
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="text-eyebrow text-muted-foreground bg-muted/40">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Cliente</th>
                                        <th className="px-6 py-3 font-medium">Pax</th>
                                        <th className="px-6 py-3 font-medium">Total</th>
                                        <th className="px-6 py-3 font-medium">Fecha reserva</th>
                                        <th className="px-6 py-3 font-medium text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {bookings.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-accent/40 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="font-medium text-foreground">{booking.guestName}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Mail className="size-3" /> {booking.guestEmail || 'N/A'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <Phone className="size-3" /> {booking.guestPhone || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 font-medium tabular-nums">{booking.pax}</td>
                                            <td className="px-6 py-3.5 font-medium tabular-nums">{booking.totalPrice ?? 0}€</td>
                                            <td className="px-6 py-3.5 text-muted-foreground">
                                                {booking.createdAt
                                                    ? format(new Date(booking.createdAt), "dd MMM, HH:mm", { locale: es })
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label="Eliminar"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-display text-base font-medium tracking-tight">
                                Información del evento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailRow icon={PartyPopper} label="Nombre" value={event.name} />
                            <DetailRow
                                icon={CalendarIcon}
                                label="Fecha y hora"
                                value={format(new Date(event.date), "PPP 'a las' p", { locale: es })}
                            />
                            <DetailRow
                                icon={Euro}
                                label="Precio"
                                value={`${event.price ?? 0}€ / pax`}
                                strong
                            />

                            {(event.hotel || event.restaurant) && (
                                <div className="pt-4 border-t border-border/60 space-y-2">
                                    <p className="text-eyebrow mb-1">Vinculación</p>
                                    {event.hotel && (
                                        <div className="flex items-center gap-2 text-sm font-medium bg-muted/60 px-3 py-2 rounded-md">
                                            <Building2 className="size-3.5 text-muted-foreground" />
                                            Hotel: {event.hotel.name}
                                        </div>
                                    )}
                                    {event.restaurant && (
                                        <div className="flex items-center gap-2 text-sm font-medium bg-muted/60 px-3 py-2 rounded-md">
                                            <Utensils className="size-3.5 text-muted-foreground" />
                                            Restaurante: {event.restaurant.name}
                                        </div>
                                    )}
                                </div>
                            )}

                            {event.zones && event.zones.length > 0 && (
                                <div className="pt-4 border-t border-border/60">
                                    <p className="text-eyebrow mb-2">Áreas reservadas</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {event.zones.map(zone => (
                                            <span
                                                key={zone.id}
                                                className="text-[11px] font-medium px-2 py-0.5 bg-accent text-accent-foreground rounded uppercase tracking-wider"
                                            >
                                                {zone.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 border-t border-border/60">
                                <p className="text-eyebrow mb-2">Descripción</p>
                                <p className="text-sm text-muted-foreground leading-relaxed italic">
                                    {event.description || "Sin descripción proporcionada."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Button className="w-full" size="lg">
                        <Users className="size-4" /> Añadir reserva manual
                    </Button>
                </div>
            </div>
        </div>
    );
}

function DetailRow({
    icon: Icon,
    label,
    value,
    strong,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    strong?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary shrink-0">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-eyebrow">{label}</p>
                <p className={strong ? "font-display text-base font-medium" : "font-medium text-sm"}>{value}</p>
            </div>
        </div>
    );
}
