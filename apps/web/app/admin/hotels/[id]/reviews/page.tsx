"use client";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import HotelReviewsPanel from '@/components/admin/HotelReviewsPanel';

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
                    <h1 className="text-2xl font-bold">Valoraciones</h1>
                    <p className="text-muted-foreground">Resumen y detalle de las opiniones recibidas tras cada estancia.</p>
                </div>
            </div>

            <HotelReviewsPanel endpoint={`/bookings/hotel/${hotelId}/reviews`} />
        </div>
    );
}
