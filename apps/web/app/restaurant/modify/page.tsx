"use client";
import { Suspense } from 'react';
import { ModifyReservation } from '@/components/restaurant/ModifyReservation';

export default function ModifyReservationPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando…</div>}>
            <ModifyReservation />
        </Suspense>
    );
}
