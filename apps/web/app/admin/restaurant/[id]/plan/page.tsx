"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/lib/api';
import { ArrowLeft, Layout } from 'lucide-react';
import Link from 'next/link';
import TablePlanEditor from '@/components/restaurant/TablePlanEditor';

function RestaurantPlanContent() {
    const params = useParams();
    const restaurantId = params.id as string;
    const [restaurant, setRestaurant] = useState<any>(null);

    useEffect(() => {
        if (restaurantId) {
            fetchAPI(`/restaurant/${restaurantId}`).then(setRestaurant).catch(console.error);
        }
    }, [restaurantId]);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
            <header className="flex items-center gap-4 px-2">
                <Link href={`/admin/restaurant/${restaurantId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Plano de Mesas: {restaurant?.name}</h1>
                    <p className="text-muted-foreground">Configura las áreas y la disposición de las mesas.</p>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <TablePlanEditor restaurantId={restaurantId} />
            </div>
        </div>
    );
}

export default function RestaurantPlanPage() {
    return (
        <Suspense fallback={<div className="p-8">Cargando...</div>}>
            <RestaurantPlanContent />
        </Suspense>
    );
}
