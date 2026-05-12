"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, MessageCircle, Phone, CheckCircle, XCircle, UserCircle, Edit2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ReservationListProps {
    bookings: any[];
    zones?: any[];
    onStatusChange: (id: string, status: string) => void;
    onAssignTable?: (bookingId: string, tableId: string) => void;
    onEdit: (booking: any) => void;
    onSelectProfile?: (booking: any) => void;
}

export default function ReservationList({ bookings, zones = [], onStatusChange, onAssignTable, onEdit, onSelectProfile }: ReservationListProps) {

    const statusColors: any = {
        NO_SHOW: "bg-red-100 text-red-800",
        CANCELLED: "bg-slate-100 text-slate-800",
        PENDING_CONFIRMATION: "bg-orange-100 text-orange-800",
        CONFIRMED: "bg-lime-100 text-lime-800 border border-lime-200",
        BAR_ARRIVAL: "bg-purple-100 text-purple-800",
        SEATED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        DESSERT: "bg-sky-100 text-sky-800",
        BILL_REQUESTED: "bg-blue-100 text-blue-800",
        CLEANING: "bg-lime-50 text-lime-700",
        RELEASED: "bg-yellow-100 text-yellow-800",
        TO_REVIEW: "bg-blue-100 text-blue-800 border border-blue-200"
    };

    const statusLabels: any = {
        NO_SHOW: "No Show",
        CANCELLED: "Cancelada",
        PENDING_CONFIRMATION: "Pendiente",
        CONFIRMED: "Confirmada",
        BAR_ARRIVAL: "En Barra",
        SEATED: "Sentada",
        DESSERT: "Postre",
        BILL_REQUESTED: "Cuenta",
        CLEANING: "Limpiar",
        RELEASED: "Liberada",
        TO_REVIEW: "A Revisar"
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
                                    {String(new Date(booking.date).getUTCHours()).padStart(2, '0')}:
                                    {String(new Date(booking.date).getUTCMinutes()).padStart(2, '0')}
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const table = booking.table || zones.flatMap(z => z.tables).find(t => t.id === booking.tableId);
                                        if (table) {
                                            return <Badge variant="outline">{table.name}</Badge>;
                                        }
                                        return <Badge variant="secondary" className="text-gray-500">Sin Mesa</Badge>;
                                    })()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold">{booking.guestName}</span>
                                            {booking.visitCount > 1 && (
                                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-[9px] h-4 px-1">
                                                    {booking.visitCount}v
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500">{booking.guestPhone}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-1">
                                        <span className="font-bold">{booking.pax}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn("uppercase text-[10px] whitespace-nowrap", statusColors[booking.status] || "bg-gray-100")}>
                                        {statusLabels[booking.status] || booking.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-gray-400 capitalize">{booking.source?.toLowerCase()}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {/* Status Flow Actions */}
                                        {booking.status === 'CONFIRMED' && (
                                            <>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-purple-50 text-purple-700 border-purple-200" onClick={() => onStatusChange(booking.id, 'BAR_ARRIVAL')}>
                                                    Barra
                                                </Button>
                                                <Button size="sm" variant="outline" className="h-7 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200" onClick={() => onStatusChange(booking.id, 'SEATED')}>
                                                    Sentar
                                                </Button>
                                            </>
                                        )}
                                        {booking.status === 'BAR_ARRIVAL' && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200" onClick={() => onStatusChange(booking.id, 'SEATED')}>
                                                Sentar
                                            </Button>
                                        )}
                                        {booking.status === 'SEATED' && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] bg-sky-50 text-sky-700 border-sky-200" onClick={() => onStatusChange(booking.id, 'DESSERT')}>
                                                Postre
                                            </Button>
                                        )}
                                        {booking.status === 'DESSERT' && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] bg-blue-50 text-blue-700 border-blue-200" onClick={() => onStatusChange(booking.id, 'BILL_REQUESTED')}>
                                                Cuenta
                                            </Button>
                                        )}
                                        {booking.status === 'BILL_REQUESTED' && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200" onClick={() => onStatusChange(booking.id, 'RELEASED')}>
                                                Liberar
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => onSelectProfile?.(booking)}>
                                                    <UserCircle className="w-4 h-4 mr-2" /> Ficha de Cliente
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => onEdit(booking)}>
                                                    <Edit2 className="w-4 h-4 mr-2" /> Editar Reserva
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-gray-400 uppercase">Mesa</div>
                                                {zones.map(zone => (
                                                    <div key={zone.id} className="border-t first:border-t-0">
                                                        {zone.tables.map((table: any) => (
                                                            <DropdownMenuItem 
                                                                key={table.id} 
                                                                onSelect={() => onAssignTable?.(booking.id, table.id)}
                                                                className={cn("text-xs pl-4", booking.tableId === table.id && "bg-gray-100 font-bold")}
                                                            >
                                                                {table.name} ({table.capacity}p)
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </div>
                                                ))}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600" onSelect={() => onStatusChange(booking.id, 'CANCELLED')}>
                                                    <XCircle className="w-4 h-4 mr-2" /> Cancelar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )))}
                </TableBody>
            </Table>
        </div>
    );
}
