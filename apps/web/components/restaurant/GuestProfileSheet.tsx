"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Calendar, Clock, Star, Utensils, MessageSquare, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Settings, UserMinus, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestProfileSheetProps {
    booking: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function GuestProfileSheet({ booking, isOpen, onClose }: GuestProfileSheetProps) {
    // Dummy data for Demo (would come from API in production)
    const guestStats = booking?.guestStats || { 
        visitCount: booking?.visitCount || 1, 
        firstVisit: null, 
        cancelledCount: 0, 
        totalBookings: booking?.visitCount || 1, 
        cancellationRate: 0 
    };

    const stats = {
        preferredTable: "Mesa 4 (Terraza)",
        topItems: ["Entrecot madurado", "Vino Ribera del Duero", "Tarta de queso"],
        emails: [
            { id: 1, type: "Confirmación", date: "2026-05-03", status: "opened", subject: "Reserva confirmada - Soto del Prior" },
            { id: 2, type: "Recordatorio", date: "2026-05-04", status: "clicked", subject: "Te esperamos mañana en Soto del Prior" }
        ]
    };

    const firstVisitYear = guestStats.firstVisit ? new Date(guestStats.firstVisit).getFullYear() : '2024';

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange => !onOpenChange && onClose()}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                {booking && (
                    <>
                        <SheetHeader className="border-b pb-4 mb-6 relative">
                            <div className="absolute right-8 top-0">
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Settings className="w-4 h-4 mr-2" /> Editar Perfil
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Badge variant="outline" className="mr-2">VIP</Badge> Marcar como VIP
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">
                                            <UserMinus className="w-4 h-4 mr-2" /> Bloquear Cliente
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-stone-100 p-3 rounded-full">
                                    <User className="w-6 h-6 text-stone-600" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-bold">{booking.guestName}</SheetTitle>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                            {guestStats.visitCount} visitas
                                        </Badge>
                                        {guestStats.cancellationRate > 0 && (
                                            <Badge variant="outline" className={cn(
                                                "text-[10px] px-1.5 h-5",
                                                guestStats.cancellationRate > 20 ? "text-red-600 border-red-200 bg-red-50" : "text-amber-600 border-amber-200 bg-amber-50"
                                            )}>
                                                {guestStats.cancellationRate}% Cancelación
                                            </Badge>
                                        )}
                                        <span className="text-xs text-stone-400">Cliente desde {firstVisitYear}</span>
                                    </div>
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="space-y-8">
                            {/* Contact Info */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Información de Contacto</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                                        <Mail className="w-4 h-4 text-stone-400" />
                                        <span className="text-sm">{booking.guestEmail || 'Sin email'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-lg">
                                        <Phone className="w-4 h-4 text-stone-400" />
                                        <span className="text-sm">{booking.guestPhone || 'Sin teléfono'}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Preferences (TPV Data) */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Hábitos y Preferencias (TPV)</h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-emerald-50 p-2 rounded-md">
                                            <Star className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-500">Mesa preferida</p>
                                            <p className="text-sm font-semibold">{stats.preferredTable}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-md">
                                            <Utensils className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-stone-500 mb-2">Top 3 Consumos</p>
                                            <div className="space-y-1.5">
                                                {stats.topItems.map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-stone-50 px-3 py-1.5 rounded text-sm">
                                                        <span>{item}</span>
                                                        <Badge variant="outline" className="text-[10px] h-4">TOP {i + 1}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Booking History Summary */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Historial de Reservas</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-stone-50 p-3 rounded-lg text-center border border-stone-100">
                                        <p className="text-[10px] text-stone-500 uppercase font-bold">Total</p>
                                        <p className="text-lg font-bold">{guestStats.totalBookings}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-3 rounded-lg text-center border border-emerald-100">
                                        <p className="text-[10px] text-emerald-600 uppercase font-bold">Visitas</p>
                                        <p className="text-lg font-bold text-emerald-700">{guestStats.visitCount}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                                        <p className="text-[10px] text-red-600 uppercase font-bold">Canc.</p>
                                        <p className="text-lg font-bold text-red-700">{guestStats.cancelledCount}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Email Tracking */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Comunicaciones y Tracking</h3>
                                <div className="border rounded-lg divide-y">
                                    {stats.emails.map((email) => (
                                        <div key={email.id} className="p-3 flex items-center justify-between hover:bg-stone-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{email.type}</span>
                                                <span className="text-[10px] text-stone-400">{email.date}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1">
                                                    {email.status === 'opened' ? (
                                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Abierto
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1">
                                                            <ExternalLink className="w-3 h-3" /> Clicked
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Booking Notes */}
                            <section>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Notas de Sala</h3>
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex gap-3">
                                    <MessageSquare className="w-5 h-5 text-amber-500 shrink-0" />
                                    <p className="text-sm text-amber-900">
                                        {booking.notes || 'No hay notas internas para este cliente.'}
                                    </p>
                                </div>
                            </section>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
