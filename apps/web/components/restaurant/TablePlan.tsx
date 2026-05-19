"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Edit2, RotateCw, GripHorizontal, Armchair, Ban, LayoutGrid, Link as LinkIcon, MessageSquare, GlassWater, UserCheck, Coffee, FileText, LogOut, UserCircle, Cake } from "lucide-react";
import type { BookingOnTable, TableNodeData, ZoneWithTables } from '@/types/restaurant';
import type { GuestBookingProfile } from './GuestProfileSheet';

export type TableUpdates = Partial<TableNodeData> & { bookingStatus?: string };

interface TableProps {
    data: TableNodeData;
    onUpdate?: (id: string, updates: TableUpdates) => void;
    onDropReservation: (tableId: string, bookingData: { id: string }) => void;
    onSelect?: (id: string) => void;
    mode: 'VIEW' | 'EDIT' | 'SERVICE';
    isSelected?: boolean;
    onSelectProfile?: (booking: GuestBookingProfile) => void;
}

function TableNode({ data, onUpdate, onDropReservation, onSelect, onSelectProfile, mode, isSelected }: TableProps) {
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

    // Status Colors mapping based on the provided legend
    const getStatusStyle = () => {
        if (mode === 'EDIT') return "bg-zinc-50 border-zinc-300 text-zinc-900 shadow-sm";
        if (!data.isActive) return "bg-gray-100 border-gray-200 text-gray-400";

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
                return "bg-yellow-400 border-yellow-500 text-black font-bold animate-pulse";
            }
        }

        switch (activeBooking.status) {
            case 'NO_SHOW': return "bg-red-600 border-red-700 text-white";
            case 'CANCELLED': return "bg-slate-500 border-slate-600 text-white";
            case 'PENDING_CONFIRMATION': return "bg-orange-500 border-orange-600 text-white";
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
                <div className="absolute inset-0 border border-zinc-200/50 pointer-events-none" />
            )}
            <span className="font-bold text-[8px] uppercase tracking-tighter opacity-70 absolute top-1 pointer-events-none">{data.name} · {data.capacity}p</span>
            
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
                    <span className="font-black text-[9px] leading-tight uppercase truncate w-full">
                        {activeBooking.guestName.split(' ')[0]}
                    </span>
                    <span className="text-[8px] font-bold opacity-90 mt-0.5">
                        {isNaN(new Date(activeBooking.date).getTime()) ? '--:--' : (
                            <>
                                {String(new Date(activeBooking.date).getUTCHours()).padStart(2, '0')}:
                                {String(new Date(activeBooking.date).getUTCMinutes()).padStart(2, '0')}
                            </>
                        )}
                    </span>
                </div>
            )}

            {!activeBooking && (
                <div className="flex items-center text-[8px] mt-0.5 space-x-0.5 opacity-90 font-bold">
                    <Users className="w-2 h-2" />
                    <span>{data.capacity}</span>
                </div>
            )}

            {/* Visual indicators for bookings */}
            {mode !== 'EDIT' && activeBooking && (
                <>
                    {/* Visit Count Badge */}
                    {(activeBooking.visitCount ?? 0) > 1 && (
                        <div className="absolute top-0.5 left-0.5 bg-yellow-400 text-black text-[7px] h-3.5 w-3.5 flex items-center justify-center rounded-full border border-black/20 font-black shadow-sm" title={`Visitas: ${activeBooking.visitCount}`}>
                            {activeBooking.visitCount}
                        </div>
                    )}

                    {/* Consecutive Bookings Badge */}
                    {(data.resBookings?.length ?? 0) > 1 && (
                        <div className="absolute bottom-0.5 right-0.5 bg-white/90 text-zinc-900 text-[7px] px-1 rounded-sm border border-zinc-200 font-bold shadow-xs">
                            +{data.resBookings!.length - 1}
                        </div>
                    )}

                    {/* Status Dot (pulse) for certain states */}
                    {['SEATED', 'BAR_ARRIVAL'].includes(activeBooking.status) && (
                        <div className="absolute top-1 right-1 flex animate-pulse">
                            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                        </div>
                    )}

                    {/* Comment Indicator */}
                    {(activeBooking.notes || activeBooking.tags) && (
                        <div className="absolute bottom-1 left-1 opacity-90">
                            <MessageSquare className="w-2.5 h-2.5" />
                        </div>
                    )}
                </>
            )}

            {/* Indicator if table has contiguous links */}
            {mode === 'EDIT' && ((data.metadata?.contiguousTableIds?.length ?? 0) > 0 || (data.contiguousTableIds?.length ?? 0) > 0) && (
                <div className="absolute -bottom-1.5 -left-1.5 bg-blue-500 rounded-full p-0.5 shadow-sm">
                    <LinkIcon className="w-2 h-2 text-white" />
                </div>
            )}

            {/* Manual Status Actions */}
            {mode === 'SERVICE' && isSelected && activeBooking && (
                <div className={cn(
                    "absolute flex bg-white dark:bg-zinc-800 border rounded-2xl shadow-2xl p-2 gap-2 z-[110] animate-in fade-in zoom-in duration-200",
                    dropdownPos === 'bottom' ? "-bottom-16" : "-top-16"
                )}>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-purple-600 border-purple-100" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'BAR_ARRIVAL' }); }} title="En Barra">
                         <GlassWater className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600 border-emerald-100" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'SEATED' }); }} title="Sentar">
                         <UserCheck className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-sky-600 border-sky-100" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'DESSERT' }); }} title="Postre">
                         <Cake className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-blue-800 border-blue-100" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'BILL_REQUESTED' }); }} title="Cuenta">
                         <FileText className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-zinc-600 border-zinc-100" onClick={(e) => { e.stopPropagation(); onUpdate?.(data.id, { bookingStatus: 'RELEASED' }); }} title="Liberar">
                         <LogOut className="w-3.5 h-3.5" />
                    </Button>
                    <div className="w-px h-7 bg-zinc-200 mx-0.5" />
                    <Button size="icon" variant="outline" className="h-7 w-7 text-blue-600 border-blue-100" onClick={(e) => { e.stopPropagation(); onSelectProfile?.(activeBooking); }} title="Ficha de Cliente">
                         <UserCircle className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )}

            {/* Edit Handles (only in EDIT mode) */}
            {mode === 'EDIT' && isSelected && onUpdate && (
                <div className="absolute -bottom-8 flex bg-white dark:bg-zinc-800 border rounded shadow p-1 gap-1 z-50">
                    <RotateCw className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-blue-600" onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(data.id, { rotation: ((data.rotation ?? 0) + 45) % 360 });
                    }} />
                    <Armchair className="w-3.5 h-3.5 text-gray-500 cursor-pointer hover:text-blue-600" onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(data.id, { capacity: ((data.capacity ?? 0) % 8) + 1 });
                    }} />
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
    className
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
    className?: string
}) {
    const router = useRouter();
    const [activeZone, setActiveZone] = useState(activeZoneId || zones[0]?.id || "");
    const [editMode, setEditMode] = useState(false);
    const [scale, setScale] = useState(1);

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
    };

    // Filter tables by active zone
    const activeTables = tables.filter(t => t.zoneId === activeZone);

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
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-dashed border-gray-200 dark:border-zinc-800">
                <LayoutGrid className="w-12 h-12 opacity-20" />
                <p>No hay mesas ni zonas configuradas.</p>
                {restaurantId && !hideArchitectButton ? (
                    <Button
                        variant="outline"
                        className="gap-2 mt-2"
                        onClick={() => router.push(`/admin/restaurant/${restaurantId}/plan`)}
                    >
                        <LayoutGrid className="w-4 h-4" /> Abrir Arquitecto de Sala
                    </Button>
                ) : (
                    <p className="text-xs">Ve a la configuración del restaurante para crear el plano de sala.</p>
                )}
            </div>
        );
    }
    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Toolbar */}
            {!hideToolbar && (
                <div className="flex justify-between items-center mb-4 p-2 bg-white dark:bg-zinc-800 border-b dark:border-zinc-700 sticky top-0 z-10">
                    <div className="flex space-x-2 overflow-x-auto">
                        {zones.map(z => (
                            <Button
                                key={z.id}
                                variant={activeZone === z.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleZoneChange(z.id)}
                                className={cn(activeZone === z.id ? "bg-stone-900 text-white" : "")}
                            >
                                {z.name}
                            </Button>
                        ))}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>-</Button>
                        <span className="text-[10px] font-bold w-8 text-center">{Math.round(scale * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(Math.min(2, scale + 0.1))}>+</Button>
                        
                        {/* Only show edit redirect if we are in service mode and have an ID.
                            Some hosts (e.g. /admin/occupancy) ocultan este atajo porque la configuración vive en otra sección. */}
                        {mode === 'SERVICE' && restaurantId && !hideArchitectButton && (
                            <>
                                <div className="h-4 w-px bg-gray-300 dark:bg-zinc-700 mx-1" />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-xs"
                                    onClick={() => router.push(`/admin/restaurant/${restaurantId}/plan`)}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> Arquitecto
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Canvas Area */}
            <div
                className="flex-1 bg-stone-50 border rounded-xl relative overflow-hidden shadow-inner selection-none"
                style={{
                    backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    minHeight: '600px'
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
            >
                <div
                    className="absolute top-0 left-0 w-full h-full transition-transform origin-top-left"
                    style={{ transform: `scale(${scale})` }}
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
                        />
                    ))}

                    {activeTables.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <p>No hay mesas en esta zona.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
