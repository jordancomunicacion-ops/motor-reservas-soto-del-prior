import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import DashboardContent from './dashboard-content';

export default async function AdminPage() {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId ?? null;
    const hotelId = session?.user?.hotelId ?? null;

    // Si el usuario tiene scope a un hotel, llevarle a la página de su hotel
    // (cubre también el restaurante vinculado vía sinergia).
    if (hotelId) {
        redirect(`/admin/hotels/${hotelId}`);
    }
    // Si solo tiene scope a un restaurante, llevarle a la página de su restaurante.
    if (restaurantId) {
        redirect(`/admin/restaurant/${restaurantId}`);
    }

    // Sin scope = super-admin global, muestra el dashboard agregado.
    return <DashboardContent />;
}
