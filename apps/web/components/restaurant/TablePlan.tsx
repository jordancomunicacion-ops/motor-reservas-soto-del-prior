"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Users, RotateCw, Armchair, LayoutGrid, Link as LinkIcon, MessageSquare, GlassWater, UserCheck, FileText, LogOut, UserCircle, Cake, Maximize2, Minus, Plus as PlusIcon, CalendarClock } from "lucide-react";
import type { BookingOnTable, TableNodeData, ZoneWithTables } from '@/types/restaurant';
import type { GuestBookingProfile } from './GuestProfileSheet';
import { formatTimeInTz } from '@/lib/timezone';

export type TableUpdates = Partial<TableNodeData> & { bookingStatus?: string };

/** Etiqueta legible de la apertura de una mesa extra (ej: "12 abr" o "12 abr · Cena especial"). */
function openingLabel(opening?: TableNodeData['opening']): string {
    if (!opening) return '';
    try {
        const d = new Date(opening.date);
        const fecha = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        return opening.reason ? `${fecha} · ${opening.reason}` : fecha;
    } catch {
        return opening.reason || '';
    }
}

interface TableProps {
    data: TableNodeData;
    onUpdate?: (id: string, updates: TableUpdates) => void;
    onDropReservation: (tableId: string, bookingData: { id: string }) => void;
    onSelect?: (id: string) => void;
    mode: 'VIEW' | 'EDIT' | 'SERVICE';
    isSelected?: boolean;
    /** En clusters de mesas unidas: la mesa se resalta como parte del grupo, pero
     *  solo la mesa pulsada (isSelected) muestra el menú de acciones/edición. */
    isInSelectedCluster?: boolean;
    onSelectProfile?: (booking: GuestBookingProfile) => void;
    timezone?: string;
}

function TableNode({ data, onUpdate, onDropReservation, onSelect, onSelectProfile, mode, isSelected, isInSelectedCluster, timezone }: TableProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<'bottom' | 'top'>('bottom');
    const tableRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSelected && tableRef.current) {
            const rect = tableRef.current.getBoundingClientRect();
            // Check if there is enough space below (approx 60px for the dropdown)
            const parent = tableRef.current.offsetParent?.getBoundingClientRect();
            if (parent && (rect.bottom - parent.top) + 60 > parent.height) {
                setDropdownPos('top');
            } else {
                setDropdownPos('bottom');
            }
        }
    }, [isSelected]);

    // Status Colors mapping based on the provided legend.
    // El plano de sala mantiene colores de estado vivos porque es información operativa
    // codificada por color (libre / sentada / postre / etc). No se tokeniza para no perder
    // el lenguaje visual del servicio.
    // Mesa extra de una apertura excepcional: sólo "existe" su día. En el editor se
    // muestra atenuada/ámbar (aún no activa) para poder colocarla; en servicio sólo
    // llega aquí el día que toca, y se pinta como una mesa normal.
    const isOpeningTable = !!data.openingId;

    const getStatusStyle = () => {
        if (mode === 'EDIT') {
            return isOpeningTable
                ? "bg-amber-100/70 border-amber-400 border-dashed text-amber-900"
                : "bg-muted border-border text-foreground";
        }
        if (!data.isActive) return "bg-muted border-border text-muted-foreground";

        const bookings: BookingOnTable[] = data.resBookings || [];

        // Find the "most active" booking (the one that should define the color)
        const activeBooking = bookings.find(b =>
            ['SEATED', 'BAR_ARRIVAL', 'DESSERT', 'BILL_REQUESTED', 'CLEANING', 'TO_REVIEW'].includes(b.status)
        ) || bookings[0];

        // If no booking or it's released, it's FREE (Emerald)
        if (!activeBooking || activeBooking.status === 'RELEASED') {
            return "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600";
        }

        // --- Turnover Warning (YELLOW) ---
        // If the table is currently occupied but there's another reservation starting in less than 45 mins
        const nextBooking = bookings.find(b =>
            new Date(b.date).getTime() > new Date().getTime() && b.id !== activeBooking.id
        );

        if (nextBooking) {
            const timeUntilNext = (new Date(nextBooking.date).getTime() - new Date().getTime()) / 60000;
            // If the next one starts in < 45 mins and we are still in service (seated/dessert/etc)
            if (timeUntilNext > 0 && timeUntilNext < 45 && ['SEATED', 'BAR_ARRIVAL', 'DESSERT', 'BILL_REQUESTED'].includes(activeBooking.status)) {
                return "bg-yellow-400 border-yellow-500 text-black font-semibold animate-pulse";
            }
        }

        switch (activeBooking.status) {
            case 'NO_SHOW': return "bg-red-600 border-red-700 text-white";
            case 'CANCELLED': return "bg-slate-500 border-slate-600 text-white";
            case 'PENDING_CONFIRMATION': return "bg-orange-500 border-orange-600 text-white";
            case 'PENDING_APPROVAL': return "bg-amber-600 border-amber-700 text-white";
            case 'TO_REVIEW': return "bg-blue-500 border-blue-600 text-white";
            case 'CONFIRMED': return "bg-lime-500 border-lime-600 text-white";
            case 'BAR_ARRIVAL': return "bg-purple-500 border-purple-600 text-white";
            case 'SEATED': return "bg-emerald-700 border-emerald-800 text-white shadow-lg";
            case 'DESSERT': return "bg-sky-400 border-sky-500 text-white";
            case 'BILL_REQUESTED': return "bg-blue-900 border-blue-950 text-white";
            case 'CLEANING': return "bg-lime-200 border-lime-400 text-lime-900";
            default: return "bg-orange-500 border-orange-600 text-white shadow-md";
        }
    };

    const activeBooking = data.resBookings?.[0];

    const handleDragStart = (e: React.DragEvent) => {
        if (mode !== 'EDIT') return;
        setIsDragging(true);
        e.dataTransfer.setData("tableId", data.id);
        const rect = tableRef.current?.getBoundingClientRect();
        if (rect) {
            e.dataTransfer.setData("offsetX", (e.clientX - rect.left).toString());
            e.dataTransfer.setData("offsetY", (e.clientY - rect.top).toString());
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedBooking = e.dataTransfer.getData("bookingId");
        if (droppedBooking) {
            onDropReservation(data.id, { id: droppedBooking });
        }
    };

    return (
        <div
            ref={tableRef}
            draggable={mode === 'EDIT'}
            onDragStart={handleDragStart}
            onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('brightness-125', 'ring-2', 'ring-white');
            }}
            onDragLeave={(e) => {
                e.currentTarget.classList.remove('brightness-125', 'ring-2', 'ring-white');
            }}
            onDrop={(e) => {
                e.currentTarget.classList.remove('brightness-125', 'ring-2', 'ring-white');
                handleDrop(e);
            }}
            className={cn(
                "absolute border flex flex-col items-center justify-center shadow-sm transition-all",
                !isSelected && "overflow-hidden",
                getStatusStyle(),
                isDragging && "opacity-50",
                data.shape === 'ROUND' ? 'rounded-full' : 'rounded-md',
                isSelected && "ring-4 ring-primary ring-offset-4 z-[100] shadow-2xl",
                !isSelected && isInSelectedCluster && "ring-2 ring-primary/70 ring-offset-2 z-[90]",
                mode === 'EDIT' ? "border-double border-4 cursor-move" : "cursor-pointer hover:brightness-95 hover:shadow-md active:scale-95"
            )}
            style={{
                left: `${data.x}px`,
                top: `${data.y}px`,
                width: `${data.width}px`,
                height: `${data.height}px`,
                transform: `rotate(${data.rotation}deg)`,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.(data.id);
            }}
        >
            {mode === 'EDIT' && (
                <div className="absolute inset-0 border border-border/40 pointer-events-none" />
            )}
            <span className="font-semibold text-[8px] uppercase tracking-tighter opacity-70 absolute top-1 pointer-events-none">{data.name} · {data.maxPax ?? data.capacity}p</span>

            {activeBooking && (
                <div
                    draggable
                    onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData("bookingId", activeBooking.id);
                        e.dataTransfer.effectAllowed = "move";
                    }}
                    className="flex flex-col items-center justify-center px-1 w-full text-center cursor-move"
                >
                    <span className="font-bold text-[9px] leading-tight uppercase truncate w-full">
                        {activeBooking.guestName.split(' ')[0]}
                    </span>
                    <span className="text-[8px] font-semibold opacity-90 mt-0.5 tabular-nums">
                        {formatTimeInTz(activeBooking.date, timezone)}
                    </span>
                </div>
            )}

            {!activeBooking && (
                <div className="flex items-center text-[8px] mt-0.5 space-x-0.5 opacity-90 font-semibold">
                    <Users className="size-2" />
                    <span>{data.maxPax ?? data.capacity}</span>
                </div>
            )}

            {/* Visual indicators for bookings */}
            {mode !== 'EDIT' && activeBooking && (
                <>
                    {/* Visit Count Badge */}
                    {(activeBooking.visitCount ?? 0) > 1 && (
                        <div className="absolute top-0.5 left-0.5 bg-yellow-400 text-black text-[7px] h-3.5 w-3.5 flex items-center justify-center rounded-full border border-black/20 font-bold shadow-sm" title={`Visitas: ${activeBooking.visitCount}`}>
                            {activeBooking.visitCount}
                        </div>
                    )}

                    {/* Consecutive Bookings Badge */}
                    {(data.resBookings?.length ?? 0) > 1 && (
                        <div className="absolute bottom-0.5 right-0.5 bg-card/90 text-foreground text-[7px] px-1 rounded-sm border border-border font-semibold shadow-xs">
                            +{data.resBookings!.length - 1}
                        </div>
                    )}

                    {/* Status Dot (pulse) for certain states */}
                    {['SEATED', 'BAR_ARRIVAL'].includes(activeBooking.status) && (
                        <div className="absolute top-1 right-1 flex animate-pulse">
                            <div className="size-1.5 bg-white rounded-full shadow-sm" />
                        </div>
                    )}

                    {/* Comment Indicator */}
                    {(activeBooking.notes || activeBooking.tags) && (
                        <div className="absolute bottom-1 left-1 opacity-90">
                            <MessageSquare className="size-2.5" />
                        </div>
                    )}
                </>
            )}

            {/* Marca de mesa extra de fecha especial (sólo en editor) */}
            {mode === 'EDIT' && isOpeningTable && (
                <div
                    className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-0.5 shadow-sm"
                    title={openingLabel(data.opening) || 'Mesa de fecha especial'}
                >
                    <CalendarClock className="size-2.5 text-white" />
                </div>
            )}

            {/* Indicator if table has contiguous links */}
            {mode === 'EDIT' && ((data.metadata?.contiguousTableIds?.length ?? 0) > 0 || (data.contiguousTableIds?.length ?? 0) > 0) && (
                <div className="absolute -bottom-1.5 -left-1.5 bg-primary rounded-full p-0.5 shadow-sm">
                    <LinkIcon className="size-2 text-primary-foreground" />
                </div>
            )}

            {/* Manual Status Actions */}
            {mode === 'SERVICE' && isSelected && activeBooking && (
                <div className={cn(
                    "absolute flex bg-popover text-popover-foreground border border-border rounded-md shadow-lg p-2 gap-2 z-[110] animate-in fade-in zoom-in duration-200",
                    dropdownPos === 'bottom' ? "-bottom-16" : "-top-16"
                )}>
                    <Button size="icon-sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'BAR_ARRIVAL' }); }} aria-label="En Barra">
                        <GlassWater className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'SEATED' }); }} aria-label="Sentar">
                        <UserCheck className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'DESSERT' }); }} aria-label="Postre">
                        <Cake className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'BILL_REQUESTED' }); }} aria-label="Cuenta">
                        <FileText className="size-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="outline" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'RELEASED' }); }} aria-label="Liberar">
                        <LogOut className="size-3.5" />
                    </Button>
                    <div className="w-px h-7 bg-border mx-0.5" />
                    <Button size="icon-sm" variant="outline" onClick={(e) => { e.stopPropagation(); onSelectProfile?.(activeBooking); }} aria-label="Ficha de Cliente">
                        <UserCircle className="size-3.5" />
                    </Button>
                </div>
            )}

            {/* Edit Handles (only in EDIT mode) */}
            {mode === 'EDIT' && isSelected && onUpdate && (
                <div className="absolute -bottom-8 flex bg-popover text-popover-foreground border border-border rounded-md shadow-sm p-1 gap-1 z-50">
                    <button
                        type="button"
                        aria-label="Rotar mesa"
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(data.id, { rotation: ((data.rotation ?? 0) + 45) % 360 });
                        }}
                    >
                        <RotateCw className="size-3.5" />
                    </button>
                    <button
                        type="button"
                        aria-label="Cambiar capacidad"
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            const next = (((data.maxPax ?? data.capacity ?? 0)) % 8) + 1;
                            onUpdate(data.id, { capacity: next, maxPax: next });
                        }}
                    >
                        <Armchair className="size-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function TablePlan({
    zones,
    tables,
    onTableUpdate,
    onBookingMove,
    onTableSelect,
    selectedTableId,
    restaurantId,
    hideToolbar = false,
    hideArchitectButton = false,
    mode = 'SERVICE',
    onSelectProfile,
    activeZoneId,
    onActiveZoneChange,
    className,
    timezone
}: {
    zones: ZoneWithTables[],
    tables: TableNodeData[],
    onTableUpdate?: (tableId: string, data: TableUpdates) => void,
    onBookingMove: (bookingId: string, targetTableId: string) => void,
    onTableSelect?: (id: string) => void,
    onSelectProfile?: (booking: GuestBookingProfile) => void,
    selectedTableId?: string | null,
    restaurantId?: string,
    hideToolbar?: boolean,
    hideArchitectButton?: boolean,
    mode?: 'VIEW' | 'EDIT' | 'SERVICE',
    activeZoneId?: string,
    onActiveZoneChange?: (id: string) => void,
    className?: string,
    timezone?: string
}) {
    const router = useRouter();
    const [activeZone, setActiveZone] = useState(activeZoneId || zones[0]?.id || "");
    const [scale, setScale] = useState(1);
    const [autoFit, setAutoFit] = useState(true);
    const viewportRef = useRef<HTMLDivElement>(null);
    const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

    useEffect(() => {
        if (activeZoneId && activeZoneId !== activeZone) {
            setActiveZone(activeZoneId);
        }
    }, [activeZoneId]);

    useEffect(() => {
        if (zones.length > 0 && !activeZone) {
            setActiveZone(zones[0].id);
        }
    }, [zones, activeZone]);

    const handleZoneChange = (id: string) => {
        setActiveZone(id);
        onActiveZoneChange?.(id);
        setAutoFit(true); // refit cuando cambia de área
    };

    // Filter tables by active zone
    const activeTables = useMemo(() => tables.filter(t => t.zoneId === activeZone), [tables, activeZone]);

    // Bounding box del contenido (incluye rotación expandiendo de forma conservadora)
    const bbox = useMemo(() => {
        if (activeTables.length === 0) return { w: 800, h: 600 };
        // Considerar rotación: usar el bounding box del cuadrado contenedor más grande.
        let maxX = 0;
        let maxY = 0;
        activeTables.forEach(t => {
            const w = t.width || 60;
            const h = t.height || 60;
            // Si la mesa está rotada, su huella visible puede ser más grande.
            const r = ((t.rotation || 0) % 360) * Math.PI / 180;
            const rotW = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r));
            const rotH = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
            maxX = Math.max(maxX, (t.x || 0) + rotW);
            maxY = Math.max(maxY, (t.y || 0) + rotH);
        });
        // Mínimo razonable + margen para selección/handles
        return { w: Math.max(maxX + 60, 400), h: Math.max(maxY + 60, 300) };
    }, [activeTables]);

    const fitToContainer = useCallback(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const cw = vp.clientWidth - 16;
        const ch = vp.clientHeight - 16;
        if (cw <= 0 || ch <= 0) return;
        const s = Math.min(cw / bbox.w, ch / bbox.h);
        // Permitimos escalar por debajo de 1 todo lo necesario (hasta 0.2)
        // y por encima sólo hasta 1 en auto-fit (evita pixelado innecesario).
        setScale(Math.min(1, Math.max(0.2, s)));
    }, [bbox.w, bbox.h]);

    // Auto-fit inicial y al cambiar de área/tamaño del contenedor
    useEffect(() => {
        if (!autoFit) return;
        fitToContainer();
        const vp = viewportRef.current;
        if (!vp || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            if (autoFit) fitToContainer();
        });
        ro.observe(vp);
        return () => ro.disconnect();
    }, [autoFit, fitToContainer]);

    const handleZoom = (delta: number) => {
        setAutoFit(false);
        setScale(s => Math.min(2.5, Math.max(0.2, +(s + delta).toFixed(2))));
    };

    // Pinch-to-zoom táctil
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchRef.current = { dist: Math.hypot(dx, dy), scale };
        }
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchRef.current) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const factor = dist / pinchRef.current.dist;
            setAutoFit(false);
            setScale(Math.min(2.5, Math.max(0.2, pinchRef.current.scale * factor)));
        }
    };
    const handleTouchEnd = () => { pinchRef.current = null; };

    // Cluster de la selección: si la mesa seleccionada está ocupada por una reserva
    // que también ocupa otras mesas (linkedTableIds), todas se resaltan juntas.
    const selectedClusterIds = (() => {
        if (!selectedTableId) return new Set<string>();
        const sel = tables.find(t => t.id === selectedTableId);
        const booking = sel?.resBookings?.[0];
        if (!booking) return new Set<string>([selectedTableId]);
        const head = booking.tableId ?? selectedTableId;
        const linked = booking.metadata?.linkedTableIds ?? [];
        return new Set<string>([head, ...linked, selectedTableId]);
    })();

    // Canvas drop (for moving tables)
    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const tableId = e.dataTransfer.getData("tableId");
        const offsetX = parseFloat(e.dataTransfer.getData("offsetX") || "0");
        const offsetY = parseFloat(e.dataTransfer.getData("offsetY") || "0");

        if (tableId && mode === 'EDIT' && onTableUpdate) {
            const container = e.currentTarget.getBoundingClientRect();
            // grid snap 10px
            const x = Math.round((e.clientX - container.left - offsetX) / 10) * 10;
            const y = Math.round((e.clientY - container.top - offsetY) / 10) * 10;

            onTableUpdate(tableId, { x, y });
        }
    };

    if (zones.length === 0) {
        return (
            <EmptyState
                icon={LayoutGrid}
                title="No hay mesas ni zonas configuradas"
                description={
                    restaurantId && !hideArchitectButton
                        ? undefined
                        : "Ve a la configuración del restaurante para crear el plano de sala."
                }
                action={
                    restaurantId && !hideArchitectButton ? (
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => router.push(`/admin/restaurant/${restaurantId}/plan`)}
                        >
                            <LayoutGrid className="size-4" /> Abrir Arquitecto de Sala
                        </Button>
                    ) : undefined
                }
                className="border border-dashed border-border rounded-md bg-muted/20 h-full"
            />
        );
    }
    return (
        <div className={cn("flex flex-col h-full min-h-0", className)}>
            {/* Toolbar */}
            {!hideToolbar && (
                <div className="flex justify-between items-center gap-2 mb-2 p-2 bg-card border-b border-border sticky top-0 z-10 flex-wrap">
                    <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 min-w-0">
                        {zones.map(z => (
                            <Button
                                key={z.id}
                                variant={activeZone === z.id ? "default" : "outline"}
                                size="sm"
                                className="shrink-0"
                                onClick={() => handleZoneChange(z.id)}
                            >
                                {z.name}
                            </Button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" aria-label="Reducir zoom" onClick={() => handleZoom(-0.1)}>
                            <Minus className="size-3.5" />
                        </Button>
                        <span className="text-[10px] font-semibold w-9 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                        <Button variant="ghost" size="icon-sm" aria-label="Aumentar zoom" onClick={() => handleZoom(0.1)}>
                            <PlusIcon className="size-3.5" />
                        </Button>
                        <Button
                            variant={autoFit ? "default" : "ghost"}
                            size="icon-sm"
                            aria-label="Ajustar a pantalla"
                            title="Ajustar a pantalla"
                            onClick={() => { setAutoFit(true); fitToContainer(); }}
                        >
                            <Maximize2 className="size-3.5" />
                        </Button>

                        {/* Only show edit redirect if we are in service mode and have an ID.
                            Some hosts (e.g. /admin/occupancy) ocultan este atajo porque la configuración vive en otra sección. */}
                        {mode === 'SERVICE' && restaurantId && !hideArchitectButton && (
                            <>
                                <div className="h-4 w-px bg-border mx-1" />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-xs hidden sm:inline-flex"
                                    onClick={() => router.push(`/admin/restaurant/${restaurantId}/plan`)}
                                >
                                    <LayoutGrid className="size-3.5" /> Arquitecto
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon-sm"
                                    className="sm:hidden"
                                    aria-label="Arquitecto"
                                    onClick={() => router.push(`/admin/restaurant/${restaurantId}/plan`)}
                                >
                                    <LayoutGrid className="size-3.5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Canvas viewport (con scroll cuando el contenido excede el área visible) */}
            <div
                ref={viewportRef}
                className="flex-1 min-h-0 bg-muted/30 border border-border rounded-md relative overflow-auto shadow-inner select-none touch-pan-x touch-pan-y"
                style={{
                    backgroundImage: 'radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Wrapper dimensionado para que los scrollbars reflejen el contenido escalado */}
                <div
                    className="relative"
                    style={{
                        width: `${Math.max(bbox.w * scale, 1)}px`,
                        height: `${Math.max(bbox.h * scale, 1)}px`,
                    }}
                >
                    <div
                        className="absolute top-0 left-0 origin-top-left"
                        style={{
                            transform: `scale(${scale})`,
                            width: `${bbox.w}px`,
                            height: `${bbox.h}px`,
                        }}
                    >
                        {activeTables.map(table => (
                            <TableNode
                                key={table.id}
                                data={table}
                                mode={mode}
                                onUpdate={onTableUpdate}
                                onDropReservation={(tid, bData) => onBookingMove(bData.id, tid)}
                                onSelect={onTableSelect}
                                onSelectProfile={onSelectProfile}
                                isSelected={selectedTableId === table.id}
                                isInSelectedCluster={selectedClusterIds.has(table.id)}
                                timezone={timezone}
                            />
                        ))}

                        {activeTables.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <p className="text-sm">No hay mesas en esta zona.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
