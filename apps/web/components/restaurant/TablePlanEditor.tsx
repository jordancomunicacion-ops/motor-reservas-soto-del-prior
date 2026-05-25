"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Plus,
    Trash2,
    RotateCw,
    Square,
    Circle,
    Save,
    Layout,
    Type,
    Users,
    Link as LinkIcon,
    Loader2,
    X,
    Settings2,
} from "lucide-react";
import { fetchAPIAdmin } from "@/lib/api-admin";
import TablePlan, { type TableUpdates } from "./TablePlan";
import { cn } from "@/lib/utils";

interface Zone {
    id: string;
    name: string;
    tables: Table[];
}

interface Table {
    id: string;
    name: string;
    capacity: number;
    minPax: number;
    maxPax: number;
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'RECTANGLE' | 'ROUND';
    rotation: number;
    seatsLostPerJoin: number;
    contiguousTableIds?: string[];
}

export default function TablePlanEditor({ restaurantId }: { restaurantId: string }) {
    const [zones, setZones] = useState<Zone[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    // En xl+ el panel de propiedades vive a la derecha siempre.
    // En pantallas menores se abre como drawer al seleccionar mesa o pulsar el botón.
    const [propsOpenMobile, setPropsOpenMobile] = useState(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId]);

    useEffect(() => {
        if (selectedTableId) setPropsOpenMobile(true);
    }, [selectedTableId]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await fetchAPIAdmin<Zone[]>(`/restaurant/${restaurantId}/tables`);
            if (Array.isArray(data)) {
                setZones(data);
                if (data.length > 0 && !activeZoneId) {
                    setActiveZoneId(data[0].id);
                }
            }
        } catch (e) {
            console.error("Error loading table plan", e);
        } finally {
            setLoading(false);
        }
    }

    const activeZone = zones.find(z => z.id === activeZoneId);
    const selectedTable = zones.flatMap(z => z.tables).find(t => t.id === selectedTableId);

    const handleAddZone = async () => {
        const name = prompt("Nombre de la nueva área (ej: Terraza):");
        if (!name) return;

        try {
            const newZone = await fetchAPIAdmin<Zone>(`/restaurant/zones`, {
                method: 'POST',
                body: JSON.stringify({ restaurantId, name }),
            });
            setZones([...zones, { ...newZone, tables: [] }]);
            setActiveZoneId(newZone.id);
        } catch {
            alert("Error al crear área");
        }
    };

    const handleAddTable = () => {
        if (!activeZoneId) return;

        const newTable: Table = {
            id: `temp-${Date.now()}`,
            name: `M${(activeZone?.tables.length || 0) + 1}`,
            capacity: 4,
            minPax: 1,
            maxPax: 4,
            x: 100,
            y: 100,
            width: 60,
            height: 60,
            shape: 'RECTANGLE',
            rotation: 0,
            seatsLostPerJoin: 1,
            contiguousTableIds: [],
        };

        setZones(zones.map(z =>
            z.id === activeZoneId
                ? { ...z, tables: [...z.tables, newTable] }
                : z,
        ));
        setSelectedTableId(newTable.id);
    };

    const handleUpdateTable = (tableId: string, updates: TableUpdates) => {
        setZones(prevZones => prevZones.map(z => ({
            ...z,
            tables: z.tables.map(t => t.id === tableId ? { ...t, ...updates } as Table : t),
        })));
    };

    const handleUpdateTables = (updates: { id: string; data: Partial<Table> }[]) => {
        setZones(prevZones => prevZones.map(z => ({
            ...z,
            tables: z.tables.map(t => {
                const update = updates.find(u => u.id === t.id);
                return update ? { ...t, ...update.data } : t;
            }),
        })));
    };

    const handleDeleteTable = (tableId: string) => {
        setZones(zones.map(z => ({
            ...z,
            tables: z.tables.filter(t => t.id !== tableId),
        })));
        setSelectedTableId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedZones = [...zones];

            for (let i = 0; i < updatedZones.length; i++) {
                const zone = updatedZones[i];
                const tablesToSync = zone.tables.map(t => ({
                    ...t,
                    originalId: t.id,
                    id: t.id.startsWith('temp-') ? undefined : t.id,
                }));

                type SavedTable = Table & {
                    metadata?: { contiguousTableIds?: string[] } | null;
                };
                const savedTables = await fetchAPIAdmin<SavedTable[]>(`/restaurant/zones/${zone.id}/tables/sync`, {
                    method: 'POST',
                    body: JSON.stringify(tablesToSync),
                });

                const idMap: Record<string, string> = {};
                savedTables.forEach((st, idx) => {
                    idMap[tablesToSync[idx].originalId] = st.id;
                });

                updatedZones[i] = {
                    ...zone,
                    tables: savedTables.map(st => ({
                        ...st,
                        contiguousTableIds: (st.metadata?.contiguousTableIds || st.contiguousTableIds || [])
                            .map(oldId => idMap[oldId] || oldId),
                    })),
                };
            }

            setZones(updatedZones);
            alert("Plano guardado correctamente");
        } catch (e) {
            console.error(e);
            alert("Error al guardar el plano");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2">
                <Loader2 className="size-4 animate-spin" /> Cargando editor de plano…
            </div>
        );
    }

    const propertiesCard = (
        <Card>
            <CardHeader>
                <CardTitle className="font-display text-base font-medium tracking-tight inline-flex items-center gap-2">
                    <Layout className="size-4 text-primary" />
                    Propiedades
                </CardTitle>
                <CardDescription>
                    {selectedTable
                        ? `Mesa: ${selectedTable.name}`
                        : "Selecciona una mesa en el plano para editarla."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!selectedTable ? (
                    <div className="py-8 text-center text-xs text-muted-foreground italic">
                        Haz clic en una mesa para ver sus ajustes.
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                            <Label htmlFor="t-name" className="text-eyebrow inline-flex items-center gap-1.5">
                                <Type className="size-3" /> Nombre / etiqueta
                            </Label>
                            <Input
                                id="t-name"
                                className="h-10"
                                value={selectedTable.name}
                                onChange={e => handleUpdateTable(selectedTable.id, { name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="t-min" className="text-eyebrow inline-flex items-center gap-1.5">
                                    <Users className="size-3" /> Mín. pax
                                </Label>
                                <Input
                                    id="t-min"
                                    type="number"
                                    className="h-10 tabular-nums"
                                    value={selectedTable.minPax || 1}
                                    onChange={e => handleUpdateTable(selectedTable.id, { minPax: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="t-max" className="text-eyebrow inline-flex items-center gap-1.5">
                                    <Users className="size-3" /> Máx. pax
                                </Label>
                                <Input
                                    id="t-max"
                                    type="number"
                                    className="h-10 tabular-nums"
                                    value={selectedTable.maxPax || selectedTable.capacity}
                                    onChange={e => {
                                        const v = parseInt(e.target.value) || selectedTable.capacity;
                                        handleUpdateTable(selectedTable.id, { maxPax: v, capacity: v });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/60 space-y-2">
                            <Label className="text-eyebrow">Apariencia</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant={selectedTable.shape === 'RECTANGLE' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleUpdateTable(selectedTable.id, { shape: 'RECTANGLE' })}
                                >
                                    <Square className="size-3.5" /> Rectangular
                                </Button>
                                <Button
                                    variant={selectedTable.shape === 'ROUND' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleUpdateTable(selectedTable.id, { shape: 'ROUND' })}
                                >
                                    <Circle className="size-3.5" /> Redonda
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="t-rot" className="text-eyebrow">Rotación</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="t-rot"
                                        type="number"
                                        className="h-9 tabular-nums"
                                        value={selectedTable.rotation || 0}
                                        onChange={e => handleUpdateTable(selectedTable.id, { rotation: parseInt(e.target.value) || 0 })}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon-sm"
                                        className="shrink-0"
                                        onClick={() => handleUpdateTable(selectedTable.id, { rotation: ((selectedTable.rotation || 0) + 45) % 360 })}
                                        aria-label="Rotar 45°"
                                    >
                                        <RotateCw className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="t-size" className="text-eyebrow">Tamaño (px)</Label>
                                <Input
                                    id="t-size"
                                    type="number"
                                    className="h-9 tabular-nums"
                                    value={selectedTable.width || 60}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 60;
                                        handleUpdateTable(selectedTable.id, { width: val, height: val });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <Label htmlFor="t-loss" className="text-eyebrow">Pérdida por unión (comensales)</Label>
                            <Input
                                id="t-loss"
                                type="number"
                                className="h-9 tabular-nums"
                                placeholder="Suele ser 1"
                                value={selectedTable.seatsLostPerJoin || 1}
                                onChange={e => handleUpdateTable(selectedTable.id, { seatsLostPerJoin: parseInt(e.target.value) || 1 })}
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Sillas que se pierden al pegar esta mesa a otra.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-border/60 space-y-2">
                            <Label className="text-eyebrow inline-flex items-center gap-1.5">
                                <LinkIcon className="size-3" /> Mesas contiguas
                            </Label>
                            <p className="text-[11px] text-muted-foreground">
                                Permite unir estas mesas para reservas grandes.
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {(() => {
                                    const tableZone = zones.find(z => z.tables.some(t => t.id === selectedTable.id));
                                    if (!tableZone) return null;

                                    const otherTables = tableZone.tables.filter(t => t.id !== selectedTable.id);

                                    if (otherTables.length === 0) {
                                        return <p className="text-[11px] text-muted-foreground italic">No hay otras mesas en esta área para unir.</p>;
                                    }

                                    return otherTables.map(t => {
                                        const isLinked = selectedTable.contiguousTableIds?.includes(t.id);
                                        return (
                                            <Button
                                                key={t.id}
                                                variant={isLinked ? "default" : "outline"}
                                                size="sm"
                                                className="h-8 px-3 text-xs rounded-full"
                                                onClick={() => {
                                                    const current = selectedTable.contiguousTableIds || [];
                                                    const next = isLinked
                                                        ? current.filter(id => id !== t.id)
                                                        : [...current, t.id];

                                                    const otherCurrent = t.contiguousTableIds || [];
                                                    const otherNext = isLinked
                                                        ? otherCurrent.filter(id => id !== selectedTable.id)
                                                        : [...otherCurrent, selectedTable.id];

                                                    handleUpdateTables([
                                                        { id: selectedTable.id, data: { contiguousTableIds: next } },
                                                        { id: t.id, data: { contiguousTableIds: otherNext } },
                                                    ]);
                                                }}
                                            >
                                                {isLinked ? <LinkIcon className="size-3" /> : <Plus className="size-3" />}
                                                {t.name}
                                            </Button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border/60 flex flex-col gap-2">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                                {saving ? 'Guardando…' : 'Guardar cambios'}
                            </Button>
                            <Button variant="destructive" onClick={() => handleDeleteTable(selectedTable.id)}>
                                <Trash2 className="size-3.5" /> Eliminar mesa
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-3 sm:gap-4 h-full min-h-0">
            <div className="flex justify-between items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card px-3 sm:px-4 py-2.5 sm:py-3 flex-wrap">
                <div className="inline-flex rounded-md border border-border p-0.5 bg-background overflow-x-auto max-w-full">
                    {zones.map(z => (
                        <button
                            key={z.id}
                            type="button"
                            onClick={() => setActiveZoneId(z.id)}
                            className={cn(
                                "px-3 h-8 rounded text-xs font-medium transition-colors whitespace-nowrap",
                                activeZoneId === z.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {z.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddZone}
                        className="px-2 h-8 inline-flex items-center text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="Añadir área"
                        aria-label="Añadir área"
                    >
                        <Plus className="size-3.5" />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleAddTable} disabled={!activeZoneId} className="gap-1">
                        <Plus className="size-3.5" />
                        <span className="hidden sm:inline">Añadir mesa</span>
                        <span className="sm:hidden">Mesa</span>
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
                        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                        <span className="hidden sm:inline">{saving ? 'Guardando…' : 'Guardar plano'}</span>
                        <span className="sm:hidden">{saving ? '…' : 'Guardar'}</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        className="xl:hidden"
                        onClick={() => setPropsOpenMobile(true)}
                        aria-label="Propiedades de la mesa"
                    >
                        <Settings2 className="size-3.5" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
                <div className="flex-1 min-w-0 rounded-lg border border-border bg-card overflow-hidden relative">
                    <TablePlan
                        zones={zones}
                        tables={zones.flatMap(z => z.tables.map(t => ({ ...t, zoneId: z.id })))}
                        activeZoneId={activeZoneId}
                        onActiveZoneChange={setActiveZoneId}
                        onTableUpdate={handleUpdateTable}
                        onBookingMove={() => { }}
                        onTableSelect={setSelectedTableId}
                        selectedTableId={selectedTableId}
                        mode="EDIT"
                        hideToolbar={true}
                        className="h-full"
                    />
                </div>

                <aside className="w-80 hidden xl:flex flex-col space-y-4 overflow-y-auto pr-1">
                    {propertiesCard}
                </aside>
            </div>

            {/* Drawer móvil/tablet con propiedades de mesa */}
            {propsOpenMobile && (
                <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setPropsOpenMobile(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[min(92vw,360px)] bg-background border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                            <span className="font-display text-base font-medium">Propiedades</span>
                            <Button variant="ghost" size="icon-sm" onClick={() => setPropsOpenMobile(false)} aria-label="Cerrar">
                                <X className="size-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3">
                            {propertiesCard}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

