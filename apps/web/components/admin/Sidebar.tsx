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
    restaurantId?: string | null;
    hotelId?: string | null;
}

function SidebarNav({ userRole, restaurantId, hotelId }: SidebarNavProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();

    // Scope: si el user pertenece solo a un restaurante, ocultamos hoteles/ocupación.
    //        si pertenece solo a un hotel, ocultamos la sección de restaurante (a menos que el hotel
    //        tenga restaurante vinculado, en cuyo caso lo gestionamos desde la página del hotel).
    //        si no tiene scope (global), mostramos todo.
    const hasRestaurantScope = !!restaurantId;
    const hasHotelScope = !!hotelId;
    const isGlobal = !hasRestaurantScope && !hasHotelScope;

    const navItems: { href: string; label: string; icon: LucideIcon; permission: Permission; visibleInScope: boolean }[] = [
        { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard', visibleInScope: true },
        { href: '/admin/calendar', label: 'Calendario y reservas', icon: Calendar, permission: 'view_calendar', visibleInScope: true },
        { href: '/admin/occupancy', label: 'Planning de ocupación', icon: Building2, permission: 'view_occupancy', visibleInScope: isGlobal || hasHotelScope },
        { href: '/admin/restaurant', label: 'Restaurante', icon: Utensils, permission: 'manage_restaurant', visibleInScope: isGlobal || hasRestaurantScope },
        { href: '/admin/hotels', label: 'Hoteles', icon: Building2, permission: 'manage_hotels', visibleInScope: isGlobal || hasHotelScope },
        { href: '/admin/events', label: 'Eventos', icon: PartyPopper, permission: 'manage_events', visibleInScope: true },
    ];

    const visibleItems = navItems.filter(item => item.visibleInScope && hasPermission(userRole, item.permission));

    return (
        <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="px-2 mb-3 flex items-center justify-between">
                <span className="text-eyebrow">Menú</span>
                {userRole && (
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                        {getRoleDisplayName(userRole)}
                    </span>
                )}
            </div>
            <ul className="space-y-px">
                {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const href = queryString ? `${item.href}?${queryString}` : item.href;
                    return (
                        <li key={item.href} className="relative">
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-primary"
                                />
                            )}
                            <Link
                                href={href}
                                className={cn(
                                    "flex items-center gap-2.5 rounded-md px-3 h-9 text-[13px] font-medium transition-colors",
                                    isActive
                                        ? "bg-sidebar-accent text-foreground"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-foreground",
                                )}
                            >
                                <item.icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")} />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

export function Sidebar({ userRole, restaurantId, hotelId }: { userRole?: string; restaurantId?: string | null; hotelId?: string | null }) {
    const effectiveRole = userRole || 'ADMIN';

    return (
        <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar h-screen fixed left-0 top-0 z-30">
            <div className="h-[64px] px-5 flex items-center justify-center border-b border-sidebar-border">
                <Link href="/admin" aria-label="Soto del Prior" className="flex items-center justify-center">
                    <Image
                        src="/logo-text.png"
                        alt="Soto del Prior"
                        width={180}
                        height={50}
                        priority
                        className="h-8 w-auto invert"
                    />
                </Link>
            </div>

            <Suspense fallback={<div className="flex-1 p-4 text-xs text-muted-foreground">Cargando…</div>}>
                <SidebarNav userRole={effectiveRole} restaurantId={restaurantId} hotelId={hotelId} />
            </Suspense>

            <div className="p-3 border-t border-sidebar-border">
                <p className="text-[10px] text-muted-foreground/70 px-2">
                    © {new Date().getFullYear()} Soto del Prior
                </p>
            </div>
        </aside>
    );
}
