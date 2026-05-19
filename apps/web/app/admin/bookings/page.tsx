"use client";
import { useEffect, useState, Suspense } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Forma unificada que combina hotel-booking y restaurant-booking. Solo los
// campos que esta lista lee.
interface BookingRow {
    id: string;
    referenceCode?: string;
    guestName?: string;
    checkInDate?: string;
    date?: string;
    status: string;
    totalPrice?: number;
    pax?: number;
}

function BookingsList() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');

    const [bookings, setBookings] = useState<BookingRow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (contextId) {
            loadBookings();
        } else {
            setBookings([]);
        }
    }, [contextId, contextType]);

    async function loadBookings() {
        setLoading(true);
        try {
            const endpoint = contextType === 'hotel'
                ? `/bookings/${contextId}`
                : `/restaurant/${contextId}/bookings?date=${new Date().toISOString().split('T')[0]}`;
            const res = await fetchAPI<BookingRow[]>(endpoint);
            setBookings(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error(e);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Operativa"
                title={`Listado de reservas · ${contextType === 'hotel' ? 'Hotel' : 'Restaurante'}`}
                description="Consulta todas las reservas del centro seleccionado."
                actions={<Button onClick={() => alert('Función disponible en próxima actualización')}>+ Nueva Reserva</Button>}
            />

            {!contextId && (
                <Card className="border-warning/30 bg-warning/10">
                    <CardContent className="flex items-start gap-3 text-sm text-warning-foreground">
                        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                        <span>Por favor, selecciona un hotel o restaurante en el selector superior para ver sus reservas.</span>
                    </CardContent>
                </Card>
            )}

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ref / ID</TableHead>
                            <TableHead>Huésped</TableHead>
                            <TableHead>Fecha / Entrada</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Pax / Importe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-4">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : bookings.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono text-xs">{b.referenceCode || b.id.split('-')[0]}</TableCell>
                                <TableCell className="font-medium">{b.guestName}</TableCell>
                                <TableCell>{(b.checkInDate || b.date) ? new Date(b.checkInDate || b.date!).toLocaleDateString() : '—'}</TableCell>
                                <TableCell>
                                    <StatusBadge tone={b.status === 'CONFIRMED' || b.status === 'SEATED' ? 'success' : 'info'}>
                                        {b.status}
                                    </StatusBadge>
                                </TableCell>
                                <TableCell>{b.totalPrice ? `€${b.totalPrice}` : `${b.pax} Pax`}</TableCell>
                            </TableRow>
                        ))}
                        {bookings.length === 0 && !loading && contextId && (
                            <TableRow>
                                <TableCell colSpan={5} className="p-0">
                                    <EmptyState
                                        icon={Inbox}
                                        title="Sin reservas"
                                        description="No se encontraron reservas para este período."
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

export default function BookingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando...</div>}>
            <BookingsList />
        </Suspense>
    );
}
