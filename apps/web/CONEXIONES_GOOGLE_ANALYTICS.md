# Sistema de Conexiones - Google Analytics

## Descripción

El sistema de **Conexiones** permite guardar y gestionar credenciales de integraciones externas (Google Analytics, CRM, etc.) de forma centralizada en la BD, en lugar de usar variables de entorno.

## Flujo de Configuración

### 1. Obtener Google Analytics Credentials

#### Opción A: Google Analytics ID (Más Simple)
1. Ir a [Google Analytics](https://analytics.google.com)
2. Seleccionar tu propiedad "Soto del Prior"
3. Admin > Detalles de la propiedad
4. Copiar el **"ID de Medición"** (ej: `G-XXXXXXXXXX`)

#### Opción B: Google Analytics API (Más Avanzado)
Si necesitas datos de reporting desde backend:
1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear proyecto
3. Habilitar "Google Analytics Data API"
4. Crear cuenta de servicio
5. Descargar JSON con credenciales

### 2. Guardar Conexión en BD

**Vía API:**
```bash
curl -X POST http://localhost:3000/connections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "type": "GOOGLE_ANALYTICS",
    "name": "Soto del Prior - Google Analytics",
    "hotelId": "your-hotel-id",
    "credentials": {
      "propertyId": "G-XXXXXXXXXX",
      "apiKey": "optional-api-key"
    }
  }'
```

**Directo en BD (SQL):**
```sql
INSERT INTO "IntegrationConnection" (
  id, type, name, "hotelId", credentials, enabled, "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'GOOGLE_ANALYTICS',
  'Soto del Prior - Google Analytics',
  'your-hotel-id',
  '{"propertyId": "G-XXXXXXXXXX", "apiKey": null}'::jsonb,
  true,
  NOW(),
  NOW()
);
```

### 3. Usar en Frontend

El componente `GoogleAnalytics` busca automáticamente la conexión:

```typescript
// En GoogleAnalytics.tsx
const connection = await fetch(
  `/connections/GOOGLE_ANALYTICS?hotelId=${hotelId}`
);
const creds = connection.credentials;
const GA_ID = creds.propertyId; // G-XXXXXXXXXX
```

### 4. Probar Conexión

```bash
curl -X POST http://localhost:3000/connections/test/{connectionId} \
  -H "Authorization: Bearer admin-token"
```

Respuesta:
```json
{
  "success": true,
  "connection": {
    "id": "...",
    "isActive": true,
    "lastTestedAt": "2026-05-13T10:00:00Z"
  }
}
```

---

## Estructura de Credenciales por Tipo

### GOOGLE_ANALYTICS
```json
{
  "propertyId": "G-XXXXXXXXXX",
  "apiKey": null,
  "email": null
}
```

### CRM (Webhook)
```json
{
  "url": "https://your-crm.com/webhook",
  "token": "bearer-token",
  "sourceLabel": "Web Soto del Prior"
}
```

### MAIL (SMTP)
```json
{
  "host": "smtp-mail.outlook.com",
  "port": 587,
  "user": "noreply@sotodelprior.com",
  "pass": "encrypted-password"
}
```

### STRIPE
```json
{
  "apiKey": "sk_live_...",
  "publishableKey": "pk_live_...",
  "webhookSecret": "whsec_..."
}
```

---

## APIs Endpoints

### Guardar Conexión
```
POST /connections
Body: {
  type: string,
  name: string,
  hotelId?: string,
  restaurantId?: string,
  credentials: object
}
```

### Obtener Conexiones de Entity
```
GET /connections?hotelId=XXX
GET /connections?restaurantId=XXX
Response: [{ id, type, name, credentials, enabled, isActive, lastTestedAt, testError }]
```

### Obtener Conexión Específica
```
GET /connections/GOOGLE_ANALYTICS?hotelId=XXX
Response: { id, type, name, credentials, enabled, isActive, ... }
```

### Probar Conexión
```
POST /connections/test/{connectionId}
Response: { success: boolean, error?: string }
```

### Eliminar Conexión
```
DELETE /connections/{connectionId}
```

---

## Monitoreo en BD

### Ver todas las conexiones
```sql
SELECT id, type, name, "hotelId", "restaurantId", enabled, "isActive", 
       "lastTestedAt", "testError"
FROM "IntegrationConnection"
ORDER BY "updatedAt" DESC;
```

### Ver conexiones activas
```sql
SELECT * FROM "IntegrationConnection"
WHERE enabled = true AND "isActive" = true;
```

### Ver conexiones con errores
```sql
SELECT id, type, name, enabled, "isActive", "lastTestedAt", "testError"
FROM "IntegrationConnection"
WHERE "testError" IS NOT NULL
ORDER BY "lastTestedAt" DESC;
```

---

## Integración con GoogleAnalytics.tsx

El componente actualizado busca automáticamente la conexión:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function GoogleAnalytics() {
  const pathname = usePathname();
  const [gaId, setGaId] = useState<string>('');

  useEffect(() => {
    // Obtener GA ID desde conexión guardada
    const fetchGaConnection = async () => {
      try {
        const hotelId = 'default-hotel'; // O desde context/props
        const res = await fetch(
          `/api/connections/GOOGLE_ANALYTICS?hotelId=${hotelId}`
        );
        const connection = await res.json();
        if (connection?.credentials?.propertyId) {
          setGaId(connection.credentials.propertyId);
        }
      } catch (error) {
        console.warn('Failed to load GA connection:', error);
      }
    };

    fetchGaConnection();
  }, []);

  useEffect(() => {
    if (!gaId) return;

    // Cargar Google Analytics con ID de conexión
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId);
  }, [gaId]);

  return null;
}
```

---

## Migración desde .env.local

Si actualmente usas `NEXT_PUBLIC_GA_ID` en `.env.local`:

1. **Copiar el valor:**
   ```bash
   echo $NEXT_PUBLIC_GA_ID  # Ej: G-XXXXXXXXXX
   ```

2. **Crear conexión en BD:**
   ```bash
   curl -X POST http://localhost:3000/connections \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer admin-token" \
     -d '{
       "type": "GOOGLE_ANALYTICS",
       "name": "Soto del Prior - GA",
       "hotelId": "your-hotel-id",
       "credentials": {"propertyId": "G-XXXXXXXXXX"}
     }'
   ```

3. **Remover de .env.local:**
   ```bash
   # Comentar o eliminar:
   # NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

4. **El componente GoogleAnalytics ahora obtiene el ID desde BD**

---

## Ventajas

✅ **Seguridad** - Credenciales en BD, no en archivos  
✅ **Flexibilidad** - Múltiples conexiones por hotel/restaurante  
✅ **Monitoreo** - Saber cuándo se probó, si está activa, errores  
✅ **Centralizado** - Un lugar para todas las integraciones  
✅ **Sin redeploy** - Cambiar credenciales sin desplegar  

---

## Próximas Mejoras

1. 🔒 Encriptación de credenciales en BD
2. 📊 Dashboard de conexiones en admin
3. 🔄 Sincronización automática de datos desde GA
4. 📈 Reporting integrado con GA API
5. 🔐 Soporte para OAuth2 en lugar de API keys

---

## Troubleshooting

### "Connection not found"
```sql
-- Verificar que existe
SELECT * FROM "IntegrationConnection" 
WHERE "hotelId" = 'your-hotel-id';
```

### "Property ID is invalid"
- Verificar formato: debe ser `G-XXXXXXXXXX`
- Ir a Google Analytics > Configuración > Detalles de propiedad

### GA no carga en frontend
1. Verificar conexión está en BD
2. Verificar `hotelId` en query string
3. Revisar DevTools > Network > gtag/js
4. Verificar propertyId en tabla

