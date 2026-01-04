"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
import { UserPlus, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface WaitlistProps {
    entries: any[];
    onAdd: (data: any) => void;
    onSeat: (id: string) => void;
}

export default function WaitlistPanel({ entries, onAdd, onSeat }: WaitlistProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({ name: '', pax: 2, phone: '', notes: '' });

    const handleSubmit = () => {
        onAdd(formData);
        setFormData({ name: '', pax: 2, phone: '', notes: '' });
        setIsAdding(false);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="py-3 px-4 border-b bg-gray-50 flex flex-row justify-between items-center">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Lista de Espera ({entries.length})
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setIsAdding(!isAdding)}>
                    <UserPlus className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                {isAdding && (
                    <div className="p-3 bg-blue-50 border-b space-y-2">
                        <Input
                            placeholder="Nombre Cliente"
                            className="bg-white h-8 text-sm"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                className="w-16 bg-white h-8 text-sm"
                                value={formData.pax}
                                onChange={e => setFormData({ ...formData, pax: parseInt(e.target.value) })}
                            />
                            <Input
                                placeholder="Teléfono"
                                className="flex-1 bg-white h-8 text-sm"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <Button size="sm" className="w-full h-7" onClick={handleSubmit} disabled={!formData.name}>
                            Guardar
                        </Button>
                    </div>
                )}

                <div className="divide-y">
                    {entries.map(entry => (
                        <div key={entry.id} className="p-3 hover:bg-gray-50 transition-colors group">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-sm">{entry.name}</span>
                                <Badge variant="secondary" className="bg-gray-200 text-gray-700">{entry.pax}p</Badge>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>Hace {formatDistanceToNow(new Date(entry.createdAt), { locale: es })}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-green-600" onClick={() => onSeat(entry.id)}>
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {entries.length === 0 && !isAdding && (
                        <div className="p-8 text-center text-gray-400 text-xs">
                            Lista vacía
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
