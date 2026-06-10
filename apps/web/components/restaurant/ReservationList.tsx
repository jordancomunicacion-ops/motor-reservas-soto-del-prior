"use client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MoreHorizontal, XCircle, UserCircle, Edit2, Mail, MessageSquare, Utensils, Star, AlertTriangle, Clock, MapPin, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatTimeInTz } from "@/lib/timezone";

function formatRelativeTime(dateInput: string | Date): string {
    const date = new Date(dateInput);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "ahora mismo";
    if (diffMin < 60) return `hace ${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `hace ${diffD}d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function parseTags(tags: string | null | undefined): string[] {
    if (!tags) return [];
    try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return tags.split(',').map(t => t.trim()).filter(Boolean);
    }
}

import type { ZoneWithTables } from '@/types/restaurant';
import type { GuestBookingProfile } from './GuestProfileSheet';

// La lista necesita más campos que GuestBookingProfile (status, tableId, surname).
// La extendemos en lugar de duplicar.
export interface ListBooking extends GuestBookingProfile {
    status: string;
    tableId?: string | null;
    table?: { name?: string } | null;
}

interface ReservationListProps {
    bookings: ListBooking[];
    zones?: ZoneWithTables[];
    onStatusChange: (id: string, status: string) => void;
    onAssignTable?: (bookingId: string, tableId: string) => void;
    onEdit: (booking: ListBooking) => void;
    onSelectProfile?: (booking: ListBooking) => void;
    timezone?: string;
}

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';

const STATUS_TONE: Record<string, StatusTone> = {
    NO_SHOW: 'danger',
    CANCELLED: 'neutral',
    PENDING_CONFIRMATION: 'warning',
    CONFIRMED: 'success',
    BAR_ARRIVAL: 'accent',
    SEATED: 'success',
    DESSERT: 'info',
    BILL_REQUESTED: 'info',
    CLEANING: 'neutral',
    RELEASED: 'warning',
    FINISHED: 'neutral',
    TO_REVIEW: 'info',
};

const STATUS_LABELS: Record<string, string> = {
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
    FINISHED: "Finalizada",
    TO_REVIEW: "A Revisar",
};

// Estados que el backend acepta (enum ResBookingStatus de Prisma) y que tiene
// sentido fijar a mano desde el listado, ordenados según el flujo de servicio.
// PENDING se omite: es un estado transitorio previo al pago.
const MANUAL_STATUSES = [
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'BAR_ARRIVAL',
    'SEATED',
    'DESSERT',
    'BILL_REQUESTED',
    'CLEANING',
    'TO_REVIEW',
    'RELEASED',
    'FINISHED',
    'NO_SHOW',
    'CANCELLED',
];

export default function ReservationList({ bookings, zones = [], onStatusChange, onAssignTable, onEdit, onSelectProfile, timezone }: ReservationListProps) {
    return (
        <div className="bg-card rounded-md border border-border overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px]">Hora</TableHead>
                        <TableHead>Mesa</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="w-[60px]">Pax</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Comunicación</TableHead>
                        <TableHead className="whitespace-nowrap">Recibida</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                                No hay reservas para este turno.
                            </TableCell>
                        </TableRow>
                    ) : (
                        bookings.map((booking) => {
                            const fullName = [booking.guestName, booking.guestSurname2].filter(Boolean).join(' ');
                            const bookingTags = parseTags(booking.tags);
                            const hasAllergies = bookingTags.some(t => /alerg/i.test(t)) || /alerg|intoler/i.test(booking.notes || '');
                            const isVip = bookingTags.some(t => /vip/i.test(t));
                            return (
                            <TableRow key={booking.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium tabular-nums">
                                    {booking.date ? formatTimeInTz(booking.date, timezone, '—') : '—'}
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const table = booking.table || zones.flatMap(z => z.tables).find(t => t.id === booking.tableId);
                                        if (table) {
                                            return <Badge variant="outline">{table.name}</Badge>;
                                        }
                                        return <Badge variant="secondary" className="text-muted-foreground">Sin Mesa</Badge>;
                                    })()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            <span className="font-medium text-foreground">{fullName}</span>
                                            {(booking.visitCount ?? 0) > 1 && (
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                                    {booking.visitCount}v
                                                </Badge>
                                            )}
                                            {isVip && (
                                                <StatusBadge tone="accent" dot={false} className="text-[9px] h-4 px-1 gap-0.5 py-0">
                                                    <Star className="size-2.5" /> VIP
                                                </StatusBadge>
                                            )}
                                            {hasAllergies && (
                                                <StatusBadge tone="danger" dot={false} className="text-[9px] h-4 px-1 gap-0.5 py-0" title="Tiene alergias o intolerancias">
                                                    <AlertTriangle className="size-2.5" /> Alergias
                                                </StatusBadge>
                                            )}
                                            {booking.isMealPlan && (
                                                <StatusBadge tone="accent" dot={false} className="text-[9px] h-4 px-1 gap-0.5 py-0" title="Reserva en media pensión / pensión completa">
                                                    <Utensils className="size-2.5" /> MP
                                                </StatusBadge>
                                            )}
                                            {booking.review && (() => {
                                                const avg = (booking.review.serviceScore + booking.review.ambianceScore + booking.review.foodScore) / 3;
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onSelectProfile?.(booking); }}
                                                        title={`Atención ${booking.review.serviceScore}/5 · Entorno ${booking.review.ambianceScore}/5 · Comida ${booking.review.foodScore}/5${booking.review.advice ? `\n"${booking.review.advice}"` : ''}`}
                                                        className="inline-flex items-center gap-0.5 bg-primary/10 text-primary border border-primary/20 text-[9px] h-4 px-1 rounded hover:bg-primary/15 transition-colors"
                                                    >
                                                        <Star className="size-2.5 fill-current" /> {avg.toFixed(1)}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex flex-col gap-0">
                                            {booking.guestPhone && <span className="text-xs text-muted-foreground">{booking.guestPhone}</span>}
                                            {booking.guestEmail && <span className="text-[10px] text-muted-foreground/80 truncate max-w-[180px]">{booking.guestEmail}</span>}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-1">
                                        <span className="font-medium tabular-nums">{booking.pax}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge tone={STATUS_TONE[booking.status] || 'neutral'} dot={false} className="uppercase text-[10px] whitespace-nowrap">
                                        {STATUS_LABELS[booking.status] || booking.status}
                                    </StatusBadge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-muted-foreground capitalize">{(booking.origin || booking.source || '').toLowerCase()}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1">
                                        <span title={booking.emailSent ? 'Email enviado' : 'Email pendiente'}>
                                            <Mail className={cn("size-3.5", booking.emailSent ? "text-success" : "text-muted-foreground/40")} />
                                        </span>
                                        <span title={booking.smsSent ? 'SMS enviado' : 'SMS no enviado'}>
                                            <MessageSquare className={cn("size-3.5", booking.smsSent ? "text-success" : "text-muted-foreground/40")} />
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span
                                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap"
                                        title={booking.createdAt ? `Reserva creada: ${new Date(booking.createdAt).toLocaleString('es-ES')}` : 'Reserva sin fecha de creación'}
                                    >
                                        <Clock className="size-3" />
                                        {booking.createdAt ? formatRelativeTime(booking.createdAt) : '—'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {/* Status Flow Actions */}
                                        {(booking.status === 'PENDING' || booking.status === 'PENDING_CONFIRMATION') && (
                                            <Button size="sm" variant="success" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'CONFIRMED')}>
                                                Confirmar
                                            </Button>
                                        )}
                                        {booking.status === 'CONFIRMED' && (
                                            <>
                                                <Button size="sm" variant="tonal" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'BAR_ARRIVAL')}>
                                                    Barra
                                                </Button>
                                                <Button size="sm" variant="success" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'SEATED')}>
                                                    Sentar
                                                </Button>
                                            </>
                                        )}
                                        {booking.status === 'BAR_ARRIVAL' && (
                                            <Button size="sm" variant="success" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'SEATED')}>
                                                Sentar
                                            </Button>
                                        )}
                                        {booking.status === 'SEATED' && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'DESSERT')}>
                                                Postre
                                            </Button>
                                        )}
                                        {booking.status === 'DESSERT' && (
                                            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'BILL_REQUESTED')}>
                                                Cuenta
                                            </Button>
                                        )}
                                        {booking.status === 'BILL_REQUESTED' && (
                                            <Button size="sm" variant="warning" className="h-7 text-[10px]" onClick={() => onStatusChange(booking.id, 'RELEASED')}>
                                                Liberar
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon-sm" variant="ghost" aria-label="Más acciones">
                                                    <MoreHorizontal className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="end"
                                                sideOffset={4}
                                                collisionPadding={12}
                                                className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto overflow-x-hidden"
                                            >
                                                <DropdownMenuItem onSelect={() => onSelectProfile?.(booking)}>
                                                    <UserCircle className="size-4 mr-2" /> Ficha de Cliente
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => onEdit(booking)}>
                                                    <Edit2 className="size-4 mr-2" /> Editar Reserva
                                                </DropdownMenuItem>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <RefreshCw className="size-4 mr-2" /> Cambiar Estado
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent
                                                        sideOffset={4}
                                                        collisionPadding={12}
                                                        className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto overflow-x-hidden min-w-[160px]"
                                                    >
                                                        {MANUAL_STATUSES.map((status) => (
                                                            <DropdownMenuItem
                                                                key={status}
                                                                onSelect={() => onStatusChange(booking.id, status)}
                                                                className={cn("text-xs", booking.status === status && "bg-muted font-medium")}
                                                            >
                                                                <StatusBadge tone={STATUS_TONE[status] || 'neutral'} dot className="uppercase text-[10px]">
                                                                    {STATUS_LABELS[status] || status}
                                                                </StatusBadge>
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <MapPin className="size-4 mr-2" /> Cambiar Mesa
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent
                                                        sideOffset={4}
                                                        collisionPadding={12}
                                                        className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto overflow-x-hidden min-w-[180px]"
                                                    >
                                                        {zones.length === 0 ? (
                                                            <div className="px-2 py-1.5 text-xs text-muted-foreground">No hay mesas configuradas</div>
                                                        ) : (
                                                            zones.map((zone, zIdx) => (
                                                                <div key={zone.id}>
                                                                    {zIdx > 0 && <DropdownMenuSeparator />}
                                                                    <DropdownMenuLabel className="text-eyebrow py-1">
                                                                        {zone.name}
                                                                    </DropdownMenuLabel>
                                                                    {zone.tables.map((table) => (
                                                                        <DropdownMenuItem
                                                                            key={table.id}
                                                                            onSelect={() => onAssignTable?.(booking.id, table.id)}
                                                                            className={cn("text-xs pl-4", booking.tableId === table.id && "bg-muted font-medium")}
                                                                        >
                                                                            {table.name} ({table.capacity}p)
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </div>
                                                            ))
                                                        )}
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => onStatusChange(booking.id, 'CANCELLED')}>
                                                    <XCircle className="size-4 mr-2" /> Cancelar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                        }))}
                </TableBody>
            </Table>
        </div>
    );
}
