"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { fetchAPIAdmin } from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TablePlanEditor from '@/components/restaurant/TablePlanEditor';

interface RestaurantSummary { id: string; name: string }

function RestaurantPlanContent() {
    const params = useParams();
    const restaurantId = params.id as string;
    const [restaurant, setRestaurant] = useState<RestaurantSummary | null>(null);

    useEffect(() => {
        if (restaurantId) {
            fetchAPIAdmin<RestaurantSummary>(`/restaurant/${restaurantId}`).then(setRestaurant).catch(console.error);
        }
    }, [restaurantId]);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
            <PageHeader
                eyebrow="Restaurante"
                title={`Plano de mesas · ${restaurant?.name ?? ''}`}
                description="Configura las áreas y la disposición de las mesas."
                actions={
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/restaurant/${restaurantId}`}>
                            <ArrowLeft className="size-4" />
                        </Link>
                    </Button>
                }
            />

            <div className="flex-1 overflow-hidden">
                <TablePlanEditor restaurantId={restaurantId} />
            </div>
        </div>
    );
}

export default function RestaurantPlanPage() {
    return (
        <Suspense fallback={<div className="p-8 text-muted-foreground">Cargando...</div>}>
            <RestaurantPlanContent />
        </Suspense>
    );
}
