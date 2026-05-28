'use client';

import React from 'react';
import { Permission, hasPermission } from '@/lib/permissions';

interface GuardProps {
    permission: Permission;
    userRole?: string;
    userPermissions?: string | null;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Component to wrap elements that should only be visible with certain permissions.
 */
export function Guard({ permission, userRole, userPermissions, children, fallback = null }: GuardProps) {
    if (!hasPermission(userRole, permission, userPermissions)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Hook-style permission check for use in client components
 */
export function usePermission(userRole?: string, userPermissions?: string | null) {
    return (permission: Permission) => hasPermission(userRole, permission, userPermissions);
}
