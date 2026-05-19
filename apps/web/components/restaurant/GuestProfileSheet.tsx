"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
    User, Mail, Phone, MessageSquare, MessageCircle,
    Star, CheckCircle2, AlertTriangle, ExternalLink,
    Cake, Users as UsersIcon, Calendar, CreditCard,
    Instagram, Facebook, Linkedin, Hotel, Utensils, Clock, Globe,
    MoreVertical, Settings, UserMinus,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Stars } from "@/components/admin/ReviewsPanel";

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
        cancelledOrNoShowRate: number;
    };
    review?: {
        serviceScore: number;
        ambianceScore: number;
        foodScore: number;
        advice: string | null;
        redirectedToGoogle?: boolean;
        createdAt: string | Date;
    } | null;
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
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
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
        cancelledOrNoShowRate: 0,
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
            <SheetContent className="sm:max-w-md overflow-y-auto p-6">
                <SheetHeader className="border-b border-border/60 pb-4 mb-6 relative px-0">
                    <div className="absolute right-0 top-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                                    <MoreVertical className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <Settings className="size-4 mr-2" /> Editar perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Star className="size-4 mr-2 text-primary" /> Marcar como VIP
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <UserMinus className="size-4 mr-2" /> Bloquear cliente
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 pr-10 text-left">
                        <div className="grid place-items-center size-11 rounded-full bg-muted text-muted-foreground shrink-0">
                            <User className="size-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="font-display text-xl font-medium tracking-tight truncate">
                                {fullName || 'Sin nombre'}
                            </SheetTitle>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {guestStats.visitCount > 0 && (
                                    <StatusBadge tone="accent" dot={false}>
                                        {guestStats.visitCount} {guestStats.visitCount === 1 ? 'visita' : 'visitas'}
                                    </StatusBadge>
                                )}
                                {isVip && (
                                    <StatusBadge tone="accent" dot={false} className="gap-1">
                                        <Star className="size-3 fill-current" /> VIP
                                    </StatusBadge>
                                )}
                                {hasAllergies && (
                                    <StatusBadge tone="danger" dot={false} className="gap-1">
                                        <AlertTriangle className="size-3" /> Alergias
                                    </StatusBadge>
                                )}
                                {guestStats.cancelledOrNoShowRate > 0 && (
                                    <StatusBadge
                                        tone={guestStats.cancelledOrNoShowRate > 20 ? 'danger' : 'warning'}
                                        dot={false}
                                    >
                                        {guestStats.cancelledOrNoShowRate}% canc./no-show
                                    </StatusBadge>
                                )}
                                {firstVisitYear && (
                                    <span className="text-xs text-muted-foreground">
                                        Cliente desde {firstVisitYear}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                <div className="space-y-6">
                    <Section title="Contacto">
                        <ContactRow icon={Mail} value={booking.guestEmail} placeholder="Sin email" />
                        <ContactRow icon={Phone} value={booking.guestPhone} placeholder="Sin teléfono" />
                        {booking.guestWhatsapp && (
                            <a
                                href={`https://wa.me/${booking.guestWhatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2.5 bg-success/10 hover:bg-success/15 transition-colors rounded-md text-success"
                            >
                                <MessageCircle className="size-4 shrink-0" />
                                <span className="text-sm flex-1">{booking.guestWhatsapp}</span>
                                <ExternalLink className="size-3" />
                            </a>
                        )}
                    </Section>

                    {(booking.guestAge || booking.guestGender) && (
                        <Section title="Datos personales">
                            <div className="flex flex-wrap gap-1.5">
                                {booking.guestAge && (
                                    <StatusBadge tone="neutral" dot={false} className="gap-1">
                                        <Cake className="size-3" /> {booking.guestAge} años
                                    </StatusBadge>
                                )}
                                {booking.guestGender && (
                                    <StatusBadge tone="neutral" dot={false} className="gap-1">
                                        <UsersIcon className="size-3" />
                                        {booking.guestGender === 'M' ? 'Hombre' : booking.guestGender === 'F' ? 'Mujer' : booking.guestGender}
                                    </StatusBadge>
                                )}
                            </div>
                        </Section>
                    )}

                    {socialNetworks.length > 0 && (
                        <Section title="Redes sociales">
                            <div className="space-y-1.5">
                                {socialNetworks.map(({ key, label, Icon, value, baseUrl }) => {
                                    const url = value.startsWith('http') ? value : `${baseUrl}${value.replace(/^@/, '')}`;
                                    return (
                                        <a
                                            key={key}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 bg-muted/40 hover:bg-accent/60 transition-colors rounded text-sm"
                                        >
                                            <Icon className="size-3.5 text-muted-foreground" />
                                            <span className="font-medium text-foreground">{label}:</span>
                                            <span className="text-muted-foreground flex-1 truncate">{value}</span>
                                            <ExternalLink className="size-3 text-muted-foreground" />
                                        </a>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    <Section title="Esta reserva">
                        <div className="space-y-1.5 text-sm">
                            <DataRow icon={Calendar} label="Fecha y hora" value={fmtDate(booking.date, true)} />
                            <DataRow icon={UsersIcon} label="Comensales" value={String(booking.pax ?? '—')} />
                            <DataRow icon={Clock} label="Duración" value={`${booking.duration || 90} min`} />
                            <DataRow icon={Globe} label="Origen" value={(booking.origin && originLabels[booking.origin]) || booking.origin || '—'} />
                            <DataRow icon={Clock} label="Recibida" value={fmtDate(booking.createdAt, true)} />
                            {booking.isMealPlan && (
                                <Tag icon={Utensils} tone="info">Reserva en media pensión / pensión completa</Tag>
                            )}
                            {booking.hotelBookingId && (
                                <Tag icon={Hotel} tone="info">Asociada a estancia de hotel</Tag>
                            )}
                            {booking.stripePaymentMethodId && (
                                <Tag icon={CreditCard} tone="success">Tarjeta de garantía registrada</Tag>
                            )}
                        </div>
                    </Section>

                    {booking.review && (
                        <Section
                            title={
                                <span className="inline-flex items-center gap-1">
                                    <Star className="size-3 text-primary fill-primary" /> Valoración recibida
                                </span>
                            }
                        >
                            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2 text-sm">
                                <div className="space-y-1.5">
                                    <ReviewLine label="Atención" score={booking.review.serviceScore} />
                                    <ReviewLine label="Entorno" score={booking.review.ambianceScore} />
                                    <ReviewLine label="Comida" score={booking.review.foodScore} />
                                </div>
                                {booking.review.advice && (
                                    <blockquote className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 mt-2">
                                        {booking.review.advice}
                                    </blockquote>
                                )}
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                    <span>Enviada {fmtDate(booking.review.createdAt, true)}</span>
                                    {booking.review.redirectedToGoogle && (
                                        <StatusBadge tone="success" dot={false} className="gap-1 text-[10px]">
                                            <ExternalLink className="size-2.5" /> Google
                                        </StatusBadge>
                                    )}
                                </div>
                            </div>
                        </Section>
                    )}

                    <Section title="Notificaciones enviadas">
                        <div className="grid grid-cols-2 gap-2">
                            <NotificationCard
                                icon={Mail}
                                label="Email"
                                sent={!!booking.emailSent}
                                sentText="Enviado"
                                pendingText="Pendiente"
                            />
                            <NotificationCard
                                icon={MessageSquare}
                                label="SMS"
                                sent={!!booking.smsSent}
                                sentText="Enviado"
                                pendingText="No enviado"
                            />
                        </div>
                    </Section>

                    {tags.length > 0 && (
                        <Section title="Etiquetas">
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag, i) => (
                                    <StatusBadge key={i} tone="neutral" dot={false}>{tag}</StatusBadge>
                                ))}
                            </div>
                        </Section>
                    )}

                    <Section title="Historial">
                        <div className="grid grid-cols-3 gap-2">
                            <StatBox label="Total" value={guestStats.totalBookings} />
                            <StatBox label="Visitas" value={guestStats.visitCount} tone="success" />
                            <StatBox label="Canc." value={guestStats.cancelledCount} tone="destructive" />
                        </div>
                        {guestStats.firstVisit && (
                            <p className="text-[10px] text-muted-foreground mt-2 text-center">
                                Primera visita: {fmtDate(guestStats.firstVisit)}
                            </p>
                        )}
                    </Section>

                    <Section title="Notas">
                        <div className={cn(
                            "p-3 rounded-md flex gap-2 text-sm border",
                            booking.notes
                                ? "bg-warning/10 border-warning/30 text-warning-foreground"
                                : "bg-muted/40 border-border text-muted-foreground",
                        )}>
                            <MessageSquare className={cn("size-4 shrink-0 mt-0.5", booking.notes ? "text-warning" : "text-muted-foreground")} />
                            <p>{booking.notes || 'Sin notas para esta reserva.'}</p>
                        </div>
                    </Section>

                    {(booking.preferredTable || (booking.topItems && booking.topItems.length > 0)) && (
                        <Section
                            title={
                                <span className="inline-flex items-center gap-2">
                                    Hábitos (TPV)
                                    <StatusBadge tone="neutral" dot={false} className="text-[9px]">Beta</StatusBadge>
                                </span>
                            }
                        >
                            <div className="space-y-3">
                                {booking.preferredTable && (
                                    <div className="flex items-start gap-3">
                                        <span className="grid place-items-center size-8 rounded-md bg-primary/10 text-primary shrink-0">
                                            <Star className="size-4" />
                                        </span>
                                        <div>
                                            <p className="text-eyebrow">Mesa preferida</p>
                                            <p className="text-sm font-medium">{booking.preferredTable}</p>
                                        </div>
                                    </div>
                                )}
                                {booking.topItems && booking.topItems.length > 0 && (
                                    <div className="flex items-start gap-3">
                                        <span className="grid place-items-center size-8 rounded-md bg-muted text-muted-foreground shrink-0">
                                            <Utensils className="size-4" />
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-eyebrow mb-2">Top consumos</p>
                                            <div className="space-y-1.5">
                                                {booking.topItems.slice(0, 3).map((item, i) => (
                                                    <div key={i} className="flex items-center justify-between bg-muted/40 px-3 py-1.5 rounded text-sm">
                                                        <span>{item}</span>
                                                        <StatusBadge tone="neutral" dot={false} className="text-[10px]">TOP {i + 1}</StatusBadge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>
                    )}

                    {booking.emails && booking.emails.length > 0 && (
                        <Section title="Comunicaciones">
                            <div className="border border-border rounded-md divide-y divide-border/60">
                                {booking.emails.map((email) => (
                                    <div key={email.id} className="p-3 flex items-center justify-between hover:bg-accent/40 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{email.type}</span>
                                            <span className="text-[10px] text-muted-foreground">{fmtDate(email.date)}</span>
                                        </div>
                                        {email.status === 'opened' && (
                                            <StatusBadge tone="success" dot={false} className="gap-1 text-[10px]">
                                                <CheckCircle2 className="size-3" /> Abierto
                                            </StatusBadge>
                                        )}
                                        {email.status === 'clicked' && (
                                            <StatusBadge tone="info" dot={false} className="gap-1 text-[10px]">
                                                <ExternalLink className="size-3" /> Clicked
                                            </StatusBadge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

/* ============================================================
   Subcomponents
   ============================================================ */

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <h3 className="text-eyebrow mb-3">{title}</h3>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function ContactRow({
    icon: Icon,
    value,
    placeholder,
}: {
    icon: React.ComponentType<{ className?: string }>;
    value: string | null | undefined;
    placeholder: string;
}) {
    return (
        <div className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-md">
            <Icon className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">
                {value || <span className="text-muted-foreground italic">{placeholder}</span>}
            </span>
        </div>
    );
}

function DataRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex justify-between items-center px-2.5 py-1.5 bg-muted/30 rounded">
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <Icon className="size-3.5" /> {label}
            </span>
            <span className="font-medium tabular-nums">{value}</span>
        </div>
    );
}

function Tag({
    icon: Icon,
    tone,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    tone: 'info' | 'success';
    children: React.ReactNode;
}) {
    const cls = tone === 'success'
        ? "bg-success/10 border-success/20 text-success"
        : "bg-info/10 border-info/20 text-info";
    return (
        <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-medium", cls)}>
            <Icon className="size-4" />
            {children}
        </div>
    );
}

function ReviewLine({ label, score }: { label: string; score: number }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Stars value={score} />
        </div>
    );
}

function NotificationCard({
    icon: Icon,
    label,
    sent,
    sentText,
    pendingText,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    sent: boolean;
    sentText: string;
    pendingText: string;
}) {
    return (
        <div className={cn(
            "p-3 rounded-md border flex items-center gap-2.5",
            sent ? "bg-success/10 border-success/20" : "bg-muted/40 border-border",
        )}>
            <Icon className={cn("size-4", sent ? "text-success" : "text-muted-foreground")} />
            <div>
                <p className="text-eyebrow">{label}</p>
                <p className={cn("text-xs font-medium", sent ? "text-success" : "text-muted-foreground")}>
                    {sent ? sentText : pendingText}
                </p>
            </div>
        </div>
    );
}

function StatBox({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone?: 'success' | 'destructive';
}) {
    const styles = tone === 'success'
        ? "bg-success/10 border-success/20 text-success"
        : tone === 'destructive'
            ? "bg-destructive/10 border-destructive/20 text-destructive"
            : "bg-muted/40 border-border text-foreground";
    return (
        <div className={cn("p-3 rounded-md border text-center", styles)}>
            <p className="text-eyebrow">{label}</p>
            <p className="font-display text-lg font-medium tabular-nums">{value}</p>
        </div>
    );
}
