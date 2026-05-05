'use client';

import React from 'react';
import { Permission, hasPermission } from '@/lib/permissions';

interface GuardProps {
    permission: Permission;
    userRole?: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Component to wrap elements that should only be visible with certain permissions.
 */
export function Guard({ permission, userRole, children, fallback = null }: GuardProps) {
    if (!hasPermission(userRole, permission)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

/**
 * Hook-style permission check for use in client components
 */
export function usePermission(userRole?: string) {
    return (permission: Permission) => hasPermission(userRole, permission);
}
