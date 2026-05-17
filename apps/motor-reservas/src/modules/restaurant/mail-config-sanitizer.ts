/**
 * Forma cruda del mailConfig en el JSON de Hotel/Restaurant. Lo definimos
 * permisivo a propósito — viene de un Json column.
 */
export interface RawMailConfig {
    host?: string | null;
    port?: string | number | null;
    user?: string | null;
    pass?: string | null;
    from?: string | null;
    notificationsEnabled?: boolean;
    graph?: {
        tenantId?: string | null;
        clientId?: string | null;
        clientSecret?: string | null;
        senderEmail?: string | null;
    } | null;
}

export interface SanitizedMailConfig {
    host: string;
    port: string | number;
    user: string;
    from: string;
    notificationsEnabled: boolean;
    /** Bandera "está configurada la pass SMTP" en lugar del valor real. */
    passConfigured: boolean;
    graph?: {
        tenantId: string;
        clientId: string;
        senderEmail: string;
        clientSecretConfigured: boolean;
    };
}

/**
 * Forma mínima de un Hotel/Restaurant para esta función. mailConfig viene
 * de una columna Prisma `Json`, así que el shape es `unknown` hasta que
 * lo validamos dentro.
 */
export interface WithMailConfig {
    mailConfig?: unknown;
}

/**
 * Sanitiza datos sensibles del mailConfig antes de devolverlos en respuestas.
 * Quita contraseñas SMTP y client secrets, manteniendo banderas booleanas
 * (`passConfigured`, `clientSecretConfigured`) para que el admin sepa si
 * están configurados sin exponer el valor.
 *
 * Si la entidad es null o no tiene mailConfig (o no es objeto), se devuelve
 * tal cual.
 */
export function sanitizeMailConfig<T extends WithMailConfig>(entity: T | null | undefined): T | null | undefined {
    if (!entity) return entity;
    const raw = entity.mailConfig;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return entity;
    const cfg = raw as RawMailConfig;

    const sanitized: SanitizedMailConfig = {
        host: cfg.host || '',
        port: cfg.port || '',
        user: cfg.user || '',
        from: cfg.from || '',
        notificationsEnabled: cfg.notificationsEnabled !== false,
        passConfigured: !!(cfg.pass && cfg.pass.length > 0),
    };

    if (cfg.graph) {
        sanitized.graph = {
            tenantId: cfg.graph.tenantId || '',
            clientId: cfg.graph.clientId || '',
            senderEmail: cfg.graph.senderEmail || '',
            clientSecretConfigured: !!(cfg.graph.clientSecret && cfg.graph.clientSecret.length > 0),
        };
    }

    return { ...entity, mailConfig: sanitized };
}
