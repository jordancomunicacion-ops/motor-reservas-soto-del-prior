import { Sidebar } from "@/components/admin/Sidebar";
import { LocationSwitcher } from "@/components/admin/LocationSwitcher";
import { auth } from "@/auth";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userRole = session?.user?.role;

    return (
        <div className="min-h-screen bg-muted/40">
            <Sidebar userRole={userRole} />
            <div className="flex flex-col md:pl-64 transition-all duration-300">
                <header className="flex h-[72px] items-center gap-4 border-b bg-background px-8 sticky top-0 z-20 justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                        <LocationSwitcher />
                        <span className="text-sm text-muted-foreground opacity-30">/</span>
                        <h1 className="text-lg font-bold text-foreground tracking-tight uppercase">Panel de Control</h1>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-8 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
