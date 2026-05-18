"use client";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReviewsPanel from '@/components/admin/ReviewsPanel';

export default function HotelReviewsPage() {
    const params = useParams();
    const hotelId = params.id as string;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Link href={`/admin/hotels/${hotelId}`} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Valoraciones del Restaurante</h1>
                    <p className="text-muted-foreground">Cuando este hotel está vinculado a un restaurante (sinergia), aquí se muestran sus valoraciones.</p>
                </div>
            </div>

            <ReviewsPanel
                endpoint={`/restaurant/hotel/${hotelId}/reviews`}
                headerBanner={
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3 rounded-lg text-xs text-amber-800 dark:text-amber-200">
                        Si este hotel no tiene un restaurante vinculado, las valoraciones se gestionan desde la ficha del restaurante.
                    </div>
                }
            />
        </div>
    );
}
