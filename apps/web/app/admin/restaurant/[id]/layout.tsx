import { notFound } from 'next/navigation';
import { auth } from '@/auth';

export default async function RestaurantScopeLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const { id } = await params;

    const userRestaurantId = session?.user?.restaurantId ?? null;
    const userHotelId = session?.user?.hotelId ?? null;
    const isGlobal = !userRestaurantId && !userHotelId;

    if (!isGlobal) {
        // Si el user está scopeado a este restaurante, OK.
        // Si está scopeado a un hotel, comprobamos sinergia (el hotel tiene restaurantId=id).
        // Si no coincide, 404 — el backend también devolverá 403, pero esto da mejor UX.
        const matchesRestaurant = userRestaurantId === id;
        if (!matchesRestaurant && !userHotelId) {
            notFound();
        }
        // Si tiene hotelId, dejamos pasar — la página llamará al motor que validará la sinergia.
        // No replicamos la query de sinergia aquí; el backend es la fuente de verdad.
    }

    return <>{children}</>;
}
