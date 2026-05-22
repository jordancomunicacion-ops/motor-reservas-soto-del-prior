import { notFound } from 'next/navigation';
import { auth } from '@/auth';

export default async function HotelScopeLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const { id } = await params;

    const userHotelId = session?.user?.hotelId ?? null;
    const userRestaurantId = session?.user?.restaurantId ?? null;
    const isGlobal = !userHotelId && !userRestaurantId;

    if (!isGlobal && userHotelId && userHotelId !== id) {
        // Usuario scopeado a un hotel distinto → 404 (backend devolvería 403 igualmente).
        notFound();
    }
    // Si solo tiene restaurantId sin hotelId, no debería estar aquí. Pero el backend
    // se encargará de devolver 403 si no hay sinergia.

    return <>{children}</>;
}
