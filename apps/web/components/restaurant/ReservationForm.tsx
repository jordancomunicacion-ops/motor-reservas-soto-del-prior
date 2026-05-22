"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { User, X, ChevronDown, ChevronRight, Utensils, MessageCircle, Instagram, Facebook, Globe, Linkedin } from "lucide-react";

import type { GuestBookingProfile } from './GuestProfileSheet';
import { formatTimeInTz, formatDateOnlyInTz, zonedDateToUtc } from '@/lib/timezone';

export interface ReservationFormPayload {
    guestName: string;
    guestSurname2: string | null;
    guestEmail: string | null;
    guestPhone: string | null;
    guestWhatsapp: string | null;
    guestAge: number | null;
    guestGender: string | null;
    pax: number;
    duration: number;
    date: Date;
    notes: string | null;
    tags: string | null;
    isMealPlan: boolean;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    linkedin: string | null;
    xTwitter: string | null;
    status?: string;
    origin?: string;
    tableId?: string;
}

interface ReservationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ReservationFormPayload) => void;
    onCancel?: (bookingId: string) => void | Promise<void>;
    initialDate?: Date;
    initialBooking?: GuestBookingProfile | null;
    initialTableId?: string | null;
    timezone?: string;
}

export default function ReservationForm({ isOpen, onClose, onSubmit, onCancel, initialDate, initialBooking, initialTableId, timezone }: ReservationFormProps) {
    const isEditing = !!initialBooking;

    const initialDateStr = initialBooking?.date
        ? formatDateOnlyInTz(initialBooking.date, timezone)
        : initialDate
            ? format(initialDate, "yyyy-MM-dd")
            : format(new Date(), "yyyy-MM-dd");

    const initialTime = initialBooking?.date
        ? formatTimeInTz(initialBooking.date, timezone, '20:00')
        : "20:00";

    const [dateStr, setDateStr] = useState(initialDateStr);
    const [time, setTime] = useState(initialTime);
    const [pax, setPax] = useState(String(initialBooking?.pax || 2));
    const [duration, setDuration] = useState(String(initialBooking?.duration || 90));
    const [name, setName] = useState(initialBooking?.guestName || "");
    const [surname2, setSurname2] = useState(initialBooking?.guestSurname2 || "");
    const [email, setEmail] = useState(initialBooking?.guestEmail || "");
    const [phone, setPhone] = useState(initialBooking?.guestPhone || "");
    const [whatsapp, setWhatsapp] = useState(initialBooking?.guestWhatsapp || "");
    const [age, setAge] = useState(initialBooking?.guestAge ? String(initialBooking.guestAge) : "");
    const [gender, setGender] = useState(initialBooking?.guestGender || "");
    const [notes, setNotes] = useState(initialBooking?.notes || "");
    const [tagsInput, setTagsInput] = useState(() => {
        if (!initialBooking?.tags) return "";
        try {
            const parsed = JSON.parse(initialBooking.tags);
            return Array.isArray(parsed) ? parsed.join(', ') : initialBooking.tags;
        } catch {
            return initialBooking.tags;
        }
    });
    const [isMealPlan, setIsMealPlan] = useState(!!initialBooking?.isMealPlan);

    const [instagram, setInstagram] = useState(initialBooking?.instagram || "");
    const [facebook, setFacebook] = useState(initialBooking?.facebook || "");
    const [tiktok, setTiktok] = useState(initialBooking?.tiktok || "");
    const [linkedin, setLinkedinHandle] = useState(initialBooking?.linkedin || "");
    const [xTwitter, setXTwitter] = useState(initialBooking?.xTwitter || "");

    const [showExtra, setShowExtra] = useState(
        !!(initialBooking?.guestSurname2 || initialBooking?.guestAge || initialBooking?.guestGender ||
            initialBooking?.guestWhatsapp || initialBooking?.isMealPlan || initialBooking?.tags)
    );
    const [showSocial, setShowSocial] = useState(
        !!(initialBooking?.instagram || initialBooking?.facebook || initialBooking?.tiktok ||
            initialBooking?.linkedin || initialBooking?.xTwitter)
    );

    const handleSubmit = () => {
        if (!dateStr) return;
        const bookingDate = zonedDateToUtc(dateStr, time, timezone);

        const tagsArr = tagsInput.split(',').map((t: string) => t.trim()).filter(Boolean);

        const payload: ReservationFormPayload = {
            guestName: name,
            guestSurname2: surname2 || null,
            guestEmail: email || null,
            guestPhone: phone || null,
            guestWhatsapp: whatsapp || null,
            guestAge: age ? parseInt(age, 10) : null,
            guestGender: gender || null,
            pax: parseInt(pax) || 0,
            duration: parseInt(duration) || 90,
            date: bookingDate,
            notes: notes || null,
            tags: tagsArr.length > 0 ? JSON.stringify(tagsArr) : null,
            isMealPlan,
            instagram: instagram || null,
            facebook: facebook || null,
            tiktok: tiktok || null,
            linkedin: linkedin || null,
            xTwitter: xTwitter || null,
        };

        if (!isEditing) {
            payload.status = "CONFIRMED";
            payload.origin = "MANUAL";
            if (initialTableId) payload.tableId = initialTableId;
        }

        onSubmit(payload);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card text-foreground rounded-lg shadow-lg w-full max-w-lg p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-border">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onClose}
                    aria-label="Cerrar"
                    className="absolute top-3 right-3"
                >
                    <X className="size-4" />
                </Button>

                <h2 className="font-display text-xl font-medium tracking-tight mb-4">
                    {isEditing ? 'Editar Reserva' : 'Nueva Reserva'}
                </h2>

                <div className="space-y-4">
                    {/* Fecha, hora, pax, duracion */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Fecha</Label>
                            <Input type="date" className="h-10" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Hora</Label>
                            <Select value={time} onValueChange={setTime}>
                                <SelectTrigger className="w-full h-10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'].map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow flex items-center gap-1"><User className="size-3" /> Pax</Label>
                            <Input type="number" min="1" max="50" className="h-10" value={pax} onChange={e => setPax(e.target.value)} />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Duración (min)</Label>
                            <Input type="number" min="30" step="15" className="h-10" value={duration} onChange={e => setDuration(e.target.value)} />
                        </div>
                    </div>

                    {/* Cliente */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Nombre y primer apellido *</Label>
                            <Input className="h-10" value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Segundo apellido</Label>
                            <Input className="h-10" value={surname2} onChange={e => setSurname2(e.target.value)} placeholder="(opcional)" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Email</Label>
                            <Input type="email" className="h-10" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label className="text-eyebrow">Teléfono</Label>
                            <Input className="h-10" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600..." />
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="flex flex-col space-y-1.5">
                        <Label className="text-eyebrow">Notas</Label>
                        <Input className="h-10" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alergias, trona, cumpleaños..." />
                    </div>

                    {/* Toggle: datos adicionales */}
                    <button
                        type="button"
                        onClick={() => setShowExtra(s => !s)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        {showExtra ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                        Datos adicionales (CRM)
                    </button>

                    {showExtra && (
                        <div className="grid grid-cols-1 gap-3 pl-4 border-l-2 border-border">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col space-y-1.5">
                                    <Label className="text-eyebrow">Edad</Label>
                                    <Input type="number" min="0" max="120" className="h-10" value={age} onChange={e => setAge(e.target.value)} />
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                    <Label className="text-eyebrow">Género</Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger className="w-full h-10"><SelectValue placeholder="—" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Hombre</SelectItem>
                                            <SelectItem value="F">Mujer</SelectItem>
                                            <SelectItem value="OTHER">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col space-y-1.5">
                                    <Label className="text-eyebrow flex items-center gap-1"><MessageCircle className="size-3 text-success" /> WhatsApp</Label>
                                    <Input className="h-10" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+34..." />
                                </div>
                            </div>

                            <div className="flex flex-col space-y-1.5">
                                <Label className="text-eyebrow">Etiquetas (separadas por comas)</Label>
                                <Input className="h-10" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="VIP, Alergias gluten, Cumpleaños" />
                            </div>

                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                    checked={isMealPlan}
                                    onCheckedChange={(v) => setIsMealPlan(!!v)}
                                />
                                <Utensils className="size-3.5 text-primary" />
                                <span>Reserva en media pensión / pensión completa (hotel)</span>
                            </label>
                        </div>
                    )}

                    {/* Toggle: redes sociales */}
                    <button
                        type="button"
                        onClick={() => setShowSocial(s => !s)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        {showSocial ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                        Redes sociales
                    </button>

                    {showSocial && (
                        <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-border">
                            <div className="flex items-center gap-2">
                                <Instagram className="size-3.5 text-muted-foreground shrink-0" />
                                <Input className="h-10 text-xs" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@usuario o URL" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Facebook className="size-3.5 text-muted-foreground shrink-0" />
                                <Input className="h-10 text-xs" value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="usuario o URL" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                                <Input className="h-10 text-xs" value={tiktok} onChange={e => setTiktok(e.target.value)} placeholder="TikTok @usuario" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Linkedin className="size-3.5 text-muted-foreground shrink-0" />
                                <Input className="h-10 text-xs" value={linkedin} onChange={e => setLinkedinHandle(e.target.value)} placeholder="LinkedIn usuario/URL" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="size-3.5 text-muted-foreground shrink-0" />
                                <Input className="h-10 text-xs" value={xTwitter} onChange={e => setXTwitter(e.target.value)} placeholder="X/Twitter @usuario" />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t border-border">
                    <div>
                        {isEditing && onCancel && initialBooking?.id && (
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (!confirm('¿Cancelar esta reserva? Se liberará la mesa asignada.')) return;
                                    await onCancel(initialBooking.id);
                                    onClose();
                                }}
                            >
                                Cancelar reserva
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cerrar</Button>
                        <Button onClick={handleSubmit} disabled={!name}>{isEditing ? 'Guardar' : 'Crear Reserva'}</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
