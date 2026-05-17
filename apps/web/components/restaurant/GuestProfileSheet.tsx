"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    User, Mail, Phone, MessageSquare, MessageCircle,
    Star, CheckCircle2, AlertTriangle, ExternalLink,
    Cake, Users as UsersIcon, Calendar, CreditCard,
    Instagram, Facebook, Linkedin, Hotel, Utensils, Clock, Globe,
    MoreVertical, Settings, UserMinus,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface GuestBookingProfile {
    id: string;
    guestName?: string;
    guestSurname2?: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    guestWhatsapp?: string | null;
    guestAge?: number | null;
    guestGender?: 'M' | 'F' | string | null;
    instagram?: string | null;
    facebook?: string | null;
    tiktok?: string | null;
    linkedin?: string | null;
    xTwitter?: string | null;
    date?: string | Date;
    pax?: number;
    duration?: number;
    origin?: string;
    createdAt?: string | Date;
    isMealPlan?: boolean;
    hotelBookingId?: string | null;
    stripePaymentMethodId?: string | null;
    emailSent?: boolean;
    smsSent?: boolean;
    notes?: string | null;
    tags?: string | null;
    visitCount?: number;
    source?: string;
    preferredTable?: string | null;
    topItems?: string[];
    emails?: Array<{ id: string; type?: string; subject?: string; sentAt?: string; date?: string; status?: string }>;
    guestStats?: {
        visitCount: number;
        firstVisit: string | null;
        cancelledCount: number;
        totalBookings: number;
        cancellationRate: number;
    };
}

interface GuestProfileSheetProps {
    booking: GuestBookingProfile | null;
    isOpen: boolean;
    onClose: () => void;
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

function fmtDate(date: string | Date | null | undefined, withTime = false): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-ES', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
    });
}

const originLabels: Record<string, string> = {
    WIDGET: 'Widget web',
    WEB: 'Web',
    MANUAL: 'Manual',
    PHONE: 'Teléfono',
    WALK_IN: 'Walk-in',
    GOOGLE: 'Google',
    THEFORK: 'TheFork',
    RESY: 'Resy',
};

export default function GuestProfileSheet({ booking, isOpen, onClose }: GuestProfileSheetProps) {
    const guestStats = booking?.guestStats || {
        visitCount: booking?.visitCount || 1,
        firstVisit: null,
        cancelledCount: 0,
        totalBookings: booking?.visitCount || 1,
        cancellationRate: 0
    };

    if (!booking) return null;

    const fullName = [booking.guestName, booking.guestSurname2].filter(Boolean).join(' ');
    const tags = parseTags(booking.tags);
    const isVip = tags.some(t => /vip/i.test(t));
    const hasAllergies = tags.some(t => /alerg/i.test(t)) || /alerg|intoler/i.test(booking.notes || '');
    const firstVisitYear = guestStats.firstVisit ? new Date(guestStats.firstVisit).getFullYear() : null;

    type SocialNetwork = {
        key: string;
        label: string;
        Icon: typeof Instagram;
        value: string | null | undefined;
        baseUrl: string;
    };
    const socialNetworks: Array<Omit<SocialNetwork, 'value'> & { value: string }> = ([
        { key: 'instagram', label: 'Instagram', Icon: Instagram, value: booking.instagram, baseUrl: 'https://instagram.com/' },
        { key: 'facebook', label: 'Facebook', Icon: Facebook, value: booking.facebook, baseUrl: 'https://facebook.com/' },
        { key: 'tiktok', label: 'TikTok', Icon: Globe, value: booking.tiktok, baseUrl: 'https://tiktok.com/@' },
        { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin, value: booking.linkedin, baseUrl: 'https://linkedin.com/in/' },
        { key: 'xTwitter', label: 'X/Twitter', Icon: Globe, value: booking.xTwitter, baseUrl: 'https://x.com/' },
    ] as SocialNetwork[]).filter((s): s is Omit<SocialNetwork, 'value'> & { value: string } => typeof s.value === 'string' && s.value.length > 0);

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="sm:max-w-md overflow-y-auto">
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
                                    <Star className="w-4 h-4 mr-2 text-amber-500" /> Marcar como VIP
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
                        <div className="flex-1">
                            <SheetTitle className="text-xl font-bold">{fullName || 'Sin nombre'}</SheetTitle>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                {guestStats.visitCount > 0 && (
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                        {guestStats.visitCount} {guestStats.visitCount === 1 ? 'visita' : 'visitas'}
                                    </Badge>
                                )}
                                {isVip && (
                                    <Badge className="bg-amber-100 text-amber-800 border border-amber-200 gap-0.5">
                                        <Star className="w-3 h-3" /> VIP
                                    </Badge>
                                )}
                                {hasAllergies && (
                                    <Badge className="bg-red-100 text-red-800 border border-red-200 gap-0.5">
                                        <AlertTriangle className="w-3 h-3" /> Alergias
                                    </Badge>
                                )}
                                {guestStats.cancellationRate > 0 && (
                                    <Badge variant="outline" className={cn(
                                        "text-[10px] px-1.5 h-5",
                                        guestStats.cancellationRate > 20 ? "text-red-600 border-red-200 bg-red-50" : "text-amber-600 border-amber-200 bg-amber-50"
                                    )}>
                                        {guestStats.cancellationRate}% Cancelación
                                    </Badge>
                                )}
                                {firstVisitYear && (
                                    <span className="text-xs text-stone-400">Cliente desde {firstVisitYear}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Contacto</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-lg">
                                <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                                <span className="text-sm truncate">{booking.guestEmail || <span className="text-stone-400 italic">Sin email</span>}</span>
                            </div>
                            <div className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-lg">
                                <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                                <span className="text-sm">{booking.guestPhone || <span className="text-stone-400 italic">Sin teléfono</span>}</span>
                            </div>
                            {booking.guestWhatsapp && (
                                <a
                                    href={`https://wa.me/${booking.guestWhatsapp.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-2.5 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-lg"
                                >
                                    <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-sm flex-1">{booking.guestWhatsapp}</span>
                                    <ExternalLink className="w-3 h-3 text-emerald-600" />
                                </a>
                            )}
                        </div>
                    </section>

                    {(booking.guestAge || booking.guestGender) && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Datos personales</h3>
                            <div className="flex flex-wrap gap-2">
                                {booking.guestAge && (
                                    <Badge variant="outline" className="gap-1">
                                        <Cake className="w-3 h-3" /> {booking.guestAge} años
                                    </Badge>
                                )}
                                {booking.guestGender && (
                                    <Badge variant="outline" className="gap-1">
                                        <UsersIcon className="w-3 h-3" />
                                        {booking.guestGender === 'M' ? 'Hombre' : booking.guestGender === 'F' ? 'Mujer' : booking.guestGender}
                                    </Badge>
                                )}
                            </div>
                        </section>
                    )}

                    {socialNetworks.length > 0 && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Redes sociales</h3>
                            <div className="space-y-1.5">
                                {socialNetworks.map(({ key, label, Icon, value, baseUrl }) => {
                                    const url = value.startsWith('http') ? value : `${baseUrl}${value.replace(/^@/, '')}`;
                                    return (
                                        <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 bg-stone-50 hover:bg-stone-100 transition-colors rounded text-sm">
                                            <Icon className="w-3.5 h-3.5 text-stone-500" />
                                            <span className="text-stone-700 font-medium">{label}:</span>
                                            <span className="text-stone-600 flex-1 truncate">{value}</span>
                                            <ExternalLink className="w-3 h-3 text-stone-400" />
                                        </a>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Esta reserva</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-stone-50 rounded">
                                <span className="text-stone-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Fecha y hora</span>
                                <span className="font-medium">{fmtDate(booking.date, true)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-stone-50 rounded">
                                <span className="text-stone-500 flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" /> Comensales</span>
                                <span className="font-medium">{booking.pax}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-stone-50 rounded">
                                <span className="text-stone-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Duración</span>
                                <span className="font-medium">{booking.duration || 90} min</span>
                            </div>
                            <div className="flex justify-between p-2 bg-stone-50 rounded">
                                <span className="text-stone-500 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Origen</span>
                                <span className="font-medium">{(booking.origin && originLabels[booking.origin]) || booking.origin || '—'}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-stone-50 rounded">
                                <span className="text-stone-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Recibida</span>
                                <span className="font-medium">{fmtDate(booking.createdAt, true)}</span>
                            </div>
                            {booking.isMealPlan && (
                                <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded">
                                    <Utensils className="w-4 h-4 text-indigo-600" />
                                    <span className="text-indigo-800 text-xs font-semibold">Reserva en media pensión / pensión completa</span>
                                </div>
                            )}
                            {booking.hotelBookingId && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded">
                                    <Hotel className="w-4 h-4 text-blue-600" />
                                    <span className="text-blue-800 text-xs font-semibold">Asociada a estancia de hotel</span>
                                </div>
                            )}
                            {booking.stripePaymentMethodId && (
                                <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-100 rounded">
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                    <span className="text-emerald-800 text-xs font-semibold">Tarjeta de garantía registrada</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Notificaciones enviadas</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className={cn(
                                "p-3 rounded-lg border flex items-center gap-2",
                                booking.emailSent ? "bg-emerald-50 border-emerald-200" : "bg-stone-50 border-stone-200"
                            )}>
                                <Mail className={cn("w-4 h-4", booking.emailSent ? "text-emerald-600" : "text-stone-400")} />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-stone-500">Email</p>
                                    <p className={cn("text-xs font-semibold", booking.emailSent ? "text-emerald-700" : "text-stone-500")}>
                                        {booking.emailSent ? 'Enviado' : 'Pendiente'}
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "p-3 rounded-lg border flex items-center gap-2",
                                booking.smsSent ? "bg-emerald-50 border-emerald-200" : "bg-stone-50 border-stone-200"
                            )}>
                                <MessageSquare className={cn("w-4 h-4", booking.smsSent ? "text-emerald-600" : "text-stone-400")} />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-stone-500">SMS</p>
                                    <p className={cn("text-xs font-semibold", booking.smsSent ? "text-emerald-700" : "text-stone-500")}>
                                        {booking.smsSent ? 'Enviado' : 'No enviado'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {tags.length > 0 && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Etiquetas</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag, i) => (
                                    <Badge key={i} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Historial</h3>
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
                        {guestStats.firstVisit && (
                            <p className="text-[10px] text-stone-400 mt-2 text-center">
                                Primera visita: {fmtDate(guestStats.firstVisit)}
                            </p>
                        )}
                    </section>

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Notas</h3>
                        <div className={cn(
                            "p-3 rounded-lg flex gap-2 text-sm",
                            booking.notes ? "bg-amber-50 border border-amber-100 text-amber-900" : "bg-stone-50 border border-stone-100 text-stone-500"
                        )}>
                            <MessageSquare className={cn("w-4 h-4 shrink-0 mt-0.5", booking.notes ? "text-amber-500" : "text-stone-400")} />
                            <p>{booking.notes || 'Sin notas para esta reserva.'}</p>
                        </div>
                    </section>

                    {(booking.preferredTable || (booking.topItems && booking.topItems.length > 0)) && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                                Hábitos (TPV)
                                <Badge variant="outline" className="ml-2 text-[9px]">Beta</Badge>
                            </h3>
                            <div className="space-y-3">
                                {booking.preferredTable && (
                                    <div className="flex items-start gap-3">
                                        <div className="bg-emerald-50 p-2 rounded-md">
                                            <Star className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-stone-500">Mesa preferida</p>
                                            <p className="text-sm font-semibold">{booking.preferredTable}</p>
                                        </div>
                                    </div>
                                )}
                                {booking.topItems && booking.topItems.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-50 p-2 rounded-md">
                                            <Utensils className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-stone-500 mb-2">Top consumos</p>
                                            <div className="space-y-1.5">
                                                {booking.topItems.slice(0, 3).map((item: string, i: number) => (
                                                    <div key={i} className="flex items-center justify-between bg-stone-50 px-3 py-1.5 rounded text-sm">
                                                        <span>{item}</span>
                                                        <Badge variant="outline" className="text-[10px] h-4">TOP {i + 1}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {booking.emails && booking.emails.length > 0 && (
                        <section>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Comunicaciones</h3>
                            <div className="border rounded-lg divide-y">
                                {booking.emails.map((email) => (
                                    <div key={email.id} className="p-3 flex items-center justify-between hover:bg-stone-50 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{email.type}</span>
                                            <span className="text-[10px] text-stone-400">{fmtDate(email.date)}</span>
                                        </div>
                                        {email.status === 'opened' && (
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Abierto
                                            </Badge>
                                        )}
                                        {email.status === 'clicked' && (
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1">
                                                <ExternalLink className="w-3 h-3" /> Clicked
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
