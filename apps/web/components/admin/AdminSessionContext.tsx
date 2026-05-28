"use client";
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { hasPermission, type Permission } from '@/lib/permissions';

interface AdminSessionValue {
    role: string | undefined;
    permissions: string | null;
    restaurantId: string | null;
    hotelId: string | null;
    can: (permission: Permission) => boolean;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({
    role,
    permissions,
    restaurantId,
    hotelId,
    children,
}: {
    role: string | undefined;
    permissions: string | null;
    restaurantId: string | null;
    hotelId: string | null;
    children: ReactNode;
}) {
    const value = useMemo<AdminSessionValue>(() => ({
        role,
        permissions,
        restaurantId,
        hotelId,
        can: (permission: Permission) => hasPermission(role, permission, permissions),
    }), [role, permissions, restaurantId, hotelId]);

    return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
    const ctx = useContext(AdminSessionContext);
    if (!ctx) {
        // Fallback seguro: si por error un componente fuera del Provider llama al hook,
        // devolvemos un usuario sin permisos en vez de petar.
        return {
            role: undefined,
            permissions: null,
            restaurantId: null,
            hotelId: null,
            can: () => false,
        };
    }
    return ctx;
}
