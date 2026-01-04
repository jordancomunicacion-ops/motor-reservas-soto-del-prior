"use client";
import { Suspense } from 'react';
import { RestaurantWidget } from '@/components/widget/RestaurantWidget';

export default function RestaurantWidgetPage() {
    return (
        <Suspense fallback={<div className="p-4 text-center">Cargando widget...</div>}>
            <RestaurantWidget />
        </Suspense>
    );
}
