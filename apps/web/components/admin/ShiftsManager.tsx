'use client';

import React, { useEffect, useState } from 'react';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Coffee, Utensils, Moon, CalendarOff, CalendarCheck, Armchair } from 'lucide-react';
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

interface CustomShift {
    name: string;
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER';
    startTime: string;
    endTime: string;
    slotInterval: number;
}

interface OpeningTable {
    id: string;
    name: string;
    capacity: number;
    minPax?: number;
    maxPax?: number;
    zoneId: string;
}

interface DraftExtraTable {
    name: string;
    capacity: number;
    zoneId: string;
}

interface ZoneLite {
    id: string;
    name: string;
}

interface Opening {
    id: string;
    date: string;
    endDate?: string;
    reason?: string;
    shiftIds: string;
    customShifts?: CustomShift[] | null;
    tables?: OpeningTable[] | null;
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

    const [openings, setOpenings] = useState<Opening[]>([]);
    const [openingType, setOpeningType] = useState<'SINGLE' | 'PERIOD'>('SINGLE');
    const [editingOpeningId, setEditingOpeningId] = useState<string | null>(null);
    const [newOpening, setNewOpening] = useState<{ date: string; endDate: string; reason: string; shiftIds: string[]; customShifts: CustomShift[]; extraTables: DraftExtraTable[] }>({ date: '', endDate: '', reason: '', shiftIds: [], customShifts: [], extraTables: [] });
    const [draftCustomShift, setDraftCustomShift] = useState<CustomShift>({ name: 'Comida', type: 'LUNCH', startTime: '13:00', endTime: '16:00', slotInterval: 30 });

    const [zones, setZones] = useState<ZoneLite[]>([]);
    const [draftExtraTable, setDraftExtraTable] = useState<DraftExtraTable>({ name: '', capacity: 4, zoneId: '' });

    useEffect(() => {
        loadShifts();
        loadClosures();
        loadOpenings();
        loadZones();
    }, [restaurantId]);

    async function loadShifts() {
        try {
            const data = await fetchAPIAdmin(`/restaurant/${restaurantId}/shifts`);
            setShifts(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function loadClosures() {
        try {
            const data = await fetchAPIAdmin(`/restaurant/${restaurantId}/closures`);
            setClosures(data);
        } catch (e) {
            console.error(e);
        }
    }

    async function loadOpenings() {
        try {
            const data = await fetchAPIAdmin(`/restaurant/${restaurantId}/openings`);
            setOpenings(data);
        } catch (e) {
            console.error(e);
        }
    }

    async function loadZones() {
        try {
            const data = await fetchAPIAdmin<Array<{ id: string; name: string }>>(`/restaurant/${restaurantId}/zones`);
            const zs = (data || []).map(z => ({ id: z.id, name: z.name }));
            setZones(zs);
            // Pre-selecciona la primera zona para el borrador de mesa extra.
            if (zs.length > 0) setDraftExtraTable(prev => ({ ...prev, zoneId: prev.zoneId || zs[0].id }));
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAddShift() {
        if (!newShift.name) return alert('El nombre del turno es obligatorio');

        try {
            const result = await fetchAPIAdmin(`/restaurant/${restaurantId}/shifts`, {
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
            await fetchAPIAdmin(`/restaurant/${restaurantId}/shifts/${id}`, {
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

            await fetchAPIAdmin(`/restaurant/${restaurantId}/closures`, {
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
            await fetchAPIAdmin(`/restaurant/${restaurantId}/closures/${id}`, {
                method: 'DELETE'
            });
            loadClosures();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar el cierre');
        }
    }

    function resetOpeningForm() {
        setNewOpening({ date: '', endDate: '', reason: '', shiftIds: [], customShifts: [], extraTables: [] });
        setOpeningType('SINGLE');
        setEditingOpeningId(null);
    }

    function handleStartEditOpening(opening: Opening) {
        setEditingOpeningId(opening.id);
        setOpeningType(opening.endDate ? 'PERIOD' : 'SINGLE');
        setNewOpening({
            // La fecha llega como ISO (medianoche UTC del día); cortamos a yyyy-MM-dd
            // para el input date sin desfases de zona horaria.
            date: String(opening.date).slice(0, 10),
            endDate: opening.endDate ? String(opening.endDate).slice(0, 10) : '',
            reason: opening.reason || '',
            shiftIds: opening.shiftIds.split(',').map(x => x.trim()).filter(Boolean),
            customShifts: opening.customShifts || [],
            extraTables: [],
        });
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleAddOpening() {
        if (!newOpening.date) return alert('La fecha es obligatoria');
        if (openingType === 'PERIOD' && !newOpening.endDate) return alert('La fecha de fin es obligatoria');
        if (newOpening.shiftIds.length === 0 && newOpening.customShifts.length === 0) {
            return alert('Reutiliza al menos un turno o añade un turno puntual');
        }

        try {
            const payload = {
                date: newOpening.date,
                reason: newOpening.reason,
                endDate: openingType === 'PERIOD' ? newOpening.endDate : null,
                shiftIds: newOpening.shiftIds,
                customShifts: newOpening.customShifts,
                // Las mesas extra de una apertura existente se gestionan en su tarjeta.
                ...(editingOpeningId ? {} : { extraTables: newOpening.extraTables }),
            };

            if (editingOpeningId) {
                await fetchAPIAdmin(`/restaurant/openings/${editingOpeningId}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });
            } else {
                await fetchAPIAdmin(`/restaurant/${restaurantId}/openings`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }
            resetOpeningForm();
            loadOpenings();
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Error desconocido';
            alert(`Error al ${editingOpeningId ? 'guardar' : 'añadir'} la apertura: ${message}`);
        }
    }

    function handleAddCustomShift() {
        const cs = draftCustomShift;
        if (!cs.name) return alert('El nombre del turno puntual es obligatorio');
        if (cs.startTime >= cs.endTime) return alert('La hora de inicio debe ser anterior a la de fin');
        if (cs.slotInterval < 5 || cs.slotInterval > 240) return alert('El intervalo debe estar entre 5 y 240 minutos');
        setNewOpening(prev => ({ ...prev, customShifts: [...prev.customShifts, cs] }));
        setDraftCustomShift({ name: 'Comida', type: 'LUNCH', startTime: '13:00', endTime: '16:00', slotInterval: 30 });
    }

    function handleRemoveCustomShift(idx: number) {
        setNewOpening(prev => ({ ...prev, customShifts: prev.customShifts.filter((_, i) => i !== idx) }));
    }

    function handleAddExtraTable() {
        const t = draftExtraTable;
        if (zones.length === 0) return alert('Crea primero una zona en el plano de mesas');
        if (!t.zoneId) return alert('Selecciona una zona para la mesa');
        const capacity = Number(t.capacity) || 4;
        const name = (t.name || '').trim() || `Extra ${newOpening.extraTables.length + 1}`;
        setNewOpening(prev => ({ ...prev, extraTables: [...prev.extraTables, { name, capacity, zoneId: t.zoneId }] }));
        setDraftExtraTable({ name: '', capacity: 4, zoneId: t.zoneId });
    }

    function handleRemoveExtraTable(idx: number) {
        setNewOpening(prev => ({ ...prev, extraTables: prev.extraTables.filter((_, i) => i !== idx) }));
    }

    async function handleAddTableToOpening(openingId: string) {
        if (zones.length === 0) return alert('Crea primero una zona en el plano de mesas');
        const t = draftExtraTable;
        const capacity = Number(t.capacity) || 4;
        const name = (t.name || '').trim();
        try {
            await fetchAPIAdmin(`/restaurant/openings/${openingId}/tables`, {
                method: 'POST',
                body: JSON.stringify([{ name: name || undefined, capacity, zoneId: t.zoneId || zones[0].id }]),
            });
            setDraftExtraTable({ name: '', capacity: 4, zoneId: t.zoneId || zones[0].id });
            loadOpenings();
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Error desconocido';
            alert(`Error al añadir la mesa: ${message}`);
        }
    }

    async function handleDeleteOpeningTable(tableId: string) {
        try {
            await fetchAPIAdmin(`/restaurant/tables/${tableId}`, { method: 'DELETE' });
            loadOpenings();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar la mesa');
        }
    }

    function zoneName(zoneId: string) {
        return zones.find(z => z.id === zoneId)?.name || 'Zona';
    }

    async function handleDeleteOpening(id: string) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta apertura?')) return;

        try {
            await fetchAPIAdmin(`/restaurant/${restaurantId}/openings/${id}`, {
                method: 'DELETE'
            });
            loadOpenings();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar la apertura');
        }
    }

    function toggleOpeningShift(shiftId: string) {
        setNewOpening(prev => {
            const has = prev.shiftIds.includes(shiftId);
            return { ...prev, shiftIds: has ? prev.shiftIds.filter(x => x !== shiftId) : [...prev.shiftIds, shiftId] };
        });
    }

    function shiftIconFor(type: 'BREAKFAST' | 'LUNCH' | 'DINNER') {
        if (type === 'BREAKFAST') return Coffee;
        if (type === 'LUNCH') return Utensils;
        return Moon;
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

            <div className="pt-8 border-t border-dashed border-border mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <span className="grid place-items-center size-10 rounded-md bg-emerald-500/10 text-emerald-600">
                        <CalendarCheck className="size-5" />
                    </span>
                    <div>
                        <h3 className="font-display text-lg font-medium tracking-tight">Días de Apertura Excepcional</h3>
                        <p className="text-sm text-muted-foreground">Abre un día que normalmente cerraría — anula los días sin turnos y los cierres que solapen. Elige qué turnos se ofrecen ese día.</p>
                    </div>
                </div>

                <div className="bg-emerald-500/5 p-5 rounded-md border border-dashed border-emerald-500/20 mb-6">
                    {editingOpeningId && (
                        <div className="flex items-center justify-between gap-2 mb-4 px-3 py-2 rounded-md bg-emerald-600/10 border border-emerald-600/30 text-sm text-emerald-800">
                            <span className="inline-flex items-center gap-2">
                                <CalendarCheck className="size-4" /> Editando una apertura existente. Las mesas extra se gestionan desde su tarjeta, más abajo.
                            </span>
                            <button type="button" onClick={resetOpeningForm} className="text-xs underline hover:no-underline">Cancelar</button>
                        </div>
                    )}
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
                                placeholder={openingType === 'PERIOD' ? "Ej: Puente festivo" : "Ej: Cena especial"}
                                value={newOpening.reason}
                                onChange={(e) => setNewOpening({ ...newOpening, reason: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleAddOpening}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                            >
                                {editingOpeningId
                                    ? <><CalendarCheck className="size-4" /> Guardar cambios</>
                                    : <><Plus className="size-4" /> {openingType === 'SINGLE' ? 'Abrir Día' : 'Abrir Periodo'}</>}
                            </Button>
                            {editingOpeningId && (
                                <Button variant="outline" onClick={resetOpeningForm} className="gap-2">
                                    Cancelar
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 space-y-5">
                        <div>
                            <Label className="text-eyebrow mb-2 block">Reutilizar turnos existentes</Label>
                            {shifts.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No hay turnos configurados; añade abajo turnos puntuales.</p>
                            ) : (
                                <div className="space-y-3">
                                    {categories.map(cat => {
                                        const catShifts = shifts.filter(s => s.type === cat.value);
                                        if (catShifts.length === 0) return null;
                                        const Icon = cat.icon;
                                        return (
                                            <div key={cat.value} className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Icon className="size-3.5" />
                                                    <span className="uppercase tracking-wider">{cat.label}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {catShifts.map(s => {
                                                        const ShiftIcon = shiftIconFor(s.type);
                                                        const selected = newOpening.shiftIds.includes(s.id);
                                                        return (
                                                            <button
                                                                key={s.id}
                                                                type="button"
                                                                onClick={() => toggleOpeningShift(s.id)}
                                                                className={cn(
                                                                    "inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm transition-colors border",
                                                                    selected
                                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                                        : 'bg-card border-border text-muted-foreground hover:bg-muted'
                                                                )}
                                                            >
                                                                <ShiftIcon className="size-3.5" />
                                                                <span>{s.name}</span>
                                                                <span className="opacity-70 text-xs">{s.startTime}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-dashed border-emerald-500/30">
                            <Label className="text-eyebrow mb-2 block">Turnos puntuales sólo para esta apertura</Label>
                            <p className="text-xs text-muted-foreground mb-3">
                                Define turnos que no existen en el calendario normal (ej. un almuerzo especial sólo para ese día).
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-card/60 p-3 rounded-md border border-dashed border-emerald-500/20">
                                <div className="space-y-1.5 md:col-span-1">
                                    <Label className="text-eyebrow">Categoría</Label>
                                    <Select
                                        value={draftCustomShift.type}
                                        onValueChange={(val: 'BREAKFAST' | 'LUNCH' | 'DINNER') =>
                                            setDraftCustomShift({ ...draftCustomShift, type: val, name: getCategoryLabel(val) })
                                        }
                                    >
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BREAKFAST">Desayuno</SelectItem>
                                            <SelectItem value="LUNCH">Comida</SelectItem>
                                            <SelectItem value="DINNER">Cena</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5 md:col-span-1">
                                    <Label className="text-eyebrow">Nombre</Label>
                                    <Input
                                        className="h-9"
                                        value={draftCustomShift.name}
                                        onChange={(e) => setDraftCustomShift({ ...draftCustomShift, name: e.target.value })}
                                        placeholder="Brunch especial"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Inicio</Label>
                                    <Input
                                        type="time"
                                        className="h-9"
                                        value={draftCustomShift.startTime}
                                        onChange={(e) => setDraftCustomShift({ ...draftCustomShift, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Fin</Label>
                                    <Input
                                        type="time"
                                        className="h-9"
                                        value={draftCustomShift.endTime}
                                        onChange={(e) => setDraftCustomShift({ ...draftCustomShift, endTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-eyebrow">Intervalo</Label>
                                    <Input
                                        type="number"
                                        className="h-9"
                                        value={draftCustomShift.slotInterval}
                                        onChange={(e) => setDraftCustomShift({ ...draftCustomShift, slotInterval: parseInt(e.target.value) || 30 })}
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleAddCustomShift}
                                    variant="outline"
                                    className="h-9 gap-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                                >
                                    <Plus className="size-4" /> Añadir
                                </Button>
                            </div>

                            {newOpening.customShifts.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {newOpening.customShifts.map((cs, idx) => {
                                        const Icon = shiftIconFor(cs.type);
                                        return (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-2 pl-2 pr-1 h-8 rounded-md bg-emerald-600/10 border border-emerald-600/30 text-sm"
                                            >
                                                <Icon className="size-3.5 text-emerald-700" />
                                                <span className="text-emerald-800">{cs.name}</span>
                                                <span className="opacity-70 text-xs text-emerald-700">{cs.startTime}–{cs.endTime} · {cs.slotInterval}m</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCustomShift(idx)}
                                                    className="size-6 grid place-items-center rounded text-emerald-700 hover:bg-emerald-600/20"
                                                    aria-label="Quitar turno puntual"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {!editingOpeningId && (
                        <div className="pt-4 border-t border-dashed border-emerald-500/30">
                            <Label className="text-eyebrow mb-2 block">Mesas extra sólo para esta apertura</Label>
                            <p className="text-xs text-muted-foreground mb-3">
                                Añade mesas adicionales que sólo existirán ese día. Aparecerán en el dibujo de mesas (en gris hasta que llegue la fecha) y podrás colocarlas desde el <em>Arquitecto de Sala</em>.
                            </p>

                            {zones.length === 0 ? (
                                <p className="text-xs text-amber-600">Crea al menos una zona en el plano de mesas para poder añadir mesas extra.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end bg-card/60 p-3 rounded-md border border-dashed border-emerald-500/20">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label className="text-eyebrow">Zona</Label>
                                        <Select
                                            value={draftExtraTable.zoneId}
                                            onValueChange={(val) => setDraftExtraTable({ ...draftExtraTable, zoneId: val })}
                                        >
                                            <SelectTrigger className="w-full h-9">
                                                <SelectValue placeholder="Zona" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {zones.map(z => (
                                                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label className="text-eyebrow">Nombre (opcional)</Label>
                                        <Input
                                            className="h-9"
                                            value={draftExtraTable.name}
                                            onChange={(e) => setDraftExtraTable({ ...draftExtraTable, name: e.target.value })}
                                            placeholder={`Extra ${newOpening.extraTables.length + 1}`}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-eyebrow">Comensales</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            className="h-9"
                                            value={draftExtraTable.capacity}
                                            onChange={(e) => setDraftExtraTable({ ...draftExtraTable, capacity: parseInt(e.target.value) || 4 })}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={handleAddExtraTable}
                                        variant="outline"
                                        className="h-9 gap-2 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                                    >
                                        <Plus className="size-4" /> Añadir
                                    </Button>
                                </div>
                            )}

                            {newOpening.extraTables.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {newOpening.extraTables.map((t, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-2 pl-2 pr-1 h-8 rounded-md bg-amber-500/10 border border-amber-500/40 text-sm"
                                        >
                                            <Armchair className="size-3.5 text-amber-700" />
                                            <span className="text-amber-900">{t.name}</span>
                                            <span className="opacity-70 text-xs text-amber-700">{zoneName(t.zoneId)} · {t.capacity}p</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExtraTable(idx)}
                                                className="size-6 grid place-items-center rounded text-amber-700 hover:bg-amber-500/20"
                                                aria-label="Quitar mesa extra"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {openings.map(opening => {
                        const selectedShiftIds = new Set(opening.shiftIds.split(',').map(x => x.trim()).filter(Boolean));
                        const selectedShifts = shifts.filter(s => selectedShiftIds.has(s.id));
                        return (
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
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedShifts.length === 0 && (!opening.customShifts || opening.customShifts.length === 0) ? (
                                                <span className="text-[10px] text-muted-foreground italic">Sin turnos asignados</span>
                                            ) : (
                                                <>
                                                    {selectedShifts.map(s => {
                                                        const Icon = shiftIconFor(s.type);
                                                        return (
                                                            <span key={s.id} className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] bg-emerald-500/10 text-emerald-700">
                                                                <Icon className="size-3" />
                                                                {s.name}
                                                            </span>
                                                        );
                                                    })}
                                                    {(opening.customShifts || []).map((cs, idx) => {
                                                        const Icon = shiftIconFor(cs.type);
                                                        return (
                                                            <span key={`cs-${idx}`} className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] bg-emerald-600/20 text-emerald-800 border border-emerald-600/30">
                                                                <Icon className="size-3" />
                                                                {cs.name} <span className="opacity-70">{cs.startTime}</span>
                                                            </span>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                            {(opening.tables || []).map(t => (
                                                <span key={t.id} className="inline-flex items-center gap-1 pl-1.5 pr-0.5 h-5 rounded text-[10px] bg-amber-500/10 text-amber-800 border border-amber-500/30">
                                                    <Armchair className="size-3" />
                                                    {t.name} <span className="opacity-70">{zoneName(t.zoneId)}·{t.capacity}p</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteOpeningTable(t.id)}
                                                        className="size-4 grid place-items-center rounded text-amber-700 hover:bg-amber-500/20"
                                                        aria-label="Quitar mesa extra"
                                                    >
                                                        <Trash2 className="size-2.5" />
                                                    </button>
                                                </span>
                                            ))}
                                            {zones.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddTableToOpening(opening.id)}
                                                    className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] border border-dashed border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
                                                    title="Añadir una mesa extra a esta apertura"
                                                >
                                                    <Plus className="size-3" /> mesa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleStartEditOpening(opening)}
                                        className={cn(
                                            "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10",
                                            editingOpeningId === opening.id && "bg-emerald-500/10"
                                        )}
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteOpening(opening.id)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {openings.length === 0 && (
                        <div className="col-span-full text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-md">
                            No hay aperturas excepcionales configuradas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
