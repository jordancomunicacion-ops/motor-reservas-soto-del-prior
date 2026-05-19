"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { PartyPopper, Calendar, Users, Euro, ArrowLeft, Mail, Phone, Trash2, Building2, Utensils } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EventBooking {
    id: string;
    guestName: string;
    guestEmail?: string | null;
    guestPhone?: string | null;
    pax: number;
    totalPrice?: number;
    status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
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
    const [showAddManual, setShowAddManual] = useState(false);
    const [manualForm, setManualForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', pax: 1 });
    const [savingManual, setSavingManual] = useState(false);

    useEffect(() => {
        if (params.id) {
            loadEvent();
        }
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

    async function handleCancelBooking(bookingId: string) {
        if (!event) return;
        if (!confirm('¿Cancelar esta reserva? El cliente liberará su plaza.')) return;
        try {
            await fetchAPI(`/event/${event.id}/bookings/${bookingId}`, { method: 'DELETE' });
            loadEvent();
        } catch (e) {
            console.error(e);
            alert('No se pudo cancelar la reserva.');
        }
    }

    async function handleAddManual() {
        if (!event) return;
        if (!manualForm.guestName.trim()) {
            alert('El nombre del cliente es obligatorio');
            return;
        }
        if (manualForm.pax < 1) {
            alert('El número de pax debe ser al menos 1');
            return;
        }
        setSavingManual(true);
        try {
            await fetchAPI(`/event/${event.id}/bookings`, {
                method: 'POST',
                body: JSON.stringify({
                    guestName: manualForm.guestName.trim(),
                    guestEmail: manualForm.guestEmail.trim() || undefined,
                    guestPhone: manualForm.guestPhone.trim() || undefined,
                    pax: manualForm.pax,
                }),
            });
            setManualForm({ guestName: '', guestEmail: '', guestPhone: '', pax: 1 });
            setShowAddManual(false);
            loadEvent();
        } catch (e: any) {
            const msg = typeof e?.message === 'string' ? e.message : 'No se pudo crear la reserva';
            alert(msg);
        } finally {
            setSavingManual(false);
        }
    }

    if (loading) return <div className="p-8">Cargando evento...</div>;
    if (!event) return <div className="p-8">Evento no encontrado</div>;

    const allBookings = event.bookings || [];
    const bookings = allBookings.filter(b => b.status !== 'CANCELLED');
    const totalPax = bookings.reduce((sum, b) => sum + b.pax, 0);

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{event.name}</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.date), "PPPP p", { locale: es })}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center">
                            <h2 className="font-bold flex items-center gap-2">
                                <Users className="w-5 h-5 text-purple-500" /> Reservas del Evento
                            </h2>
                            <span className="text-sm font-medium px-3 py-1 bg-purple-50 text-purple-700 rounded-full dark:bg-purple-900/30 dark:text-purple-300">
                                {totalPax} / {event.capacity} pax
                            </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-muted-foreground bg-gray-50 dark:bg-zinc-900/50">
                                    <tr>
                                        <th className="px-6 py-3">Cliente</th>
                                        <th className="px-6 py-3">Pax</th>
                                        <th className="px-6 py-3">Total</th>
                                        <th className="px-6 py-3">Fecha Reserva</th>
                                        <th className="px-6 py-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                                    {bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                                No hay reservas para este evento todavía.
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold">{booking.guestName}</div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                                        <Mail className="w-3 h-3" /> {booking.guestEmail || 'N/A'}
                                                        <Phone className="w-3 h-3 ml-2" /> {booking.guestPhone || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-medium">{booking.pax}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold">{booking.totalPrice}€</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {booking.createdAt ? format(new Date(booking.createdAt), "dd MMM, HH:mm", { locale: es }) : '—'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => handleCancelBooking(booking.id)}
                                                        title="Cancelar reserva"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                        <h2 className="font-bold mb-4">Información del Evento</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                    <PartyPopper className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Nombre</p>
                                    <p className="font-medium">{event.name}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Fecha y Hora</p>
                                    <p className="font-medium">{format(new Date(event.date), "PPP p", { locale: es })}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
                                    <Euro className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Precio</p>
                                    <p className="font-bold text-lg text-green-600">{event.price}€ / pax</p>
                                </div>
                            </div>

                            {(event.hotel || event.restaurant) && (
                                <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Vinculación</p>
                                    <div className="space-y-2">
                                        {event.hotel && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                                                <Building2 className="w-4 h-4" /> Hotel: {event.hotel.name}
                                            </div>
                                        )}
                                        {event.restaurant && (
                                            <div className="flex items-center gap-2 text-sm font-medium text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                                                <Utensils className="w-4 h-4" /> Restaurante: {event.restaurant.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {event.zones && event.zones.length > 0 && (
                                <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Áreas Reservadas</p>
                                    <div className="flex flex-wrap gap-2">
                                        {event.zones.map(zone => (
                                            <span key={zone.id} className="text-[10px] font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-700 rounded uppercase">
                                                {zone.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-700">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">Descripción</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                                    {event.description || "Sin descripción proporcionada."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full gap-2 bg-purple-600 hover:bg-purple-700 h-11 shadow-lg shadow-purple-500/20"
                        onClick={() => setShowAddManual(true)}
                    >
                        <Users className="w-4 h-4" /> Añadir Reserva Manual
                    </Button>
                </div>
            </div>

            {showAddManual && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddManual(false)}>
                    <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-500" /> Nueva reserva manual
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Nombre del cliente *</label>
                                <input
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                                    value={manualForm.guestName}
                                    onChange={e => setManualForm({ ...manualForm, guestName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Email</label>
                                <input
                                    type="email"
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                                    value={manualForm.guestEmail}
                                    onChange={e => setManualForm({ ...manualForm, guestEmail: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
                                <input
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                                    value={manualForm.guestPhone}
                                    onChange={e => setManualForm({ ...manualForm, guestPhone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground">Pax *</label>
                                <input
                                    type="number"
                                    min={1}
                                    className="border p-2 rounded w-full dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                                    value={manualForm.pax}
                                    onChange={e => setManualForm({ ...manualForm, pax: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowAddManual(false)} disabled={savingManual}>
                                Cancelar
                            </Button>
                            <Button
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={handleAddManual}
                                disabled={savingManual}
                            >
                                {savingManual ? 'Guardando...' : 'Crear reserva'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
