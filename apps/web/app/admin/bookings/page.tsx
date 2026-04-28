"use client";
import { useEffect, useState, Suspense } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSearchParams } from 'next/navigation';

function BookingsList() {
    const searchParams = useSearchParams();
    const contextType = searchParams.get('context') || 'hotel';
    const contextId = searchParams.get('id');
    
    const [bookings, setBookings] = useState<any[]>([]);
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
            const res = await fetchAPI(endpoint);
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
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    Listado de Reservas: {contextType === 'hotel' ? 'Hotel' : 'Restaurante'}
                </h1>
                <Button onClick={() => alert('Función disponible en próxima actualización')}>+ Nueva Reserva</Button>
            </div>

            {!contextId && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800 text-sm">
                    Por favor, selecciona un hotel o restaurante en el selector superior para ver sus reservas.
                </div>
            )}

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden border border-gray-100 dark:border-zinc-700">
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
                                <TableCell colSpan={5} className="text-center py-8">Cargando reservas...</TableCell>
                            </TableRow>
                        ) : bookings.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono text-xs">{b.referenceCode || b.id.split('-')[0]}</TableCell>
                                <TableCell className="font-medium">{b.guestName}</TableCell>
                                <TableCell>{new Date(b.checkInDate || b.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        b.status === 'CONFIRMED' || b.status === 'SEATED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {b.status}
                                    </span>
                                </TableCell>
                                <TableCell>{b.totalPrice ? `€${b.totalPrice}` : `${b.pax} Pax`}</TableCell>
                            </TableRow>
                        ))}
                        {bookings.length === 0 && !loading && contextId && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">No se encontraron reservas para este período</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

export default function BookingsPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <BookingsList />
        </Suspense>
    );
}
