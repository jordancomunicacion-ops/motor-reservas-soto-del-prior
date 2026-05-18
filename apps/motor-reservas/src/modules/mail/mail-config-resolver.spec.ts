import { resolveMailConfig, hasUsableMailConfig } from './mail-config-resolver';

describe('hasUsableMailConfig', () => {
    it('reconoce SMTP completo', () => {
        expect(hasUsableMailConfig({ host: 'smtp.x', user: 'u', pass: 'p' })).toBe(true);
    });

    it('reconoce Graph completo', () => {
        expect(hasUsableMailConfig({
            graph: { tenantId: 't', clientId: 'c', clientSecret: 's' }
        })).toBe(true);
    });

    it('SMTP incompleto (sin pass) → no usable', () => {
        expect(hasUsableMailConfig({ host: 'smtp.x', user: 'u' })).toBe(false);
    });

    it('null/undefined → no usable', () => {
        expect(hasUsableMailConfig(null)).toBe(false);
        expect(hasUsableMailConfig(undefined)).toBe(false);
        expect(hasUsableMailConfig({})).toBe(false);
    });
});

describe('resolveMailConfig', () => {
    const smtpOk = { host: 'smtp.x', port: 587, user: 'info@sotodelprior.com', pass: 'app-pass', from: 'info@sotodelprior.com' };
    const graphOk = { graph: { tenantId: 't', clientId: 'c', clientSecret: 's', senderEmail: 'info@sotodelprior.com' } };

    it('si el primario tiene SMTP completo, lo usa', () => {
        expect(resolveMailConfig(smtpOk, { host: 'other', user: 'other', pass: 'p' })).toEqual(smtpOk);
    });

    it('si el primario no tiene credenciales, cae al fallback (caso hotel→restaurante)', () => {
        const hotelEmpty = { notificationsEnabled: true };
        const restaurantConfig = smtpOk;
        const result = resolveMailConfig(hotelEmpty, restaurantConfig);
        expect(result.user).toBe('info@sotodelprior.com');
        expect(result.pass).toBe('app-pass');
        expect(result.host).toBe('smtp.x');
        // mantiene el flag de notifications del primario
        expect(result.notificationsEnabled).toBe(true);
    });

    it('si el primario tiene notificationsEnabled=false, se respeta y NO se hereda del fallback', () => {
        const hotelOptedOut = { notificationsEnabled: false };
        const result = resolveMailConfig(hotelOptedOut, smtpOk);
        expect(result.notificationsEnabled).toBe(false);
        // no debe heredar credenciales: el centro está apagado
        expect(result.user).toBeUndefined();
        expect(result.pass).toBeUndefined();
    });

    it('si ninguno tiene credenciales, devuelve el primario (vacío) tal cual', () => {
        const hotelEmpty = { notificationsEnabled: true };
        const restaurantEmpty = {};
        expect(resolveMailConfig(hotelEmpty, restaurantEmpty)).toBe(hotelEmpty);
    });

    it('fallback de Graph: hereda credenciales graph cuando el primario está vacío', () => {
        const result = resolveMailConfig({}, graphOk);
        expect(result.graph?.tenantId).toBe('t');
        expect(result.graph?.clientSecret).toBe('s');
    });

    it('primario con Graph completo no necesita fallback', () => {
        const result = resolveMailConfig(graphOk, smtpOk);
        // mantiene el graph original sin contaminar con SMTP del fallback
        expect(result.graph).toEqual(graphOk.graph);
        expect(result.host).toBeUndefined();
    });

    it('primario con `from` propio se preserva al heredar credenciales del fallback', () => {
        // Caso: el restaurante define un from específico ("Soto del Prior — Restaurante") pero
        // las credenciales SMTP están en el hotel. El from del primario debe persistir.
        const restaurantOnlyFrom = { from: 'reservas@sotodelprior.com', notificationsEnabled: true };
        const hotelCreds = smtpOk;
        const result = resolveMailConfig(restaurantOnlyFrom, hotelCreds);
        // hereda credenciales del hotel (incluyendo su from, porque pickAuthFields va al final)
        expect(result.user).toBe('info@sotodelprior.com');
        // pero los datos del primario que no son auth (notificationsEnabled) se preservan
        expect(result.notificationsEnabled).toBe(true);
    });

    it('null/undefined primario funciona y cae al fallback', () => {
        expect(resolveMailConfig(null, smtpOk).user).toBe('info@sotodelprior.com');
        expect(resolveMailConfig(undefined, smtpOk).user).toBe('info@sotodelprior.com');
    });
});
