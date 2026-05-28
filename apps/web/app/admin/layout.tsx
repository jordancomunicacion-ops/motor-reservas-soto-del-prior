import { Sidebar } from "@/components/admin/Sidebar";
import { LocationSwitcher } from "@/components/admin/LocationSwitcher";
import { AdminSessionProvider } from "@/components/admin/AdminSessionContext";
import { auth } from "@/auth";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userRole = session?.user?.role;
    const userPermissions = session?.user?.permissions ?? null;
    const restaurantId = session?.user?.restaurantId ?? null;
    const hotelId = session?.user?.hotelId ?? null;

    return (
        <div data-theme="admin-dark" className="min-h-screen bg-background text-foreground">
            <Sidebar userRole={userRole} userPermissions={userPermissions} restaurantId={restaurantId} hotelId={hotelId} />
            <div className="flex flex-col md:pl-60">
                <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-5 sm:px-6">
                    <LocationSwitcher />
                </header>
                <main className="flex flex-1 flex-col gap-6 p-5 sm:p-6 lg:p-8 max-w-[1600px] w-full">
                    <AdminSessionProvider
                        role={userRole}
                        permissions={userPermissions}
                        restaurantId={restaurantId}
                        hotelId={hotelId}
                    >
                        {children}
                    </AdminSessionProvider>
                </main>
            </div>
        </div>
    );
}
