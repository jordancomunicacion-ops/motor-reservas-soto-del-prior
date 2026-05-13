#!/usr/bin/env node
/*
 * Script de configuración SMTP para restaurantes/hoteles
 *
 * Uso:
 *   node scripts/setup-mail.js test <host> <port> <user> <pass>      - Verifica credenciales SMTP
 *   node scripts/setup-mail.js list                                  - Lista restaurantes y hoteles
 *   node scripts/setup-mail.js save-restaurant <id> <host> <port> <user> <pass> [from] [contactEmail]
 *   node scripts/setup-mail.js save-hotel <id> <host> <port> <user> <pass> [from] [contactEmail]
 *   node scripts/setup-mail.js show-restaurant <id>                  - Muestra config (sin password)
 *   node scripts/setup-mail.js send-test <restaurantId> <toEmail>    - Envía email de prueba
 *
 * Presets de servidores SMTP:
 *   - Outlook personal:  smtp-mail.outlook.com:587
 *   - Office 365:        smtp.office365.com:587
 *   - Gmail:             smtp.gmail.com:587 (requiere App Password)
 *   - Yahoo:             smtp.mail.yahoo.com:587
 *
 * IMPORTANTE para Outlook/Office365:
 *   Debes generar una "Contraseña de Aplicación" en:
 *   https://account.microsoft.com/security/ (personal)
 *   https://account.activedirectory.windowsazure.com/AppPasswords.aspx (empresarial)
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const { ConfidentialClientApplication } = require('@azure/msal-node');
require('isomorphic-fetch');
const { Client: GraphClient } = require('@microsoft/microsoft-graph-client');

const prisma = new PrismaClient();

function createTransporter(host, port, user, pass) {
    return nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        }
    });
}

async function testSmtp(host, port, user, pass) {
    console.log(`\nVerificando conexión SMTP a ${host}:${port} con usuario ${user}...`);
    const transporter = createTransporter(host, port, user, pass);
    try {
        await transporter.verify();
        console.log('✓ ÉXITO: Las credenciales son correctas y el servidor responde.');
        return true;
    } catch (e) {
        console.error('✗ ERROR:', e.message);
        const msg = e.message.toLowerCase();
        if (msg.includes('authentication') || msg.includes('535')) {
            console.log('\n→ PISTA: Credenciales incorrectas.');
            console.log('  Para Outlook: necesitas una "Contraseña de Aplicación", no tu contraseña normal.');
            console.log('  Genérala aquí: https://account.microsoft.com/security/');
        } else if (msg.includes('etimedout') || msg.includes('econnrefused')) {
            console.log('\n→ PISTA: No se puede conectar. Verifica host y puerto.');
        }
        return false;
    }
}

async function listEntities() {
    const restaurants = await prisma.restaurant.findMany({
        select: { id: true, name: true, contactEmail: true, mailConfig: true }
    });
    console.log('\n=== RESTAURANTES ===');
    restaurants.forEach(r => {
        const cfg = r.mailConfig || {};
        const configured = cfg.host && cfg.user ? '✓ Configurado' : '✗ Sin configurar';
        console.log(`\n  ${r.name}`);
        console.log(`    id: ${r.id}`);
        console.log(`    contactEmail: ${r.contactEmail || '(vacío)'}`);
        console.log(`    SMTP: ${configured}`);
        if (cfg.host) console.log(`    host: ${cfg.host}:${cfg.port || 587} - user: ${cfg.user}`);
    });

    const hotels = await prisma.hotel.findMany({
        select: { id: true, name: true, contactEmail: true, mailConfig: true }
    });
    console.log('\n=== HOTELES ===');
    hotels.forEach(h => {
        const cfg = h.mailConfig || {};
        const configured = cfg.host && cfg.user ? '✓ Configurado' : '✗ Sin configurar';
        console.log(`\n  ${h.name}`);
        console.log(`    id: ${h.id}`);
        console.log(`    contactEmail: ${h.contactEmail || '(vacío)'}`);
        console.log(`    SMTP: ${configured}`);
        if (cfg.host) console.log(`    host: ${cfg.host}:${cfg.port || 587} - user: ${cfg.user}`);
    });
}

async function saveRestaurant(id, host, port, user, pass, from, contactEmail) {
    // Verify first
    const ok = await testSmtp(host, port, user, pass);
    if (!ok) {
        console.log('\nNo se guardará la configuración porque la verificación falló. Corrige las credenciales e inténtalo de nuevo.');
        return;
    }

    const mailConfig = {
        host,
        port: String(port),
        user,
        pass,
        from: from || user,
        notificationsEnabled: true
    };

    const data = { mailConfig };
    if (contactEmail) data.contactEmail = contactEmail;

    await prisma.restaurant.update({ where: { id }, data });
    console.log(`\n✓ Configuración SMTP guardada para el restaurante ${id}`);
    console.log('  Las notificaciones por email ahora deberían funcionar.');
}

async function saveHotel(id, host, port, user, pass, from, contactEmail) {
    const ok = await testSmtp(host, port, user, pass);
    if (!ok) {
        console.log('\nNo se guardará la configuración porque la verificación falló.');
        return;
    }

    const mailConfig = {
        host,
        port: String(port),
        user,
        pass,
        from: from || user,
        notificationsEnabled: true
    };

    const data = { mailConfig };
    if (contactEmail) data.contactEmail = contactEmail;

    await prisma.hotel.update({ where: { id }, data });
    console.log(`\n✓ Configuración SMTP guardada para el hotel ${id}`);
}

async function showRestaurant(id) {
    const r = await prisma.restaurant.findUnique({
        where: { id },
        select: { id: true, name: true, contactEmail: true, mailConfig: true }
    });
    if (!r) {
        console.log('Restaurante no encontrado');
        return;
    }
    const cfg = r.mailConfig || {};
    console.log(`\n${r.name} (${r.id})`);
    console.log(`  contactEmail: ${r.contactEmail || '(vacío)'}`);
    console.log(`  notificationsEnabled: ${cfg.notificationsEnabled !== false}`);
    console.log(`  host: ${cfg.host || '(vacío)'}`);
    console.log(`  port: ${cfg.port || '(vacío)'}`);
    console.log(`  user: ${cfg.user || '(vacío)'}`);
    console.log(`  pass: ${cfg.pass ? '••••••••' + cfg.pass.slice(-2) : '(vacío)'}`);
    console.log(`  from: ${cfg.from || '(usa user)'}`);
}

async function sendTest(restaurantId, toEmail) {
    const r = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) { console.log('Restaurante no encontrado'); return; }
    const cfg = r.mailConfig || {};
    if (!cfg.host || !cfg.user || !cfg.pass) {
        console.log('Restaurante sin configuración SMTP. Configúralo primero con save-restaurant.');
        return;
    }
    const transporter = createTransporter(cfg.host, cfg.port || 587, cfg.user, cfg.pass);
    try {
        const info = await transporter.sendMail({
            from: `"${r.name}" <${cfg.from || cfg.user}>`,
            to: toEmail,
            subject: `Prueba de configuración - ${r.name}`,
            html: `<h1>¡Funciona!</h1><p>Este es un email de prueba enviado desde el sistema de reservas de <b>${r.name}</b>.</p><p>Si recibes este mensaje, la configuración SMTP es correcta.</p>`
        });
        console.log(`✓ Email enviado: ${info.messageId}`);
    } catch (e) {
        console.error('✗ Error:', e.message);
    }
}

async function getGraphAccessToken(tenantId, clientId, clientSecret) {
    const cca = new ConfidentialClientApplication({
        auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}`, clientSecret }
    });
    const result = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default']
    });
    if (!result?.accessToken) throw new Error('No se pudo obtener token de Graph');
    return result.accessToken;
}

async function testGraph(tenantId, clientId, clientSecret, senderEmail) {
    console.log(`\nVerificando configuración Microsoft Graph...`);
    console.log(`  Tenant ID: ${tenantId}`);
    console.log(`  Client ID: ${clientId}`);
    console.log(`  Sender:    ${senderEmail}`);
    try {
        const token = await getGraphAccessToken(tenantId, clientId, clientSecret);
        const client = GraphClient.init({ authProvider: (done) => done(null, token) });
        const user = await client.api(`/users/${encodeURIComponent(senderEmail)}`)
            .select('mail,userPrincipalName,displayName').get();
        console.log(`✓ ÉXITO: Mailbox encontrado: ${user.displayName} <${user.mail || user.userPrincipalName}>`);
        return true;
    } catch (e) {
        console.error('✗ ERROR:', e.message);
        const msg = e.message.toLowerCase();
        if (msg.includes('aadsts7000215') || msg.includes('invalid client secret')) {
            console.log('→ PISTA: Client Secret incorrecto o expirado. Genera uno nuevo en Azure → App Registrations → Certificates & secrets.');
        } else if (msg.includes('aadsts700016')) {
            console.log('→ PISTA: Client ID incorrecto.');
        } else if (msg.includes('aadsts90002')) {
            console.log('→ PISTA: Tenant ID incorrecto.');
        } else if (msg.includes('forbidden') || msg.includes('403')) {
            console.log('→ PISTA: Faltan permisos. Necesita Mail.Send (Application) con admin consent.');
        } else if (msg.includes('not found') || msg.includes('404')) {
            console.log('→ PISTA: senderEmail no existe en el tenant o no tiene mailbox.');
        }
        return false;
    }
}

async function sendGraphTest(tenantId, clientId, clientSecret, senderEmail, to) {
    try {
        const token = await getGraphAccessToken(tenantId, clientId, clientSecret);
        const client = GraphClient.init({ authProvider: (done) => done(null, token) });
        await client.api(`/users/${encodeURIComponent(senderEmail)}/sendMail`).post({
            message: {
                subject: 'Prueba Graph API - Reservas SOTOdelPRIOR',
                body: { contentType: 'HTML', content: '<h1>¡Funciona!</h1><p>Este email fue enviado via Microsoft Graph API desde el sistema de reservas.</p>' },
                toRecipients: [{ emailAddress: { address: to } }]
            },
            saveToSentItems: true
        });
        console.log(`✓ Email enviado via Graph a ${to} (desde ${senderEmail})`);
        return true;
    } catch (e) {
        console.error('✗ Error Graph sendMail:', e.message);
        return false;
    }
}

async function saveRestaurantGraph(id, tenantId, clientId, clientSecret, senderEmail, contactEmail) {
    const ok = await testGraph(tenantId, clientId, clientSecret, senderEmail);
    if (!ok) {
        console.log('\nNo se guarda la configuración: la verificación Graph falló.');
        return;
    }
    const existing = await prisma.restaurant.findUnique({ where: { id }, select: { mailConfig: true } });
    const mailConfig = {
        ...(existing?.mailConfig || {}),
        graph: { tenantId, clientId, clientSecret, senderEmail },
        from: senderEmail,
        notificationsEnabled: true
    };
    const data = { mailConfig };
    if (contactEmail) data.contactEmail = contactEmail;
    await prisma.restaurant.update({ where: { id }, data });
    console.log(`\n✓ Configuración Graph guardada para el restaurante ${id}`);
}

async function main() {
    const [cmd, ...args] = process.argv.slice(2);
    try {
        switch (cmd) {
            case 'test':
                await testSmtp(args[0], args[1], args[2], args[3]);
                break;
            case 'test-graph':
                await testGraph(args[0], args[1], args[2], args[3]);
                break;
            case 'send-graph-test':
                await sendGraphTest(args[0], args[1], args[2], args[3], args[4]);
                break;
            case 'save-graph-restaurant':
                await saveRestaurantGraph(args[0], args[1], args[2], args[3], args[4], args[5]);
                break;
            case 'list':
                await listEntities();
                break;
            case 'save-restaurant':
                await saveRestaurant(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
                break;
            case 'save-hotel':
                await saveHotel(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
                break;
            case 'show-restaurant':
                await showRestaurant(args[0]);
                break;
            case 'send-test':
                await sendTest(args[0], args[1]);
                break;
            default:
                console.log(`
=== COMANDOS SMTP ===
  test <host> <port> <user> <pass>
  save-restaurant <id> <host> <port> <user> <pass> [from] [contactEmail]
  save-hotel <id> <host> <port> <user> <pass> [from] [contactEmail]
  send-test <restaurantId> <toEmail>

=== COMANDOS MICROSOFT GRAPH (Office 365 sin SMTP) ===
  test-graph <tenantId> <clientId> <clientSecret> <senderEmail>
  send-graph-test <tenantId> <clientId> <clientSecret> <senderEmail> <toEmail>
  save-graph-restaurant <id> <tenantId> <clientId> <clientSecret> <senderEmail> [contactEmail]

=== GENERAL ===
  list
  show-restaurant <id>

Presets SMTP:
  Outlook:    smtp-mail.outlook.com 587
  Office365:  smtp.office365.com 587
  Gmail:      smtp.gmail.com 587

Ejemplos SMTP:
  node scripts/setup-mail.js test smtp.office365.com 587 gerencia@sotodelprior.com APP_PASSWORD

Ejemplos Graph (RECOMENDADO para SOTOdelPRIOR - Office 365):
  # 1. Verificar credenciales Graph (sin guardar)
  node scripts/setup-mail.js test-graph TENANT_ID CLIENT_ID CLIENT_SECRET gerencia@sotodelprior.com

  # 2. Enviar email de prueba via Graph
  node scripts/setup-mail.js send-graph-test TENANT_ID CLIENT_ID CLIENT_SECRET gerencia@sotodelprior.com tu@email.com

  # 3. Guardar Graph config para SOTO del PRIOR
  node scripts/setup-mail.js save-graph-restaurant 47dc0a72-3379-46ab-bd5b-01a20c7ae58f TENANT_ID CLIENT_ID CLIENT_SECRET gerencia@sotodelprior.com

Cómo conseguir TENANT_ID, CLIENT_ID y CLIENT_SECRET: ver CONFIGURACION_EMAILS.md
`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(err => { console.error(err); process.exit(1); });
