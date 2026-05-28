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
    if (!hasPermission(role, 'manage_restaurant', permissions)) {
        const { id } = await params;
        redirect(`/admin/restaurant/${id}`);
    }
    return <>{children}</>;
}
