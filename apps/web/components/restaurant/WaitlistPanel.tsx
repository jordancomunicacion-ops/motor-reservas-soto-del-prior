"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Clock, ArrowRight, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

import type { WaitlistEntry } from '@/types/restaurant';

export interface WaitlistFormPayload {
    name: string;
    pax: number;
    phone: string;
    notes: string;
}

interface WaitlistProps {
    entries: WaitlistEntry[];
    onAdd: (data: WaitlistFormPayload) => void;
    onSeat: (id: string) => void;
}

export default function WaitlistPanel({ entries, onAdd, onSeat }: WaitlistProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', pax: 2, phone: '', notes: '' });

    const handleSubmit = () => {
        onAdd(formData);
        setFormData({ name: '', pax: 2, phone: '', notes: '' });
        setIsAdding(false);
    };

    return (
        <Card className="h-full flex flex-col overflow-hidden gap-0 py-0">
            <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex justify-between items-center">
                <h3 className="text-sm font-medium inline-flex items-center gap-2">
                    <Clock className="size-3.5 text-muted-foreground" />
                    Lista de espera
                    <span className="text-[11px] text-muted-foreground font-normal">({entries.length})</span>
                </h3>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setIsAdding(!isAdding)}
                    aria-label={isAdding ? 'Cerrar formulario' : 'Añadir cliente'}
                >
                    {isAdding ? <X className="size-3.5" /> : <UserPlus className="size-3.5" />}
                </Button>
            </div>

            <CardContent className="flex-1 overflow-y-auto p-0">
                {isAdding && (
                    <div className="p-3 bg-primary/5 border-b border-border space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Input
                            placeholder="Nombre del cliente"
                            className="h-8 text-sm"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                className="w-16 h-8 text-sm tabular-nums"
                                aria-label="Pax"
                                value={formData.pax}
                                onChange={e => setFormData({ ...formData, pax: parseInt(e.target.value) || 0 })}
                            />
                            <Input
                                placeholder="Teléfono"
                                className="flex-1 h-8 text-sm"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <Button size="sm" className="w-full" onClick={handleSubmit} disabled={!formData.name}>
                            Guardar
                        </Button>
                    </div>
                )}

                <ul className="divide-y divide-border/60">
                    {entries.map(entry => (
                        <li
                            key={entry.id}
                            className={cn(
                                "p-3 hover:bg-accent/40 transition-colors group",
                            )}
                        >
                            <div className="flex justify-between items-start mb-1 gap-2">
                                <span className="font-medium text-sm truncate">{entry.name}</span>
                                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                    {entry.pax}p
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>
                                    {(() => {
                                        if (!entry.createdAt) return 'Hace ??';
                                        const created = new Date(entry.createdAt);
                                        if (isNaN(created.getTime())) return 'Hace ??';
                                        return `Hace ${formatDistanceToNow(created, { locale: es })}`;
                                    })()}
                                </span>
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 text-success hover:bg-success/10 hover:text-success transition-opacity"
                                    onClick={() => onSeat(entry.id)}
                                    aria-label="Sentar cliente"
                                >
                                    <ArrowRight className="size-3.5" />
                                </Button>
                            </div>
                        </li>
                    ))}
                    {entries.length === 0 && !isAdding && (
                        <li className="p-8 text-center text-xs text-muted-foreground italic">
                            Lista vacía
                        </li>
                    )}
                </ul>
            </CardContent>
        </Card>
    );
}
