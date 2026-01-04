import { Sidebar } from "@/components/admin/Sidebar";
import { LocationSwitcher } from "@/components/admin/LocationSwitcher";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-muted/40">
            <Sidebar />
            <div className="flex flex-col md:pl-64 transition-all duration-300">
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px] sticky top-0 z-20 justify-between">
                    <div className="flex items-center gap-4">
                        <LocationSwitcher />
                        <span className="text-sm text-muted-foreground hidden md:inline-block">/</span>
                        <h1 className="text-lg font-semibold text-foreground">Panel de Control</h1>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
