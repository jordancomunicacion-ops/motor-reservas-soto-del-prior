"use client";
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [hotelId, setHotelId] = useState('');

    async function loadBookings() {
        if (!hotelId) return;
        try {
            const res = await fetchAPI(`/bookings/${hotelId}`);
            setBookings(res);
        } catch (e) { console.error(e); }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Listado de Reservas</h1>
                <Button onClick={() => alert('Función disponible en próxima actualización')}>+ Nueva Reserva</Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-800 text-sm mb-4">
                <div className="flex gap-2">
                    <input
                        className="border p-1 rounded w-64"
                        placeholder="Pegar ID del Hotel aquí..."
                        value={hotelId}
                        onChange={e => setHotelId(e.target.value)}
                    />
                    <Button size="sm" onClick={loadBookings}>Cargar Reservas</Button>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ref</TableHead>
                            <TableHead>Huésped</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Importe</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bookings.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell className="font-mono">{b.referenceCode}</TableCell>
                                <TableCell>{b.guestName}</TableCell>
                                <TableCell>{new Date(b.checkInDate).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                        {b.status}
                                    </span>
                                </TableCell>
                                <TableCell>€{b.totalPrice}</TableCell>
                            </TableRow>
                        ))}
                        {bookings.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">No se encontraron reservas</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
