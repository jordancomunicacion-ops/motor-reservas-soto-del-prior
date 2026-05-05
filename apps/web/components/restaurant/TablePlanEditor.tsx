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
    Move, 
    Save, 
    Layout, 
    Type, 
    Users,
    Link as LinkIcon,
    Unlink
} from "lucide-react";
import { fetchAPI } from "@/lib/api";
import TablePlan from "./TablePlan";
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
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'RECTANGLE' | 'ROUND';
    rotation: number;
    contiguousTableIds?: string[]; // We'll store this in metadata or a dedicated field if we update schema
}

export default function TablePlanEditor({ restaurantId }: { restaurantId: string }) {
    const [zones, setZones] = useState<Zone[]>([]);
    const [activeZoneId, setActiveZoneId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Selection state
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [restaurantId]);

    async function loadData() {
        setLoading(true);
        try {
            const data = await fetchAPI(`/restaurant/${restaurantId}/tables`);
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
    // Find selected table in any zone to be more robust
    const selectedTable = zones.flatMap(z => z.tables).find(t => t.id === selectedTableId);

    const handleAddZone = async () => {
        const name = prompt("Nombre de la nueva área (ej: Terraza):");
        if (!name) return;
        
        try {
            const newZone = await fetchAPI(`/restaurant/zones`, {
                method: 'POST',
                body: JSON.stringify({ restaurantId, name })
            });
            setZones([...zones, { ...newZone, tables: [] }]);
            setActiveZoneId(newZone.id);
        } catch (e) {
            alert("Error al crear área");
        }
    };

    const handleDeleteZone = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta área y todas sus mesas?")) return;
        // In a real app, we'd call a DELETE endpoint. 
        // For now, let's assume we can sync the whole state.
        setZones(zones.filter(z => z.id !== id));
        if (activeZoneId === id) setActiveZoneId(zones[0]?.id || "");
    };

    const handleAddTable = () => {
        if (!activeZoneId) return;
        
        const newTable: Table = {
            id: `temp-${Date.now()}`,
            name: `M${(activeZone?.tables.length || 0) + 1}`,
            capacity: 4,
            x: 100,
            y: 100,
            width: 60,
            height: 60,
            shape: 'RECTANGLE',
            rotation: 0,
            contiguousTableIds: []
        };

        setZones(zones.map(z => 
            z.id === activeZoneId 
                ? { ...z, tables: [...z.tables, newTable] } 
                : z
        ));
        setSelectedTableId(newTable.id);
    };

    const handleUpdateTable = (tableId: string, updates: any) => {
        setZones(prevZones => prevZones.map(z => ({
            ...z,
            tables: z.tables.map(t => t.id === tableId ? { ...t, ...updates } : t)
        })));
    };

    // New helper for multiple updates at once
    const handleUpdateTables = (updates: { id: string, data: any }[]) => {
        setZones(prevZones => prevZones.map(z => ({
            ...z,
            tables: z.tables.map(t => {
                const update = updates.find(u => u.id === t.id);
                return update ? { ...t, ...update.data } : t;
            })
        })));
    };

    const handleDeleteTable = (tableId: string) => {
        setZones(zones.map(z => ({
            ...z,
            tables: z.tables.filter(t => t.id !== tableId)
        })));
        setSelectedTableId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedZones = [...zones];
            
            for (let i = 0; i < updatedZones.length; i++) {
                const zone = updatedZones[i];
                // 1. Prepare tables (strip temp IDs but keep a ref for mapping)
                const tablesToSync = zone.tables.map(t => ({
                    ...t,
                    originalId: t.id,
                    id: t.id.startsWith('temp-') ? undefined : t.id
                }));

                const savedTables = await fetchAPI(`/restaurant/zones/${zone.id}/tables/sync`, {
                    method: 'POST',
                    body: JSON.stringify(tablesToSync)
                });
                
                // Create a mapping of originalId (temp or real) to NEW real ID
                // We use 'name' as a secondary correlation if originalId is lost, 
                // but syncTables should return them in order or with enough info.
                // For now, let's assume the backend returns them in same order or we match by name.
                const idMap: Record<string, string> = {};
                savedTables.forEach((st: any, idx: number) => {
                    idMap[tablesToSync[idx].originalId] = st.id;
                });

                // Update the state tables with real IDs
                updatedZones[i] = { 
                    ...zone, 
                    tables: savedTables.map((st: any) => ({
                        ...st,
                        // Fix contiguousTableIds using the map
                        contiguousTableIds: (st.metadata?.contiguousTableIds || st.contiguousTableIds || [])
                            .map((oldId: string) => idMap[oldId] || oldId)
                    }))
                };
            }
            
            // Second pass across ALL zones to fix cross-zone links if any (though usually intra-zone)
            // For now, just set state.
            setZones(updatedZones);
            alert("Plano guardado correctamente");
        } catch (e) {
            console.error(e);
            alert("Error al guardar el plano");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando editor de plano...</div>;

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
                        {zones.map(z => (
                            <button
                                key={z.id}
                                onClick={() => setActiveZoneId(z.id)}
                                className={cn(
                                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                    activeZoneId === z.id 
                                        ? "bg-white dark:bg-zinc-800 shadow text-blue-600 font-bold" 
                                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                            >
                                {z.name}
                            </button>
                        ))}
                        <button
                            onClick={handleAddZone}
                            className="px-3 py-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Añadir área"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" className="gap-2" onClick={handleAddTable} disabled={!activeZoneId}>
                        <Plus className="w-4 h-4" /> Añadir Mesa
                    </Button>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Plano'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Main Canvas */}
                <div className="flex-1 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden relative">
                    <TablePlan 
                        zones={zones} 
                        tables={zones.flatMap(z => z.tables.map(t => ({ ...t, zoneId: z.id })))} 
                        onTableUpdate={handleUpdateTable}
                        onBookingMove={() => {}} 
                        onTableSelect={setSelectedTableId}
                        selectedTableId={selectedTableId}
                        mode="EDIT"
                        hideToolbar={true}
                        className="h-full"
                    />
                    
                    {/* Overlay for selection handled by parent if needed, 
                        but for now let's use TablePlan's internal state or pass it down */}
                </div>

                {/* Sidebar Properties */}
                <aside className="w-80 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                    <Card className="shadow-sm border-gray-100 dark:border-zinc-700">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Layout className="w-5 h-5 text-blue-500" />
                                Propiedades
                            </CardTitle>
                            <CardDescription>
                                {selectedTable ? `Mesa: ${selectedTable.name}` : "Selecciona una mesa en el plano para editarla"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!selectedTable ? (
                                <div className="py-8 text-center text-gray-400 italic text-sm">
                                    Haz clic en una mesa para ver sus ajustes
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Type className="w-3.5 h-3.5" /> Nombre / Etiqueta
                                        </Label>
                                        <Input 
                                            value={selectedTable.name} 
                                            onChange={e => handleUpdateTable(selectedTable.id, { name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" /> Capacidad Máxima
                                        </Label>
                                        <Input 
                                            type="number" 
                                            value={selectedTable.capacity} 
                                            onChange={e => handleUpdateTable(selectedTable.id, { capacity: parseInt(e.target.value) })}
                                        />
                                    </div>

                                    <div className="pt-4 border-t">
                                        <Label className="mb-3 block text-xs uppercase font-bold text-gray-400">Apariencia</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button 
                                                variant={selectedTable.shape === 'RECTANGLE' ? 'default' : 'outline'} 
                                                className="gap-2 text-xs h-9"
                                                onClick={() => handleUpdateTable(selectedTable.id, { shape: 'RECTANGLE' })}
                                            >
                                                <Square className="w-4 h-4" /> Rectangular
                                            </Button>
                                            <Button 
                                                variant={selectedTable.shape === 'ROUND' ? 'default' : 'outline'} 
                                                className="gap-2 text-xs h-9"
                                                onClick={() => handleUpdateTable(selectedTable.id, { shape: 'ROUND' })}
                                            >
                                                <Circle className="w-4 h-4" /> Redonda
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-zinc-500">Rotación</Label>
                                            <div className="flex gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="h-9" 
                                                    value={selectedTable.rotation || 0}
                                                    onChange={e => handleUpdateTable(selectedTable.id, { rotation: parseInt(e.target.value) || 0 })}
                                                />
                                                <Button variant="outline" size="icon" className="shrink-0" onClick={() => handleUpdateTable(selectedTable.id, { rotation: ((selectedTable.rotation || 0) + 45) % 360 })}>
                                                    <RotateCw className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] uppercase font-bold text-zinc-500">Tamaño (PX)</Label>
                                            <Input 
                                                type="number" 
                                                className="h-9" 
                                                value={selectedTable.width || 60}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value) || 60;
                                                    handleUpdateTable(selectedTable.id, { width: val, height: val });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1 pt-2">
                                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Pérdida por Unión (Comensales)</Label>
                                        <Input 
                                            type="number" 
                                            className="h-9" 
                                            placeholder="Suele ser 1"
                                            value={selectedTable.seatsLostPerJoin || 1}
                                            onChange={e => handleUpdateTable(selectedTable.id, { seatsLostPerJoin: parseInt(e.target.value) || 1 })}
                                        />
                                        <p className="text-[9px] text-muted-foreground">Sillas que se pierden al pegar esta mesa a otra.</p>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <Label className="mb-3 block text-xs uppercase font-bold text-gray-400 flex items-center gap-2">
                                            <LinkIcon className="w-3 h-3" /> Mesas Contiguas
                                        </Label>
                                        <p className="text-[10px] text-muted-foreground mb-2">Permite unir estas mesas para reservas grandes.</p>
                                        <div className="flex flex-wrap gap-1">
                                            {(() => {
                                                // Find the zone this table belongs to
                                                const tableZone = zones.find(z => z.tables.some(t => t.id === selectedTable.id));
                                                if (!tableZone) return null;

                                                const otherTables = tableZone.tables.filter(t => t.id !== selectedTable.id);
                                                
                                                if (otherTables.length === 0) {
                                                    return <p className="text-[10px] text-muted-foreground italic">No hay otras mesas en esta área para unir.</p>;
                                                }

                                                return otherTables.map(t => {
                                                    const isLinked = selectedTable.contiguousTableIds?.includes(t.id);
                                                    return (
                                                        <Button 
                                                            key={t.id}
                                                            variant={isLinked ? "secondary" : "outline"}
                                                            className={cn(
                                                                "h-8 px-3 text-xs gap-2 rounded-full transition-all", 
                                                                isLinked && "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-sm"
                                                            )}
                                                            onClick={() => {
                                                                const current = selectedTable.contiguousTableIds || [];
                                                                const next = isLinked ? current.filter(id => id !== t.id) : [...current, t.id];
                                                                
                                                                // Symmetric link
                                                                const otherCurrent = t.contiguousTableIds || [];
                                                                const otherNext = isLinked ? otherCurrent.filter(id => id !== selectedTable.id) : [...otherCurrent, selectedTable.id];
                                                                
                                                                handleUpdateTables([
                                                                    { id: selectedTable.id, data: { contiguousTableIds: next } },
                                                                    { id: t.id, data: { contiguousTableIds: otherNext } }
                                                                ]);
                                                            }}
                                                        >
                                                            {isLinked ? <LinkIcon className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                            {t.name}
                                                        </Button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t mt-6 flex flex-col gap-3">
                                        <Button 
                                            className="w-full gap-2 bg-blue-600 hover:bg-blue-700" 
                                            onClick={handleSave}
                                            disabled={saving}
                                        >
                                            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            className="w-full gap-2" 
                                            onClick={() => handleDeleteTable(selectedTable.id)}
                                        >
                                            <Trash2 className="w-4 h-4" /> Eliminar Mesa
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </aside>
            </div>
            
            {/* Inject a script to handle table selection from TablePlan click */}
            <style jsx global>{`
                .table-node-selected {
                    ring: 2px solid #2563eb;
                    ring-offset: 2px;
                    z-index: 100;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #3f3f46;
                }
            `}</style>
        </div>
    );
}
