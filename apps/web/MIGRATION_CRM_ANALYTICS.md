# Migración: Configuración CRM y Google Analytics

## Resumen de Cambios

Se han realizado mejoras significativas en:
1. ✅ Configuración CRM - Tabla dedicada `CrmIntegration`
2. ✅ Tracking de visitas web - Captura de referrer, userAgent, duración
3. ✅ Google Analytics - Instalación y configuración completa
4. ✅ Endpoints de tracking mejorados

## Pasos a Ejecutar

### 1. Crear Migración de Prisma

```bash
npx prisma migrate dev --name add_crm_integration_table
```

Esto creará la tabla `CrmIntegration` con los siguientes campos:
- `id` (UUID)
- `hotelId` (Único, opcional)
- `restaurantId` (Único, opcional)
- `enabled` (Boolean, default: false)
- `url` (String - webhook URL)
- `token` (String, opcional - token de autenticación)
- `sourceLabel` (String - nombre de la fuente)
- `trackingId` (String, opcional)
- `campaignSource`, `campaignMedium`, `campaignName` (Strings opcionales)
- `lastSync`, `syncCount`, `failureCount`, `lastError` (Campos de monitoreo)

### 2. Instalar Dependencias del Web

```bash
cd apps/web
npm install
```

Nuevas dependencias:
- `gtag.js` - Cliente de Google Analytics
- `@google-analytics/data` - API de Google Analytics (para reportes)

### 3. Configurar Variables de Entorno

Crear archivo `.env.local` en `apps/web/`:

```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001
```

**Obtener tu Google Analytics ID:**
1. Ir a [Google Analytics](https://analytics.google.com)
2. Seleccionar tu propiedad (crear si no existe)
3. Ve a Configuración > Admin > Detalles de la propiedad
4. Copiar el "ID de Medición" (comienza con G-)

### 4. Migración de Datos (Opcional)

Si tienes integraciones CRM anteriores guardadas en el campo JSON `integrations`, puedes migrarlas:

```typescript
// Script de migración (ejecutar en la terminal)
const hotels = await prisma.hotel.findMany({
  where: {
    integrations: {
      path: ['crm']
    }
  }
});

for (const hotel of hotels) {
  const crmConfig = (hotel.integrations as any)?.crm;
  if (crmConfig?.enabled && crmConfig?.url) {
    await prisma.crmIntegration.create({
      data: {
        hotelId: hotel.id,
        enabled: crmConfig.enabled,
        url: crmConfig.url,
        token: crmConfig.token,
        sourceLabel: 'Migrado desde JSON'
      }
    });
  }
}
```

## APIs Nuevas/Modificadas

### Endpoints CRM

#### Configurar CRM para Hotel
```
POST /crm/setup-hotel/:hotelId
Body: {
  url: "https://your-crm.com/webhook",
  token?: "optional-bearer-token",
  sourceLabel?: "Web Soto del Prior",
  trackingId?: "ga_property_id",
  campaignSource?: "web",
  campaignMedium?: "organic",
  campaignName?: "hotel_reservations"
}
```

#### Configurar CRM para Restaurante
```
POST /crm/setup-restaurant/:restaurantId
Body: { ... mismo que arriba ... }
```

#### Obtener Configuración CRM
```
GET /crm/config/hotel/:hotelId
GET /crm/config/restaurant/:restaurantId
```

#### Probar Conexión CRM
```
POST /crm/test-connection
Body: {
  url: "https://your-crm.com/webhook",
  token?: "optional-bearer-token"
}
Response: {
  success: boolean,
  status: number,
  message: string
}
```

#### Track Visit (Mejorado)
```
POST /crm/track
Body: {
  sessionId: string,
  url: string,
  visitorId?: string,
  email?: string,
  referrer?: string,     // NUEVO
  userAgent?: string,    // NUEVO
  duration?: number      // NUEVO
}
```

#### Track Event
```
POST /crm/event
Body: {
  sessionId: string,
  visitorId?: string,
  event: string,
  data?: any,
  timestamp?: string
}
```

## Uso en Frontend

### 1. Google Analytics (Automático)

El tracking está habilitado automáticamente una vez que:
1. Configures `NEXT_PUBLIC_GA_ID` en `.env.local`
2. Recargues la aplicación

Todas las navegaciones de página se registran automáticamente.

### 2. Events Personalizados

```typescript
import { event, trackBooking, trackFormSubmission } from '@/lib/ga';

// Event genérico
event('search', { search_term: 'hotel' });

// Booking (conversión)
trackBooking({
  bookingId: '123',
  value: 150.00,
  currency: 'EUR',
  type: 'hotel'
});

// Form submission
trackFormSubmission('booking_form', { status: 'success' });
```

### 3. CRM Tracker (Cliente TypeScript)

```typescript
import { crmTracker } from '@/lib/crm-tracker';

// Ya se inicializa automáticamente
// Identify user
crmTracker?.identify({
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe'
});

// Track custom event
crmTracker?.trackEvent('booking_started', { value: 100 });

// Get IDs
const sessionId = crmTracker?.getSessionId();
const visitorId = crmTracker?.getVisitorId();
```

## Monitoreo

### Verificar Sync Status en BD

```sql
SELECT id, hotelId, restaurantId, enabled, sourceLabel, 
       lastSync, syncCount, failureCount, lastError
FROM "CrmIntegration"
ORDER BY "updatedAt" DESC;
```

### Logs de Debug

El sistema registra:
- `[CRM-DEBUG]` - Sincronización de reservas
- `[CRM-EVENT]` - Eventos de tracking
- Errores de conexión y timeout

## Troubleshooting

### Google Analytics no muestra datos

1. **Verificar GA_ID configurado:**
   ```bash
   echo $NEXT_PUBLIC_GA_ID  # Debe mostrar G-XXXXXXXXXX
   ```

2. **Verificar script en DevTools:**
   - Abre Chrome DevTools
   - Network > Scripts
   - Busca `gtag/js?id=G-`
   - Debe tener status 200

3. **Verificar eventos en GA:**
   - Google Analytics > Tiempo real
   - Debe mostrarse tráfico en vivo

### CRM no sincroniza

1. **Verificar configuración:**
   ```sql
   SELECT * FROM "CrmIntegration" 
   WHERE "hotelId" = 'your-hotel-id' OR "restaurantId" = 'your-rest-id';
   ```

2. **Probar conexión:**
   ```bash
   curl -X POST http://localhost:3000/crm/test-connection \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://your-crm.com/webhook",
       "token": "optional-bearer"
     }'
   ```

3. **Revisar logs:**
   - Backend logs para `[CRM-DEBUG]` messages
   - Verificar `lastError` en BD

## Notas Importantes

- ⚠️ Google Analytics tiene retraso de ~24 horas para reportes completos
- ⚠️ El campo `integrations` JSON aún existe para compatibilidad pero usar `CrmIntegration` para nuevas configs
- ⚠️ Los `sourceLabel` deben ser nombres descriptivos para identificar fuentes en Google Analytics
- ⚠️ `trackingId` debe corresponder con un property ID de Google Analytics para correlación correcta

## Próximos Pasos

1. Migrar configuraciones existentes de `integrations.crm` a `CrmIntegration`
2. Configurar UTM parameters en los links/widgets
3. Crear dashboards en Google Analytics para:
   - Reservas por fuente (sourceLabel)
   - Tasa de conversión por canal
   - Lifetime value por visitante
4. Integrar eventos de GA con el CRM para segmentación
