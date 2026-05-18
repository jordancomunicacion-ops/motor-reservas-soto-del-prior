"use client";
import { Suspense } from 'react';
import { ReviewReservation } from '@/components/restaurant/ReviewReservation';

export default function ReviewReservationPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando…</div>}>
            <ReviewReservation />
        </Suspense>
    );
}
