"use client";
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { fetchAPIAdmin } from '@/lib/api-admin';

type ManagedZone = {
    id?: string;
    name: string;
    index: number;
    isActive: boolean;
    _count?: { tables: number };
};

interface ZoneManagerProps {
    isOpen: boolean;
    restaurantId: string;
    onClose: () => void;
    /** Se llama tras guardar con éxito, para que la página recargue zonas/plano. */
    onSaved: () => void;
}

/**
 * Gestor de zonas del local (ficha del local): ordenar, renombrar,
 * activar/desactivar y crear zonas. El orden definido aquí es el que usan
 * el plano, los listados y el widget público (que preselecciona la primera).
 */
export default function ZoneManager({ isOpen, restaurantId, onClose, onSaved }: ZoneManagerProps) {
    const [zones, setZones] = useState<ManagedZone[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !restaurantId) return;
        setLoading(true);
        setError(null);
        fetchAPIAdmin<ManagedZone[]>(`/restaurant/${restaurantId}/zones/manage`)
            .then(data => { if (Array.isArray(data)) setZones(data); })
            .catch(() => setError('No se pudieron cargar las zonas.'))
            .finally(() => setLoading(false));
    }, [isOpen, restaurantId]);

    const move = (from: number, to: number) => {
        if (to < 0 || to >= zones.length) return;
        const next = [...zones];
        const [z] = next.splice(from, 1);
        next.splice(to, 0, z);
        setZones(next);
    };

    const update = (i: number, patch: Partial<ManagedZone>) => {
        setZones(prev => prev.map((z, idx) => idx === i ? { ...z, ...patch } : z));
    };

    const addZone = () => {
        setZones(prev => [...prev, { name: '', index: prev.length, isActive: true }]);
    };

    const removeUnsaved = (i: number) => {
        setZones(prev => prev.filter((_, idx) => idx !== i));
    };

    const handleSave = async () => {
        const cleaned = zones.filter(z => z.name.trim() !== '');
        if (cleaned.length === 0) {
            setError('Debe quedar al menos una zona con nombre.');
            return;
        }
        if (!cleaned.some(z => z.isActive)) {
            setError('Debe quedar al menos una zona activa.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            // El índice es la posición en la lista: lo que ves es lo que queda.
            const payload = cleaned.map((z, i) => ({
                ...(z.id ? { id: z.id } : {}),
                name: z.name.trim(),
                index: i,
                isActive: z.isActive,
            }));
            await fetchAPIAdmin(`/restaurant/${restaurantId}/zones/sync`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            onSaved();
            onClose();
        } catch {
            setError('Error guardando los cambios. Inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
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

                <h2 className="font-display text-xl font-medium tracking-tight mb-1">Zonas del local</h2>
                <p className="text-xs text-muted-foreground mb-4">
                    El orden definido aquí es el del plano y el widget de reservas: la primera zona
                    es la que se ofrece por defecto al cliente. Las zonas inactivas no aparecen
                    en el widget ni reciben reservas, pero conservan sus mesas.
                </p>

                {loading && <p className="text-sm text-muted-foreground py-6 text-center italic">Cargando zonas…</p>}

                {!loading && (
                    <div className="space-y-2">
                        {zones.map((zone, i) => (
                            <div
                                key={zone.id ?? `new-${i}`}
                                className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"
                            >
                                <div className="flex flex-col">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="h-5 w-6"
                                        disabled={i === 0}
                                        onClick={() => move(i, i - 1)}
                                        aria-label={`Subir ${zone.name || 'zona'}`}
                                    >
                                        <ArrowUp className="size-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="h-5 w-6"
                                        disabled={i === zones.length - 1}
                                        onClick={() => move(i, i + 1)}
                                        aria-label={`Bajar ${zone.name || 'zona'}`}
                                    >
                                        <ArrowDown className="size-3" />
                                    </Button>
                                </div>
                                <span className="text-xs text-muted-foreground tabular-nums w-4 text-center">{i + 1}</span>
                                <Input
                                    className="h-8 flex-1"
                                    placeholder="Nombre de la zona"
                                    value={zone.name}
                                    onChange={e => update(i, { name: e.target.value })}
                                />
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap w-14 text-right">
                                    {zone._count ? `${zone._count.tables} mesas` : 'nueva'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Switch
                                        checked={zone.isActive}
                                        onCheckedChange={(v: boolean) => update(i, { isActive: v })}
                                        aria-label={`Zona ${zone.name || ''} activa`}
                                    />
                                </div>
                                {!zone.id && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => removeUnsaved(i)}
                                        aria-label="Quitar zona sin guardar"
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={addZone}>
                            <Plus className="size-3.5" /> Añadir zona
                        </Button>
                    </div>
                )}

                {error && <p className="text-sm text-destructive mt-3">{error}</p>}

                <div className="flex justify-end gap-2 mt-5">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving ? 'Guardando…' : 'Guardar zonas'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
