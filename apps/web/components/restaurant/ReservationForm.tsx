"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { User, X } from "lucide-react";

interface ReservationFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialDate?: Date;
}

export default function ReservationForm({ isOpen, onClose, onSubmit, initialDate }: ReservationFormProps) {
    const [dateStr, setDateStr] = useState(initialDate ? format(initialDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    const [time, setTime] = useState("20:00");
    const [pax, setPax] = useState("2");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");

    const handleSubmit = () => {
        if (!dateStr) return;
        // Combine date and time
        const [hours, minutes] = time.split(':').map(Number);
        const bookingDate = new Date(dateStr);
        bookingDate.setHours(hours, minutes);

        onSubmit({
            guestName: name,
            guestPhone: phone,
            pax: parseInt(pax),
            date: bookingDate,
            notes,
            status: "CONFIRMED",
            origin: "MANUAL",
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-4">Nueva Reserva</h2>

                <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label>Fecha</Label>
                            <Input
                                type="date"
                                value={dateStr}
                                onChange={(e) => setDateStr(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                            <Label>Hora</Label>
                            <Select value={time} onValueChange={setTime}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['13:00', '13:30', '14:00', '14:30', '15:00', '20:00', '20:30', '21:00', '21:30', '22:00'].map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 items-center">
                        <Label className="col-span-1 text-right">Cliente</Label>
                        <Input className="col-span-3" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre y Apellidos" />
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                        <Label className="col-span-1 text-right">Teléfono</Label>
                        <Input className="col-span-3" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+34 600..." />
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                        <Label className="col-span-1 text-right">Pax</Label>
                        <div className="col-span-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <Input type="number" value={pax} onChange={e => setPax(e.target.value)} className="w-20" />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 items-center">
                        <Label className="col-span-1 text-right">Notas</Label>
                        <Input className="col-span-3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alergias, trona, etc." />
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <span className="text-green-600">💳</span> Garantía de Reserva (No-Show)
                        </h3>
                        <div className="bg-gray-50 p-3 rounded border text-sm space-y-2">
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Política de Cancelación:</span>
                                <span className="font-medium text-black">20€ si no se asiste</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Input placeholder="0000 0000 0000 0000" disabled className="bg-white" />
                                <Input placeholder="MM/YY" disabled className="w-20 bg-white" />
                                <Input placeholder="CVC" disabled className="w-16 bg-white" />
                            </div>
                            <div className="text-xs text-gray-500">
                                * Simulación: Se generará un token de Stripe automáticamente al guardar.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={!name}>Crear Reserva</Button>
                </div>
            </div>
        </div>
    );
}
