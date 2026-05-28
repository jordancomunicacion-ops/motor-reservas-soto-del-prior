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
 * Defaults por rol — solo se usan como fallback cuando el usuario no tiene
 * `permissions` explícitos en la DB (p. ej. usuarios antiguos creados antes
 * del editor de accesos). ADMIN siempre pasa todo sin tocar esta tabla.
 *
 * Mantener alineado con los SYSTEM_PROFILES de `components/admin/AccessManager.tsx`.
 */
const ROLE_DEFAULTS: Record<string, Permission[]> = {
    MANAGER: [
        'view_dashboard',
        'view_calendar',
        'manage_bookings',
        'view_occupancy',
        'manage_restaurant',
        'manage_hotels',
        'manage_events',
        'view_reports',
    ],
    RECEPTIONIST: [
        'view_dashboard',
        'view_calendar',
        'manage_bookings',
        'view_occupancy',
    ],
    STAFF: [
        'view_dashboard',
        'view_calendar',
        'view_occupancy',
    ],
};

function parsePermissions(raw: string | null | undefined): Permission[] {
    if (!raw) return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean) as Permission[];
}

/**
 * Decide si un usuario con `role` (+ permisos opcionales en `userPermissions`)
 * tiene un permiso concreto.
 *
 * - ADMIN siempre pasa.
 * - Si el usuario tiene `userPermissions` en DB, esa cadena es la verdad
 *   (lo que decide el admin desde el editor de accesos manda).
 * - Si no hay cadena, se cae al default del rol (compatibilidad con usuarios
 *   antiguos sin permisos explícitos).
 */
export function hasPermission(
    role: string | undefined,
    permission: Permission,
    userPermissions?: string | null,
): boolean {
    if (!role) return false;
    const upper = role.toUpperCase();

    if (upper === 'ADMIN') return true;

    if (userPermissions !== undefined && userPermissions !== null) {
        return parsePermissions(userPermissions).includes(permission);
    }

    const defaults = ROLE_DEFAULTS[upper];
    return defaults ? defaults.includes(permission) : false;
}

export function getRoleDisplayName(role: string | undefined): string {
    switch (role?.toUpperCase()) {
        case 'ADMIN': return 'Administrador';
        case 'MANAGER': return 'Gerencia';
        case 'RECEPTIONIST': return 'Recepción';
        case 'STAFF': return 'Personal';
        case 'EMPLOYEE': return 'Empleado';
        case 'CUSTOMER': return 'Cliente';
        default: return role || 'Usuario';
    }
}
