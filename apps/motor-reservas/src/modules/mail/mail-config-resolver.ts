/**
 * Resolver del mailConfig efectivo para una entidad (Hotel o Restaurant).
 *
 * Cuando un Hotel está vinculado a un Restaurant (Hotel.restaurantId), el "centro" opera
 * con un único correo de salida (p. ej. info@sotodelprior.com configurado en el restaurante).
 * Este helper hace fallback al config del vinculado cuando la entidad primaria no tiene
 * credenciales completas, sin tocar la base de datos.
 */

export interface RawMailConfig {
    host?: string | null;
    port?: string | number | null;
    user?: string | null;
    pass?: string | null;
    from?: string | null;
    secure?: boolean;
    notificationsEnabled?: boolean;
    graph?: {
        tenantId?: string | null;
        clientId?: string | null;
        clientSecret?: string | null;
        senderEmail?: string | null;
    } | null;
}

/** Una config es "usable" si tiene credenciales SMTP completas o credenciales Graph completas. */
export function hasUsableMailConfig(cfg: RawMailConfig | null | undefined): boolean {
    if (!cfg) return false;
    const smtpOk = !!(cfg.host && cfg.user && cfg.pass);
    const graphOk = !!(cfg.graph?.tenantId && cfg.graph?.clientId && cfg.graph?.clientSecret);
    return smtpOk || graphOk;
}

/**
 * Resuelve el mailConfig efectivo:
 *   1. Si la entidad primaria tiene `notificationsEnabled === false` → se respeta SIEMPRE
 *      (el opt-out del centro pesa más que la herencia).
 *   2. Si la primaria tiene credenciales completas → la suya.
 *   3. Si no, y el vinculado tiene credenciales completas → mezcla:
 *      campos de autenticación del vinculado + metadatos del primario.
 *   4. Si ninguno tiene credenciales → primaria tal cual (sendEmail caerá a env vars).
 */
export function resolveMailConfig(
    primary: RawMailConfig | null | undefined,
    fallback: RawMailConfig | null | undefined
): RawMailConfig {
    if (primary && primary.notificationsEnabled === false) return primary;

    if (hasUsableMailConfig(primary)) return primary as RawMailConfig;

    if (hasUsableMailConfig(fallback)) {
        const auth = pickAuthFields(fallback as RawMailConfig);
        return { ...(fallback as RawMailConfig), ...(primary || {}), ...auth };
    }

    return primary || {};
}

/** Subconjunto de campos relacionados con autenticación / envío. */
function pickAuthFields(cfg: RawMailConfig): RawMailConfig {
    const out: RawMailConfig = {};
    if (cfg.host) out.host = cfg.host;
    if (cfg.port) out.port = cfg.port;
    if (cfg.user) out.user = cfg.user;
    if (cfg.pass) out.pass = cfg.pass;
    if (cfg.from) out.from = cfg.from;
    if (cfg.secure !== undefined) out.secure = cfg.secure;
    if (cfg.graph) out.graph = cfg.graph;
    return out;
}
