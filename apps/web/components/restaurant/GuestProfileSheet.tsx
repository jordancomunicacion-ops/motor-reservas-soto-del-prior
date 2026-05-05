"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Calendar, Clock, Star, Utensils, MessageSquare, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface GuestProfileSheetProps {
    booking: any;
    isOpen: boolean;
    onClose: () => void;
}

export default function GuestProfileSheet({ booking, isOpen, onClose }: GuestProfileSheetProps) {
    if (!booking) return null;

    // Dummy data for Demo (would come from API in production)
    const stats = {
        totalVisits: booking.visitCount || 1,
        preferredTable: "Mesa 4 (Terraza)",
        topItems: ["Entrecot madurado", "Vino Ribera del Duero", "Tarta de queso"],
        emails: [
            { id: 1, type: "Confirmación", date: "2026-05-03", status: "opened", subject: "Reserva confirmada - Soto del Prior" },
            { id: 2, type: "Recordatorio", date: "2026-05-04", status: "clicked", subject: "Te esperamos mañana en Soto del Prior" }
        ]
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader className="border-b pb-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-stone-100 p-3 rounded-full">
                            <User className="w-6 h-6 text-stone-600" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold">{booking.guestName}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    {stats.totalVisits} visitas
                                </Badge>
                                <span className="text-xs text-stone-400">Cliente desde 2024</span>
                            </SheetDescription>
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
            </SheetContent>
        </Sheet>
    );
}
