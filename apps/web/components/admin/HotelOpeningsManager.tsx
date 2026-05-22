'use client';

import React, { useEffect, useState } from 'react';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, CalendarCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Opening {
    id: string;
    date: string;
    endDate?: string | null;
    reason?: string | null;
}

export function HotelOpeningsManager({ hotelId }: { hotelId: string }) {
    const [openings, setOpenings] = useState<Opening[]>([]);
    const [openingType, setOpeningType] = useState<'SINGLE' | 'PERIOD'>('SINGLE');
    const [newOpening, setNewOpening] = useState({ date: '', endDate: '', reason: '' });

    useEffect(() => {
        if (hotelId) loadOpenings();
    }, [hotelId]);

    async function loadOpenings() {
        try {
            const data = await fetchAPIAdmin(`/property/hotels/${hotelId}/openings`);
            setOpenings(data);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAdd() {
        if (!newOpening.date) return alert('La fecha es obligatoria');
        if (openingType === 'PERIOD' && !newOpening.endDate) return alert('La fecha de fin es obligatoria');

        try {
            await fetchAPIAdmin(`/property/hotels/${hotelId}/openings`, {
                method: 'POST',
                body: JSON.stringify({
                    date: newOpening.date,
                    reason: newOpening.reason,
                    endDate: openingType === 'PERIOD' ? newOpening.endDate : undefined,
                })
            });
            setNewOpening({ date: '', endDate: '', reason: '' });
            loadOpenings();
        } catch (e) {
            console.error(e);
            alert('Error al añadir la apertura');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar esta apertura?')) return;
        try {
            await fetchAPIAdmin(`/property/hotels/${hotelId}/openings/${id}`, { method: 'DELETE' });
            loadOpenings();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar la apertura');
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-emerald-500/5 p-5 rounded-md border border-dashed border-emerald-500/20">
                <div className="flex gap-2 mb-4">
                    <Button
                        variant={openingType === 'SINGLE' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOpeningType('SINGLE')}
                        className={openingType === 'SINGLE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    >
                        Día Suelto
                    </Button>
                    <Button
                        variant={openingType === 'PERIOD' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOpeningType('PERIOD')}
                        className={openingType === 'PERIOD' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                    >
                        Periodo
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-eyebrow">{openingType === 'SINGLE' ? 'Fecha a Abrir' : 'Fecha Inicio'}</Label>
                        <Input
                            type="date"
                            className="h-10"
                            value={newOpening.date}
                            onChange={(e) => setNewOpening({ ...newOpening, date: e.target.value })}
                        />
                    </div>
                    {openingType === 'PERIOD' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                            <Label className="text-eyebrow">Fecha Fin</Label>
                            <Input
                                type="date"
                                className="h-10"
                                value={newOpening.endDate}
                                onChange={(e) => setNewOpening({ ...newOpening, endDate: e.target.value })}
                            />
                        </div>
                    )}
                    <div className={cn("space-y-2", openingType === 'SINGLE' && 'md:col-span-1')}>
                        <Label className="text-eyebrow">Motivo (Opcional)</Label>
                        <Input
                            type="text"
                            className="h-10"
                            placeholder={openingType === 'PERIOD' ? "Ej: Puente festivo" : "Ej: Evento privado"}
                            value={newOpening.reason}
                            onChange={(e) => setNewOpening({ ...newOpening, reason: e.target.value })}
                        />
                    </div>
                    <Button
                        onClick={handleAdd}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Plus className="size-4" /> {openingType === 'SINGLE' ? 'Abrir Día' : 'Abrir Periodo'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                    Una apertura excepcional anula cualquier <strong>StopSell</strong>, <strong>CTA</strong> y <strong>CTD</strong> de las restricciones para esa fecha. Las restricciones de estancia mínima/máxima y de inventario siguen aplicando.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {openings.map(opening => (
                    <div key={opening.id} className="flex items-center justify-between p-4 bg-card rounded-md border border-border">
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center size-9 rounded-md bg-emerald-500/10 text-emerald-600">
                                <CalendarCheck className="size-4" />
                            </span>
                            <div>
                                <div className="font-medium flex items-center gap-2">
                                    {opening.endDate && <Badge className="text-[9px] h-4 px-1 uppercase tracking-tighter bg-emerald-600 hover:bg-emerald-600 text-white">Periodo</Badge>}
                                    <span className="capitalize">
                                        {(() => {
                                            try {
                                                const start = format(new Date(opening.date), "eeee d 'de' MMMM", { locale: es });
                                                if (opening.endDate) {
                                                    return (
                                                        <span className="flex flex-col md:flex-row md:items-center gap-1">
                                                            <span className="text-emerald-700">{format(new Date(opening.date), "d MMM yyyy", { locale: es })}</span>
                                                            <span className="opacity-40 text-xs">al</span>
                                                            <span className="text-emerald-700">{format(new Date(opening.endDate), "d MMM yyyy", { locale: es })}</span>
                                                        </span>
                                                    );
                                                }
                                                return start;
                                            } catch (e) {
                                                return 'Fecha no válida';
                                            }
                                        })()}
                                    </span>
                                </div>
                                {opening.reason && <div className="text-xs text-muted-foreground mt-0.5">{opening.reason}</div>}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(opening.id)}
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10"
                        >
                            Eliminar
                        </Button>
                    </div>
                ))}
                {openings.length === 0 && (
                    <div className="col-span-full text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-md">
                        No hay aperturas excepcionales configuradas.
                    </div>
                )}
            </div>
        </div>
    );
}
