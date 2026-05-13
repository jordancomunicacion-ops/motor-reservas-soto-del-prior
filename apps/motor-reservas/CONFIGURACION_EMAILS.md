# Configuración de Emails - Sistema de Reservas

## ⚠️ DESCUBRIMIENTO IMPORTANTE para SOTOdelPRIOR

El servidor Outlook de **gerencia@sotodelprior.com** rechaza autenticación SMTP con:

```
535 5.7.139 Authentication unsuccessful, SmtpClientAuthentication is disabled for the Tenant
```

**Microsoft 365 tiene desactivada la autenticación SMTP a nivel tenant** (política de seguridad desde 2022).

## ✅ SOLUCIÓN RECOMENDADA: Microsoft Graph API

En lugar de SMTP, usamos la API moderna de Microsoft Graph que funciona aunque SmtpAuth esté deshabilitado. Ya está **implementado en el código** — solo falta registrar la App en Azure.

### Pasos en Azure Portal (10 minutos, solo una vez)

#### 1. Crear App Registration

1. Entra en https://portal.azure.com con la cuenta de admin del tenant (`gerencia@sotodelprior.com` u otra admin de Microsoft Entra ID)
2. Buscar **"Microsoft Entra ID"** (antes Azure Active Directory)
3. Menú izquierdo → **App registrations** → **+ New registration**
4. Rellenar:
   - **Name**: `Reservas SOTOdelPRIOR - Mailer`
   - **Supported account types**: `Accounts in this organizational directory only (single tenant)`
   - **Redirect URI**: dejar vacío
5. Click **Register**

#### 2. Copiar los IDs (guárdalos)

En la página de la app que acabas de crear, en **Overview** verás:
- **Application (client) ID** → este es el `CLIENT_ID`
- **Directory (tenant) ID** → este es el `TENANT_ID`

#### 3. Crear Client Secret

1. Menú izquierdo de la app → **Certificates & secrets**
2. **+ New client secret**
3. Description: `Reservas Mailer Secret`
4. Expires: `24 months` (recomendado) o `Never`
5. Click **Add**
6. **⚠️ COPIA EL "Value" INMEDIATAMENTE** — solo se muestra una vez. Este es el `CLIENT_SECRET`

#### 4. Conceder permisos Mail.Send

1. Menú izquierdo de la app → **API permissions**
2. **+ Add a permission**
3. **Microsoft Graph** → **Application permissions** (NO Delegated)
4. Buscar y marcar: **Mail.Send**
5. Click **Add permissions**
6. ⚠️ **MUY IMPORTANTE**: Click el botón **"Grant admin consent for [tu tenant]"** en la barra superior
7. Confirmar — debería aparecer ✓ verde junto a Mail.Send

#### 5. (Opcional) Restringir a un solo buzón

Por defecto la app puede enviar desde cualquier buzón del tenant. Para restringir a solo `gerencia@sotodelprior.com`:

```powershell
# En PowerShell con módulo Exchange Online Management
Install-Module -Name ExchangeOnlineManagement
Connect-ExchangeOnline -UserPrincipalName admin@sotodelprior.com

New-ApplicationAccessPolicy `
  -AppId <CLIENT_ID> `
  -PolicyScopeGroupId gerencia@sotodelprior.com `
  -AccessRight RestrictAccess `
  -Description "Solo permite app de reservas enviar desde gerencia"
```

### Configurar en el sistema de reservas

Una vez tengas `TENANT_ID`, `CLIENT_ID` y `CLIENT_SECRET`:

```bash
cd apps/motor-reservas

# 1. Verificar credenciales (sin guardar)
node scripts/setup-mail.js test-graph TENANT_ID CLIENT_ID CLIENT_SECRET gerencia@sotodelprior.com

# 2. Enviar email de prueba
node scripts/setup-mail.js send-graph-test TENANT_ID CLIENT_ID CLIENT_SECRET gerencia@sotodelprior.com TU_EMAIL_PERSONAL

# 3. Guardar config para SOTO del PRIOR
node scripts/setup-mail.js save-graph-restaurant 47dc0a72-3379-46ab-bd5b-01a20c7ae58f TENANT_ID CLIENT_ID CLIENT_SECRET gerencia@sotodelprior.com info@sotodelprior.com
```

A partir de ahí, cualquier reserva creada disparará un email automático.

## IDs de los Restaurantes

| Restaurante | ID |
|-------------|------|
| SOROETA | `01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2` |
| MONTAGU | `edee3086-71d8-43d4-938d-f6baf643ace4` |
| SOTO del PRIOR | `47dc0a72-3379-46ab-bd5b-01a20c7ae58f` |

## Para Soroeta (Gmail u otro proveedor)

Si Soroeta usa Gmail o un servicio que sí soporta SMTP:

```bash
# Crear "App Password" en Google: https://myaccount.google.com/apppasswords
node scripts/setup-mail.js save-restaurant 01d97d9b-6ec3-4ac2-98cc-7d42872d2fc2 smtp.gmail.com 587 cuenta@soroeta.com APP_PASSWORD reservas@soroeta.com contacto@soroeta.com
```

## Variables de entorno globales (fallback)

Si prefieres configuración global en lugar de por restaurante, en `.env`:

```env
# Para Microsoft Graph (recomendado)
GRAPH_TENANT_ID=xxx-xxx-xxx-xxx
GRAPH_CLIENT_ID=xxx-xxx-xxx-xxx
GRAPH_CLIENT_SECRET=xxx
GRAPH_SENDER_EMAIL=gerencia@sotodelprior.com

# O para SMTP (si lo prefieres)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=gerencia@sotodelprior.com
SMTP_PASS=APP_PASSWORD
```

El sistema prioriza Graph si está configurado; si no, intenta SMTP.

## ¿Cómo funciona el flujo del email?

1. Cliente rellena widget de reserva en la web del restaurante
2. `POST /restaurant/public/reservation` crea reserva
3. `mailService.sendRestaurantNotification(booking, 'created')` se llama
4. **Mail Service prioriza Graph si está configurado** (resuelve credenciales del restaurante o globales)
5. Si Graph falla o no está configurado → fallback a SMTP
6. Email enviado al cliente con plantilla personalizada

## Plantillas de Email

Cada restaurante puede personalizar 7 plantillas:
- `created` - Nueva reserva recibida
- `confirmed` - Confirmación
- `cancelled` - Cancelación
- `modified` - Modificación
- `reminder` - Recordatorio
- `waitlist_join` - Añadido a lista de espera
- `waitlist_available` - Hueco disponible en lista de espera

Variables disponibles: `{{name}}`, `{{date}}`, `{{time}}`, `{{pax}}`, `{{restaurant_name}}`, `{{modify_link}}`, `{{cancel_link}}`, `{{confirm_link}}`.

Edita las plantillas en `/admin/restaurant/[id]/config`.

## Troubleshooting

### "AADSTS7000215: Invalid client secret"
Client Secret expirado o mal copiado. Genera uno nuevo en Azure.

### "Forbidden" o 403 al enviar
Falta admin consent. Vuelve a Azure → API permissions → "Grant admin consent".

### Email no llega pero el servidor dice OK
1. Revisa la carpeta de Spam del destinatario
2. Verifica que `senderEmail` tiene mailbox válido en el tenant
3. Si tienes Application Access Policy restrictiva, verifica que incluye al sender

### "User not found"
El `senderEmail` no existe en el tenant. Verifica que es un email válido (gerencia@sotodelprior.com, no un alias).

## Notas de Seguridad

- Las credenciales Graph se almacenan en `mailConfig.graph` por restaurante en la BBDD
- Mejora futura recomendada: cifrar `clientSecret` con KMS o variable de entorno
- Rotar Client Secret cada 12-24 meses
- Restringir scope con Application Access Policy si solo un buzón debe enviar
