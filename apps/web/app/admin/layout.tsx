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
        <div className="min-h-screen bg-background">
            <Sidebar userRole={userRole} />
            <div className="flex flex-col md:pl-64">
                <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-border bg-background/85 backdrop-blur-md px-6 sm:px-8">
                    <LocationSwitcher />
                </header>
                <main className="flex flex-1 flex-col gap-8 p-6 sm:p-8 max-w-[1600px] w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
