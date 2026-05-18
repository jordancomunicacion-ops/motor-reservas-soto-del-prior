"use client";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReviewsPanel from '@/components/admin/ReviewsPanel';

export default function RestaurantReviewsPage() {
    const params = useParams();
    const restaurantId = params.id as string;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/admin/restaurant/${restaurantId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Valoraciones</h1>
                    <p className="text-muted-foreground">Resumen y detalle de las opiniones recibidas tras cada reserva.</p>
                </div>
            </div>

            <ReviewsPanel endpoint={`/restaurant/${restaurantId}/reviews`} />
        </div>
    );
}
