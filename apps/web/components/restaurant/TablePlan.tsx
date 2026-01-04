"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Edit2, RotateCw, GripHorizontal, Armchair, Ban } from "lucide-react";

interface TableProps {
    data: any;
    onUpdate: (id: string, updates: any) => void;
    onDropReservation: (tableId: string, bookingData: any) => void;
    mode: 'VIEW' | 'EDIT';
}

function TableNode({ data, onUpdate, onDropReservation, mode }: TableProps) {
    const [isDragging, setIsDragging] = useState(false);
    const tableRef = useRef<HTMLDivElement>(null);

    // Status Colors
    const getStatusColor = () => {
        if (!data.isActive) return "bg-gray-200 border-gray-300 text-gray-400"; // Blocked
        const activeBooking = data.resBookings?.find((b: any) => b.status === 'SEATED');
        if (activeBooking) return "bg-red-100 border-red-500 text-red-900"; // Occupied

        const reserved = data.resBookings?.length > 0;
        if (reserved) return "bg-yellow-100 border-yellow-500 text-yellow-900"; // Reserved

        return "bg-green-50 border-green-400 text-green-900"; // Free
    };

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
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={cn(
                "absolute border-2 rounded-lg flex flex-col items-center justify-center shadow-sm transition-all cursor-pointer",
                getStatusColor(),
                isDragging && "opacity-50",
                data.shape === 'ROUND' ? 'rounded-full' : 'rounded-lg'
            )}
            style={{
                left: `${data.x}px`,
                top: `${data.y}px`,
                width: `${data.width}px`,
                height: `${data.height}px`,
                transform: `rotate(${data.rotation}deg)`,
            }}
            onClick={() => {
                // Handle click (open details or edit props)
            }}
        >
            <span className="font-bold text-sm">{data.name}</span>
            <div className="flex items-center text-xs mt-1 space-x-1">
                <Users className="w-3 h-3" />
                <span>{data.capacity}</span>
            </div>

            {/* Visual indicators for bookings */}
            {data.resBookings?.length > 0 && (
                <div className="absolute -top-2 -right-2 flex space-x-1">
                    <Badge variant="secondary" className="text-[10px] px-1 h-5 flex items-center bg-blue-600 text-white">
                        {data.resBookings.length}
                    </Badge>
                </div>
            )}

            {/* Edit Handles (only in EDIT mode) */}
            {mode === 'EDIT' && (
                <div className="absolute -bottom-6 flex bg-white border rounded shadow p-1 gap-1 z-50">
                    <RotateCw className="w-4 h-4 text-gray-500 cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(data.id, { rotation: (data.rotation + 45) % 360 });
                    }} />
                    <GripHorizontal className="w-4 h-4 text-gray-500 cursor-pointer" onClick={(e) => {
                        e.stopPropagation();
                        const newShape = data.shape === 'RECTANGLE' ? 'ROUND' : 'RECTANGLE';
                        onUpdate(data.id, { shape: newShape });
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
    className
}: {
    zones: any[],
    tables: any[],
    onTableUpdate: (tableId: string, data: any) => void,
    onBookingMove: (bookingId: string, targetTableId: string) => void,
    className?: string
}) {
    const [activeZone, setActiveZone] = useState(zones[0]?.id || "");
    const [editMode, setEditMode] = useState(false);
    const [scale, setScale] = useState(1);

    // Filter tables by active zone
    const activeTables = tables.filter(t => t.zoneId === activeZone);

    // Canvas drop (for moving tables)
    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const tableId = e.dataTransfer.getData("tableId");
        const offsetX = parseFloat(e.dataTransfer.getData("offsetX") || "0");
        const offsetY = parseFloat(e.dataTransfer.getData("offsetY") || "0");

        if (tableId && editMode) {
            const container = e.currentTarget.getBoundingClientRect();
            // grid snap 10px
            const x = Math.round((e.clientX - container.left - offsetX) / 10) * 10;
            const y = Math.round((e.clientY - container.top - offsetY) / 10) * 10;

            onTableUpdate(tableId, { x, y });
        }
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4 p-2 bg-white border-b sticky top-0 z-10">
                <div className="flex space-x-2 overflow-x-auto">
                    {zones.map(z => (
                        <Button
                            key={z.id}
                            variant={activeZone === z.id ? "default" : "outline"}
                            onClick={() => setActiveZone(z.id)}
                            className="bg-stone-900 text-white hover:bg-stone-700"
                        >
                            {z.name}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>-</Button>
                    <span className="text-xs">{Math.round(scale * 100)}%</span>
                    <Button variant="ghost" size="icon" onClick={() => setScale(Math.min(2, scale + 0.1))}>+</Button>
                    <div className="h-4 w-px bg-gray-300 mx-2" />
                    <Button
                        variant={editMode ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setEditMode(!editMode)}
                    >
                        {editMode ? "Bloquear Edición" : "Editar Plano"}
                    </Button>
                </div>
            </div>

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
                            mode={editMode ? 'EDIT' : 'VIEW'}
                            onUpdate={onTableUpdate}
                            onDropReservation={(tid, bData) => onBookingMove(bData.id, tid)}
                        />
                    ))}

                    {activeTables.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <p>No hay mesas en esta zona. Activa "Editar Plano" para añadir.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
