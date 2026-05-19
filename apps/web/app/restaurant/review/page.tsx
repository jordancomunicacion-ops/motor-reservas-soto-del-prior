"use client";
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { ReviewReservation } from '@/components/restaurant/ReviewReservation';

export default function ReviewReservationPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen grid place-items-center bg-background">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <ReviewReservation />
        </Suspense>
    );
}
