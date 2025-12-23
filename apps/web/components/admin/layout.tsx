import Link from 'next/link';
import {
    LayoutDashboard,
    Building2,
    BedDouble,
    CalendarCheck,
    CalendarDays
} from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-zinc-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-zinc-800 hidden md:block">
                <div className="p-6">
                    <img src="/logo-text.png" alt="SOTO PMS" className="h-10 mx-auto" />
                </div>
                <nav className="px-4 space-y-1">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>

                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inventario</p>
                    </div>
                    <Link href="/admin/hotels" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <Building2 className="w-5 h-5" />
                        Hoteles
                    </Link>
                    <Link href="/admin/room-types" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <BedDouble className="w-5 h-5" />
                        Tipos de Habitación
                    </Link>

                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reservas</p>
                    </div>
                    <Link href="/admin/bookings" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <CalendarCheck className="w-5 h-5" />
                        Todas las Reservas
                    </Link>
                    <Link href="/admin/calendar" className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <CalendarDays className="w-5 h-5" />
                        Calendario
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
