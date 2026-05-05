export type Role = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER';

export type Permission = 
    | 'view_dashboard'
    | 'view_calendar'
    | 'manage_bookings'
    | 'view_occupancy'
    | 'manage_restaurant'
    | 'manage_hotels'
    | 'manage_rates'
    | 'manage_channels'
    | 'manage_events'
    | 'manage_widget'
    | 'view_reports';

/**
 * Role-based permission mapping
 * You can easily modify this to choose what each role can do.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    ADMIN: [
        'view_dashboard',
        'view_calendar',
        'manage_bookings',
        'view_occupancy',
        'manage_restaurant',
        'manage_hotels',
        'manage_rates',
        'manage_channels',
        'manage_events',
        'manage_widget',
        'view_reports',
    ],
    EMPLOYEE: [
        'view_dashboard',
        'view_calendar',
        'manage_bookings',
        'view_occupancy',
        'manage_restaurant',
        'view_reports',
    ],
    CUSTOMER: [
        // Customers might only see their own profile or specific public-facing tools
        // For now, let's say they can see the dashboard (their own)
        'view_dashboard',
    ],
};

/**
 * Checks if a role has a specific permission
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
    if (!role) return false;
    const userRole = role.toUpperCase() as Role;
    const permissions = ROLE_PERMISSIONS[userRole];
    
    if (!permissions) return false;
    return permissions.includes(permission);
}

/**
 * Helper to get the display name of a role in Spanish
 */
export function getRoleDisplayName(role: string | undefined): string {
    switch (role?.toUpperCase()) {
        case 'ADMIN': return 'Administrador';
        case 'EMPLOYEE': return 'Empleado';
        case 'CUSTOMER': return 'Cliente';
        default: return role || 'Usuario';
    }
}
