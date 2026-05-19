"use client";
import { Suspense } from 'react';
import { HotelReviewBooking } from '@/components/hotel/HotelReviewBooking';

export default function HotelReviewPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando…</div>}>
            <HotelReviewBooking />
        </Suspense>
    );
}
