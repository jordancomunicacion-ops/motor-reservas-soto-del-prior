'use client';

import React, { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Coffee, Utensils, Moon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarOff } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Closure {
    id: string;
    date: string;
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
    { label: 'Desayunos', value: 'BREAKFAST', icon: Coffee, color: 'text-amber-600 bg-amber-50' },
    { label: 'Comidas', value: 'LUNCH', icon: Utensils, color: 'text-blue-600 bg-blue-50' },
    { label: 'Cenas', value: 'DINNER', icon: Moon, color: 'text-indigo-600 bg-indigo-50' },
];

const getCategoryLabel = (type: string) => {
    switch(type) {
        case 'BREAKFAST': return 'Desayuno';
        case 'LUNCH': return 'Comida';
        case 'DINNER': return 'Cena';
        default: return '';
    }
}


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
    const [newClosure, setNewClosure] = useState({ date: '', reason: '' });

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
            await fetchAPI(`/restaurant/${restaurantId}/shifts`, {
                method: 'POST',
                body: JSON.stringify(newShift)
            });
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
            alert('Error al crear el turno');
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
        
        try {
            await fetchAPI(`/restaurant/${restaurantId}/closures`, {
                method: 'POST',
                body: JSON.stringify(newClosure)
            });
            setNewClosure({ date: '', reason: '' });
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end bg-muted/30 p-5 rounded-2xl border-2 border-dashed border-muted">
                <div className="space-y-2 lg:col-span-1">
                    <Label className="text-xs font-bold uppercase opacity-60">Categoría</Label>
                    <Select 
                        value={newShift.type} 
                        onValueChange={(val: 'BREAKFAST' | 'LUNCH' | 'DINNER') => 
                            setNewShift({...newShift, type: val, name: getCategoryLabel(val)})
                        }
                    >
                        <SelectTrigger className="bg-white">
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
                    <Label className="text-xs font-bold uppercase opacity-60">Inicio</Label>
                    <Input 
                        className="bg-white"
                        type="time" 
                        value={newShift.startTime}
                        onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase opacity-60">Fin</Label>
                    <Input 
                        className="bg-white"
                        type="time" 
                        value={newShift.endTime}
                        onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase opacity-60">Intervalo</Label>
                    <Input 
                        className="bg-white"
                        type="number" 
                        value={newShift.slotInterval}
                        onChange={(e) => setNewShift({...newShift, slotInterval: parseInt(e.target.value)})}
                    />
                </div>
                <Button onClick={handleAddShift} className="gap-2 shadow-md">
                    <Plus className="w-4 h-4" /> Añadir
                </Button>
            </div>

            <div className="space-y-10">
                {shifts.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/5 border-2 border-dashed rounded-2xl">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No hay turnos configurados para este restaurante.</p>
                    </div>
                )}
                
                {categories.map((cat) => {
                    const catShifts = shifts.filter(s => s.type === cat.value);
                    if (catShifts.length === 0) return null;

                    const Icon = cat.icon;

                    return (
                        <div key={cat.value} className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <div className={`p-1.5 rounded-lg ${cat.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-lg">{cat.label}</h3>
                                <Badge variant="outline" className="ml-auto">{catShifts.length} turnos</Badge>
                            </div>

                            <div className="grid gap-3">
                                {catShifts.map((shift) => (
                                    <div key={shift.id} className="flex items-center justify-between p-4 border-2 border-transparent bg-muted/10 rounded-2xl hover:bg-muted/20 hover:border-muted/30 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                                <Clock className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <div className="font-bold">{shift.name}</div>
                                                <div className="text-sm text-muted-foreground font-medium">
                                                    {shift.startTime} - {shift.endTime} <span className="mx-2 opacity-30">|</span> Cada {shift.slotInterval} min
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex gap-1">
                                                {days.map((d) => (
                                                    <Badge 
                                                        key={d.value}
                                                        variant={shift.daysOfWeek.includes(d.value) ? "default" : "outline"}
                                                        className={`w-6 h-6 p-0 flex items-center justify-center rounded-full text-[10px] border-none ${shift.daysOfWeek.includes(d.value) ? 'bg-primary' : 'bg-muted/40 opacity-40'}`}
                                                    >
                                                        {d.label}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Button 
                                                onClick={() => handleDeleteShift(shift.id)}
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="pt-8 border-t border-dashed mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                        <CalendarOff className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">Días de Cierre Extraordinarios</h3>
                        <p className="text-sm text-muted-foreground">Bloquea fechas específicas (vacaciones, eventos privados) para que no se puedan reservar.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-red-50/50 dark:bg-red-900/10 p-5 rounded-2xl border-2 border-dashed border-red-100 dark:border-red-900/30 mb-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase opacity-60">Fecha a Bloquear</Label>
                        <Input 
                            type="date" 
                            className="bg-white"
                            value={newClosure.date}
                            onChange={(e) => setNewClosure({...newClosure, date: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase opacity-60">Motivo (Opcional)</Label>
                        <Input 
                            type="text" 
                            className="bg-white"
                            placeholder="Ej: Vacaciones, Evento Privado"
                            value={newClosure.reason}
                            onChange={(e) => setNewClosure({...newClosure, reason: e.target.value})}
                        />
                    </div>
                    <Button onClick={handleAddClosure} variant="destructive" className="gap-2 shadow-md">
                        <Plus className="w-4 h-4" /> Bloquear Día
                    </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {closures.map(closure => (
                        <div key={closure.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl border shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                                    <CalendarOff className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium capitalize">
                                        {(() => {
                                            try {
                                                return format(new Date(closure.date), "eeee d 'de' MMMM", { locale: es });
                                            } catch (e) {
                                                return 'Fecha no válida';
                                            }
                                        })()}
                                    </div>
                                    {closure.reason && <div className="text-xs text-muted-foreground">{closure.reason}</div>}
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteClosure(closure.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                                Desbloquear
                            </Button>
                        </div>
                    ))}
                    {closures.length === 0 && (
                        <div className="col-span-full text-center py-6 text-sm text-muted-foreground italic border border-dashed rounded-xl">
                            No hay días bloqueados excepcionalmente.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

