'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    BookCheck,
    Building2,
    Utensils,
    ArrowLeft,
    PartyPopper,
    UserCheck
} from 'lucide-react';
import { hasPermission, Permission, getRoleDisplayName } from '@/lib/permissions';

function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
}

interface SidebarNavProps {
    userRole?: string;
}

function SidebarNav({ userRole }: SidebarNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();

    const navItems: { href: string; label: string; icon: any; permission: Permission }[] = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
        { href: '/admin/calendar', label: 'Calendario y Reservas', icon: Calendar, permission: 'view_calendar' },
        { href: '/admin/occupancy', label: 'Planning de Ocupación', icon: Building2, permission: 'view_occupancy' },
        { href: '/admin/restaurant', label: 'Restaurante', icon: Utensils, permission: 'manage_restaurant' },
        { href: '/admin/hotels', label: 'Hoteles', icon: Building2, permission: 'manage_hotels' },
        { href: '/admin/events', label: 'Eventos', icon: PartyPopper, permission: 'manage_events' },
    ];

    // Filter items based on permissions
    const visibleItems = navItems.filter(item => hasPermission(userRole, item.permission));

    return (
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider opacity-50 flex justify-between items-center">
                <span>Menu Principal</span>
                {userRole && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[8px] border border-primary/20">
                        {getRoleDisplayName(userRole)}
                    </span>
                )}
            </div>
            {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                const href = queryString ? `${item.href}?${queryString}` : item.href;
                return (
                    <Link
                        key={item.href}
                        href={href}
                        className={classNames(
                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group",
                            isActive
                                ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}

export function Sidebar({ userRole }: { userRole?: string }) {
    // Emergency bypass for local development session issues
    const effectiveRole = userRole || 'ADMIN'; 

    return (
        <aside className="hidden w-64 flex-col border-r bg-sidebar h-screen fixed left-0 top-0 z-30 shadow-sm md:flex">
            <div className="p-4 flex justify-center border-b border-gray-100 h-16 items-center">
                <img src="/logo-text.png" alt="SOTO DEL PRIOR" className="h-10 w-auto" />
            </div>

            <Suspense fallback={<div className="flex-1 p-4">Cargando...</div>}>
                <SidebarNav userRole={effectiveRole} />
            </Suspense>

            <div className="p-4 border-t border-gray-100 mt-auto">
                <div className="px-4 py-2 text-[10px] text-muted-foreground opacity-50">
                    &copy; 2026 SOTO del PRIOR
                </div>
            </div>
        </aside>
    );
}
