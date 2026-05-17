import { sanitizeMailConfig } from './mail-config-sanitizer';

describe('sanitizeMailConfig', () => {
    it('null/undefined → devuelve tal cual', () => {
        expect(sanitizeMailConfig(null)).toBeNull();
        expect(sanitizeMailConfig(undefined)).toBeUndefined();
    });

    it('entidad sin mailConfig → devuelve tal cual', () => {
        const e = { id: 'r1', name: 'Soto' };
        expect(sanitizeMailConfig(e)).toBe(e);
    });

    it('mailConfig null → devuelve tal cual', () => {
        const e = { id: 'r1', mailConfig: null };
        expect(sanitizeMailConfig(e)).toBe(e);
    });

    it('mailConfig string (Json corrupto) → devuelve tal cual', () => {
        const e = { id: 'r1', mailConfig: 'no-deberia-pasar' };
        expect(sanitizeMailConfig(e)).toBe(e);
    });

    it('SMTP completo: oculta pass, expone passConfigured=true', () => {
        const e = {
            id: 'r1',
            mailConfig: {
                host: 'smtp.gmail.com',
                port: '587',
                user: 'a@x',
                pass: 'super-secret',
                from: 'no-reply@x',
                notificationsEnabled: true,
            },
        };
        const result = sanitizeMailConfig(e);
        expect(result?.mailConfig).toEqual({
            host: 'smtp.gmail.com',
            port: '587',
            user: 'a@x',
            from: 'no-reply@x',
            notificationsEnabled: true,
            passConfigured: true,
        });
        // El campo pass NO debe aparecer en la salida.
        expect((result?.mailConfig as Record<string, unknown>).pass).toBeUndefined();
    });

    it('SMTP sin pass: passConfigured=false', () => {
        const e = {
            id: 'r1',
            mailConfig: {
                host: 'smtp.gmail.com',
                port: '587',
                user: 'a@x',
                from: 'no-reply@x',
            },
        };
        const result = sanitizeMailConfig(e);
        expect((result?.mailConfig as Record<string, unknown>).passConfigured).toBe(false);
    });

    it('SMTP con pass vacío: passConfigured=false (no se considera configurado)', () => {
        const e = { id: 'r1', mailConfig: { pass: '' } };
        const result = sanitizeMailConfig(e);
        expect((result?.mailConfig as Record<string, unknown>).passConfigured).toBe(false);
    });

    it('notificationsEnabled por defecto true cuando no llega', () => {
        const e = { id: 'r1', mailConfig: { host: 'x' } };
        const result = sanitizeMailConfig(e);
        expect((result?.mailConfig as Record<string, unknown>).notificationsEnabled).toBe(true);
    });

    it('notificationsEnabled explícito en false se respeta', () => {
        const e = { id: 'r1', mailConfig: { host: 'x', notificationsEnabled: false } };
        const result = sanitizeMailConfig(e);
        expect((result?.mailConfig as Record<string, unknown>).notificationsEnabled).toBe(false);
    });

    it('Graph: oculta clientSecret, expone clientSecretConfigured=true', () => {
        const e = {
            id: 'r1',
            mailConfig: {
                host: '',
                graph: {
                    tenantId: 'tenant-1',
                    clientId: 'client-1',
                    clientSecret: 'super-secret-graph',
                    senderEmail: 'noreply@hotel.com',
                },
            },
        };
        const result = sanitizeMailConfig(e);
        const graph = (result?.mailConfig as { graph: Record<string, unknown> }).graph;
        expect(graph).toEqual({
            tenantId: 'tenant-1',
            clientId: 'client-1',
            senderEmail: 'noreply@hotel.com',
            clientSecretConfigured: true,
        });
        expect(graph.clientSecret).toBeUndefined();
    });

    it('Graph sin clientSecret: clientSecretConfigured=false', () => {
        const e = {
            id: 'r1',
            mailConfig: {
                graph: { tenantId: 't', clientId: 'c', senderEmail: 's@x' },
            },
        };
        const result = sanitizeMailConfig(e);
        const graph = (result?.mailConfig as { graph: Record<string, unknown> }).graph;
        expect(graph.clientSecretConfigured).toBe(false);
    });

    it('no muta el objeto original', () => {
        const e = {
            id: 'r1',
            mailConfig: { pass: 'secret', host: 'smtp.x' },
        };
        const original = JSON.parse(JSON.stringify(e));
        sanitizeMailConfig(e);
        expect(e).toEqual(original);
    });

    it('preserva otros campos de la entidad (no solo mailConfig)', () => {
        const e = {
            id: 'r1',
            name: 'SOTO',
            currency: 'EUR',
            mailConfig: { pass: 'x' },
        };
        const result = sanitizeMailConfig(e);
        expect(result?.id).toBe('r1');
        expect(result?.name).toBe('SOTO');
        expect(result?.currency).toBe('EUR');
    });
});
