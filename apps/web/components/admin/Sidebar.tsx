'use client';

import React, { Suspense } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    Building2,
    Utensils,
    PartyPopper,
} from 'lucide-react';
import { hasPermission, type Permission, getRoleDisplayName } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
    userRole?: string;
}

function SidebarNav({ userRole }: SidebarNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();

    const navItems: { href: string; label: string; icon: LucideIcon; permission: Permission }[] = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
        { href: '/admin/calendar', label: 'Calendario y reservas', icon: Calendar, permission: 'view_calendar' },
        { href: '/admin/occupancy', label: 'Planning de ocupación', icon: Building2, permission: 'view_occupancy' },
        { href: '/admin/restaurant', label: 'Restaurante', icon: Utensils, permission: 'manage_restaurant' },
        { href: '/admin/hotels', label: 'Hoteles', icon: Building2, permission: 'manage_hotels' },
        { href: '/admin/events', label: 'Eventos', icon: PartyPopper, permission: 'manage_events' },
    ];

    const visibleItems = navItems.filter(item => hasPermission(userRole, item.permission));

    return (
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
            <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-eyebrow">Menú</span>
                {userRole && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-primary bg-primary/10 border border-primary/15 px-1.5 py-0.5 rounded">
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
                        className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        )}
                    >
                        <item.icon className={cn("size-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        <span className="truncate">{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

export function Sidebar({ userRole }: { userRole?: string }) {
    const effectiveRole = userRole || 'ADMIN';

    return (
        <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar h-screen fixed left-0 top-0 z-30">
            <div className="h-[72px] px-6 flex items-center justify-center border-b border-sidebar-border">
                <Link href="/admin" aria-label="Soto del Prior" className="flex items-center justify-center">
                    <Image
                        src="/logo-text.png"
                        alt="Soto del Prior"
                        width={180}
                        height={50}
                        priority
                        className="h-9 w-auto"
                    />
                </Link>
            </div>

            <Suspense fallback={<div className="flex-1 p-4 text-xs text-muted-foreground">Cargando…</div>}>
                <SidebarNav userRole={effectiveRole} />
            </Suspense>

            <div className="p-4 border-t border-sidebar-border">
                <p className="text-[11px] text-muted-foreground">
                    © {new Date().getFullYear()} Soto del Prior
                </p>
            </div>
        </aside>
    );
}
