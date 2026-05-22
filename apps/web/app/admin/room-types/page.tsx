"use client";
import { useState } from 'react';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { BedDouble, Info } from 'lucide-react';

interface RoomType {
    id: string;
    name: string;
    basePrice: number;
    capacity: number;
    rooms?: Array<{ id: string }>;
}

export default function RoomTypesPage() {
    const [types, setTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(false);

    // Hardcoded Hotel ID for MVP (User should select hotel first in real app)
    const [hotelId, setHotelId] = useState('');

    async function loadTypes() {
        if (!hotelId) return;
        setLoading(true);
        try {
            const res = await fetchAPIAdmin<RoomType[]>(`/property/hotels/${hotelId}/room-types`);
            setTypes(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                eyebrow="Inventario"
                title="Tipos de habitación"
                description="Define las categorías de alojamiento disponibles en cada hotel."
                actions={<Button>+ Añadir Tipo</Button>}
            />

            <Card className="border-info/30 bg-info/5">
                <CardContent className="space-y-3">
                    <div className="flex items-start gap-2 text-sm text-foreground">
                        <Info className="size-4 mt-0.5 text-info shrink-0" />
                        <p><strong>Nota Dev:</strong> Por favor crea un Hotel primero en la pestaña Hoteles y pega el ID aquí para gestionar sus habitaciones.</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="hotel-id-input" className="text-eyebrow">ID del Hotel</Label>
                        <div className="flex gap-2">
                            <Input
                                id="hotel-id-input"
                                name="hotelId"
                                className="h-10 w-64"
                                placeholder="Pegar ID del Hotel aquí..."
                                value={hotelId}
                                onChange={e => setHotelId(e.target.value)}
                            />
                            <Button size="default" onClick={loadTypes} disabled={loading}>{loading ? 'Cargando...' : 'Cargar'}</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {types.length === 0 ? (
                <EmptyState
                    icon={BedDouble}
                    title="Sin tipos de habitación"
                    description="Carga el hotel para ver sus tipos de habitación."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {types.map((type) => (
                        <Card key={type.id}>
                            <CardHeader>
                                <CardTitle className="font-display text-base font-medium tracking-tight">{type.name}</CardTitle>
                                <CardDescription>{type.rooms?.length || 0} unidades disponibles</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Precio base: </span><strong>€{type.basePrice}</strong></p>
                                <p><span className="text-muted-foreground">Capacidad: </span>{type.capacity} pax</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
