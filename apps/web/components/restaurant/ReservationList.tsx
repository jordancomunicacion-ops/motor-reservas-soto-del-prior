"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, MessageCircle, Phone, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReservationListProps {
    bookings: any[];
    onStatusChange: (id: string, status: string) => void;
    onEdit: (booking: any) => void;
}

export default function ReservationList({ bookings, onStatusChange, onEdit }: ReservationListProps) {

    const statusColors: any = {
        CONFIRMED: "bg-green-100 text-green-800",
        PENDING: "bg-yellow-100 text-yellow-800",
        CANCELLED: "bg-red-100 text-red-800",
        SEATED: "bg-blue-100 text-blue-800",
        FINISHED: "bg-gray-100 text-gray-800"
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Pax</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                No hay reservas para este turno.
                            </TableCell>
                        </TableRow>
                    ) : (
                        bookings.map((booking) => (
                            <TableRow key={booking.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium">
                                    {format(new Date(booking.date), 'HH:mm')}
                                </TableCell>
                                <TableCell>
                                    {booking.table ? (
                                        <Badge variant="outline">{booking.table.name}</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-gray-500">Sin Mesa</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{booking.guestName}</span>
                                        <span className="text-xs text-gray-500">{booking.guestPhone}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-1">
                                        <span className="font-bold">{booking.pax}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn("uppercase text-[10px]", statusColors[booking.status] || "bg-gray-100")}>
                                        {booking.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-gray-400 capitalize">{booking.source?.toLowerCase()}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {booking.status === 'CONFIRMED' && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" title="Sentar" onClick={() => onStatusChange(booking.id, 'SEATED')}>
                                                <CheckCircle className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {booking.status === 'SEATED' && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-600" title="Finalizar" onClick={() => onStatusChange(booking.id, 'FINISHED')}>
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(booking)}>
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )))}
                </TableBody>
            </Table>
        </div>
    );
}
