import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { hasPermission } from '@/lib/permissions';

export default async function PlanGateLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    const role = session?.user?.role;
    const permissions = session?.user?.permissions ?? null;
    // El editor del Arquitecto se accede desde Planning de ocupación.
    // Quien tiene view_occupancy puede ver Plano/Lista/Valoraciones y
    // también editar el plano. Sin ese permiso, redirigimos al dashboard.
    if (!hasPermission(role, 'view_occupancy', permissions)) {
        const { id } = await params;
        redirect(`/admin/restaurant/${id}`);
    }
    return <>{children}</>;
}
