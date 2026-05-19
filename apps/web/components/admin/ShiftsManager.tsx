'use client';

import React, { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Coffee, Utensils, Moon, CalendarOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Closure {
    id: string;
    date: string;
    endDate?: string;
    reason?: string;
}

interface Shift {
    id: string;
    name: string;
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER';
    startTime: string;
    endTime: string;
    slotInterval: number;
    daysOfWeek: string;
}

const days = [
    { label: 'L', value: '1' },
    { label: 'M', value: '2' },
    { label: 'X', value: '3' },
    { label: 'J', value: '4' },
    { label: 'V', value: '5' },
    { label: 'S', value: '6' },
    { label: 'D', value: '0' },
];

const categories = [
    { label: 'Desayunos', value: 'BREAKFAST', icon: Coffee },
    { label: 'Comidas', value: 'LUNCH', icon: Utensils },
    { label: 'Cenas', value: 'DINNER', icon: Moon },
];

const getCategoryLabel = (type: string) => {
    switch (type) {
        case 'BREAKFAST': return 'Desayuno';
        case 'LUNCH': return 'Comida';
        case 'DINNER': return 'Cena';
        default: return '';
    }
};


export function ShiftsManager({ restaurantId }: { restaurantId: string }) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [newShift, setNewShift] = useState({
        name: 'Comida',
        type: 'LUNCH',
        startTime: '13:00',
        endTime: '16:00',
        slotInterval: 30,
        daysOfWeek: '1,2,3,4,5,6,0'
    });

    const [closures, setClosures] = useState<Closure[]>([]);
    const [closureType, setClosureType] = useState<'SINGLE' | 'PERIOD'>('SINGLE');
    const [newClosure, setNewClosure] = useState({ date: '', endDate: '', reason: '' });

    useEffect(() => {
        loadShifts();
        loadClosures();
    }, [restaurantId]);

    async function loadShifts() {
        try {
            const data = await fetchAPI(`/restaurant/${restaurantId}/shifts`);
            setShifts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function loadClosures() {
        try {
            const data = await fetchAPI(`/restaurant/${restaurantId}/closures`);
            setClosures(data);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAddShift() {
        if (!newShift.name) return alert('El nombre del turno es obligatorio');

        try {
            const result = await fetchAPI(`/restaurant/${restaurantId}/shifts`, {
                method: 'POST',
                body: JSON.stringify({
                    ...newShift,
                    slotInterval: Number(newShift.slotInterval)
                })
            });
            if (result?.error) {
                throw new Error(result.message);
            }
            setNewShift({
                name: 'Comida',
                type: 'LUNCH',
                startTime: '13:00',
                endTime: '16:00',
                slotInterval: 30,
                daysOfWeek: '1,2,3,4,5,6,0'
            });
            loadShifts();
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Error desconocido';
            alert(`Error al crear el turno: ${message}`);
        }
    }

    async function handleDeleteShift(id: string) {
        if (!confirm('¿Estás seguro de que quieres eliminar este turno?')) return;

        try {
            await fetchAPI(`/restaurant/${restaurantId}/shifts/${id}`, {
                method: 'DELETE'
            });
            loadShifts();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar el turno');
        }
    }

    async function handleAddClosure() {
        if (!newClosure.date) return alert('La fecha es obligatoria');
        if (closureType === 'PERIOD' && !newClosure.endDate) return alert('La fecha de fin es obligatoria');

        try {
            const payload = {
                date: newClosure.date,
                reason: newClosure.reason,
                endDate: closureType === 'PERIOD' ? newClosure.endDate : undefined
            };

            await fetchAPI(`/restaurant/${restaurantId}/closures`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            setNewClosure({ date: '', endDate: '', reason: '' });
            loadClosures();
        } catch (e) {
            console.error(e);
            alert('Error al añadir el día de cierre');
        }
    }

    async function handleDeleteClosure(id: string) {
        if (!confirm('¿Estás seguro de que quieres eliminar este cierre?')) return;

        try {
            await fetchAPI(`/restaurant/${restaurantId}/closures/${id}`, {
                method: 'DELETE'
            });
            loadClosures();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar el cierre');
        }
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end bg-muted/30 p-5 rounded-md border border-dashed border-border">
                <div className="space-y-2 lg:col-span-1">
                    <Label className="text-eyebrow">Categoría</Label>
                    <Select
                        value={newShift.type}
                        onValueChange={(val: 'BREAKFAST' | 'LUNCH' | 'DINNER') =>
                            setNewShift({ ...newShift, type: val, name: getCategoryLabel(val) })
                        }
                    >
                        <SelectTrigger className="w-full h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="BREAKFAST">Desayuno</SelectItem>
                            <SelectItem value="LUNCH">Comida</SelectItem>
                            <SelectItem value="DINNER">Cena</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-eyebrow">Inicio</Label>
                    <Input
                        className="h-10"
                        type="time"
                        value={newShift.startTime}
                        onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-eyebrow">Fin</Label>
                    <Input
                        className="h-10"
                        type="time"
                        value={newShift.endTime}
                        onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-eyebrow">Intervalo</Label>
                    <Input
                        className="h-10"
                        type="number"
                        value={newShift.slotInterval}
                        onChange={(e) => setNewShift({ ...newShift, slotInterval: parseInt(e.target.value) })}
                    />
                </div>
                <div className="space-y-2 lg:col-span-1">
                    <Label className="text-eyebrow">Días</Label>
                    <div className="flex gap-1">
                        {days.map((d) => {
                            const isSelected = newShift.daysOfWeek.split(',').includes(d.value);
                            return (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => {
                                        const currentDays = newShift.daysOfWeek ? newShift.daysOfWeek.split(',') : [];
                                        let newDays;
                                        if (isSelected) {
                                            newDays = currentDays.filter(day => day !== d.value);
                                        } else {
                                            newDays = [...currentDays, d.value];
                                        }
                                        setNewShift({ ...newShift, daysOfWeek: newDays.sort().join(',') });
                                    }}
                                    className={cn(
                                        "size-7 rounded-full text-[10px] font-semibold transition-all",
                                        isSelected
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-card text-muted-foreground border border-border hover:bg-muted'
                                    )}
                                >
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <Button onClick={handleAddShift} className="gap-2 h-10">
                    <Plus className="size-4" /> Añadir Turno
                </Button>
            </div>

            <div className="space-y-10">
                {shifts.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-md">
                        <Clock className="size-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No hay turnos configurados para este restaurante.</p>
                    </div>
                )}

                {categories.map((cat) => {
                    const catShifts = shifts.filter(s => s.type === cat.value);
                    if (catShifts.length === 0) return null;

                    const Icon = cat.icon;

                    return (
                        <div key={cat.value} className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-border pb-2">
                                <span className="grid place-items-center size-9 rounded-md bg-primary/10 text-primary">
                                    <Icon className="size-4" />
                                </span>
                                <h3 className="font-display text-lg font-medium tracking-tight">{cat.label}</h3>
                                <Badge variant="outline" className="ml-auto">{catShifts.length} turnos</Badge>
                            </div>

                            <div className="grid gap-3">
                                {catShifts.map((shift) => (
                                    <div key={shift.id} className="flex items-center justify-between p-4 border border-border bg-card rounded-md hover:bg-muted/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <span className="grid place-items-center size-10 rounded-md bg-primary/10 text-primary">
                                                <Clock className="size-4" />
                                            </span>
                                            <div>
                                                <div className="font-medium text-foreground">{shift.name}</div>
                                                <div className="text-sm text-muted-foreground tabular-nums">
                                                    {shift.startTime} - {shift.endTime} <span className="mx-2 opacity-30">|</span> Cada {shift.slotInterval} min
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex gap-1">
                                                {days.map((d) => (
                                                    <span
                                                        key={d.value}
                                                        className={cn(
                                                            "size-6 flex items-center justify-center rounded-full text-[10px] font-semibold",
                                                            shift.daysOfWeek.includes(d.value)
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted/40 text-muted-foreground opacity-50'
                                                        )}
                                                    >
                                                        {d.label}
                                                    </span>
                                                ))}
                                            </div>
                                            <Button
                                                onClick={() => handleDeleteShift(shift.id)}
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Eliminar turno"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-8 border-t border-dashed border-border mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <span className="grid place-items-center size-10 rounded-md bg-destructive/10 text-destructive">
                        <CalendarOff className="size-5" />
                    </span>
                    <div>
                        <h3 className="font-display text-lg font-medium tracking-tight">Días de Cierre Extraordinarios</h3>
                        <p className="text-sm text-muted-foreground">Bloquea fechas específicas (vacaciones, eventos privados) para que no se puedan reservar.</p>
                    </div>
                </div>

                <div className="bg-destructive/5 p-5 rounded-md border border-dashed border-destructive/20 mb-6">
                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={closureType === 'SINGLE' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => setClosureType('SINGLE')}
                        >
                            Día Suelto
                        </Button>
                        <Button
                            variant={closureType === 'PERIOD' ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => setClosureType('PERIOD')}
                        >
                            Periodo / Vacaciones
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label className="text-eyebrow">{closureType === 'SINGLE' ? 'Fecha a Bloquear' : 'Fecha Inicio'}</Label>
                            <Input
                                type="date"
                                className="h-10"
                                value={newClosure.date}
                                onChange={(e) => setNewClosure({ ...newClosure, date: e.target.value })}
                            />
                        </div>
                        {closureType === 'PERIOD' && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                <Label className="text-eyebrow">Fecha Fin</Label>
                                <Input
                                    type="date"
                                    className="h-10"
                                    value={newClosure.endDate}
                                    onChange={(e) => setNewClosure({ ...newClosure, endDate: e.target.value })}
                                />
                            </div>
                        )}
                        <div className={cn("space-y-2", closureType === 'SINGLE' && 'md:col-span-1')}>
                            <Label className="text-eyebrow">Motivo (Opcional)</Label>
                            <Input
                                type="text"
                                className="h-10"
                                placeholder={closureType === 'PERIOD' ? "Ej: Vacaciones de Verano" : "Ej: Evento Privado"}
                                value={newClosure.reason}
                                onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })}
                            />
                        </div>
                        <Button onClick={handleAddClosure} variant="destructive" className="gap-2">
                            <Plus className="size-4" /> {closureType === 'SINGLE' ? 'Bloquear Día' : 'Bloquear Periodo'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {closures.map(closure => (
                        <div key={closure.id} className="flex items-center justify-between p-4 bg-card rounded-md border border-border">
                            <div className="flex items-center gap-3">
                                <span className="grid place-items-center size-9 rounded-md bg-destructive/10 text-destructive">
                                    <CalendarOff className="size-4" />
                                </span>
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {closure.endDate && <Badge variant="destructive" className="text-[9px] h-4 px-1 uppercase tracking-tighter">Periodo</Badge>}
                                        <span className="capitalize">
                                            {(() => {
                                                try {
                                                    const start = format(new Date(closure.date), "eeee d 'de' MMMM", { locale: es });
                                                    if (closure.endDate) {
                                                        return (
                                                            <span className="flex flex-col md:flex-row md:items-center gap-1">
                                                                <span className="text-destructive">{format(new Date(closure.date), "d MMM yyyy", { locale: es })}</span>
                                                                <span className="opacity-40 text-xs">al</span>
                                                                <span className="text-destructive">{format(new Date(closure.endDate), "d MMM yyyy", { locale: es })}</span>
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
                                    {closure.reason && <div className="text-xs text-muted-foreground mt-0.5">{closure.reason}</div>}
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClosure(closure.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                Desbloquear
                            </Button>
                        </div>
                    ))}
                    {closures.length === 0 && (
                        <div className="col-span-full text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-md">
                            No hay días bloqueados excepcionalmente.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
