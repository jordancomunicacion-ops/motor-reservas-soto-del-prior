# Revisión y Mejoras: Configuración CRM y Google Analytics

**Fecha:** Mayo 13, 2026  
**Estado:** ✅ COMPLETADO

## 📊 SITUACIÓN INICIAL

### Problemas Identificados

#### 1. **Google Analytics - NO ESTABA IMPLEMENTADO**
- ❌ Sin librerías en package.json
- ❌ Sin script de GA en el layout
- ❌ Sin variables de entorno configuradas
- ❌ Sin tracking de eventos

#### 2. **Conexiones CRM - INCOMPLETAS**
- ⚠️ Funcionan pero sin:
  - Identificación clara de fuentes (sourceLabel)
  - Correlación con Google Analytics (trackingId)
  - Tracking de parámetros UTM
  - Monitoreo de syncs (last sync, success/failure count)

#### 3. **Datos Faltantes en WebVisit**
- ❌ `referrer` - nunca se capturaba
- ❌ `userAgent` - nunca se capturaba
- ❌ `duration` - siempre 0
- ❌ No se actualizaban estadísticas de perfil

#### 4. **Endpoints de Tracking - LIMITADOS**
- Solo `/crm/identify` y `/crm/track` públicos
- Sin eventos personalizados
- Sin configuración de integraciones desde UI

---

## ✅ CAMBIOS REALIZADOS

### 1️⃣ **Actualización del Schema de Prisma**

**Nuevo Modelo: `CrmIntegration`**

```prisma
model CrmIntegration {
  id                String   @id @default(uuid())
  
  // Target
  hotelId           String?  @unique
  restaurantId      String?  @unique
  
  // Connection
  enabled           Boolean  @default(false)
  url               String
  token             String?
  
  // Naming & Tracking
  sourceLabel       String   @default("Direct")
  trackingId        String?
  campaignSource    String?
  campaignMedium    String?
  campaignName      String?
  
  // Monitoring
  lastSync          DateTime?
  syncCount         Int      @default(0)
  failureCount      Int      @default(0)
  lastError         String?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**Cambios en modelos existentes:**
- `Hotel` + relación `crmIntegration`
- `Restaurant` + relación `crmIntegration`

### 2️⃣ **Servicios Backend Mejorados**

#### `CrmConfigService` (NUEVO)
Gestiona configuración de integraciones CRM:
```typescript
- setupHotelCrm()          // Crear/actualizar config
- setupRestaurantCrm()
- getCrmConfig()           // Obtener config
- disableCrm()            // Desactivar
- testConnection()        // Probar conexión antes de guardar
```

#### `CrmIntegrationService` (ACTUALIZADO)
- Usa nueva tabla `CrmIntegration` en lugar de JSON
- Envía `sourceLabel` y `tracking` info al CRM
- Registra `lastSync`, `syncCount`, `failureCount`
- Captura errores en `lastError`

#### `CrmService` (ACTUALIZADO)
- Captura `referrer`, `userAgent`, `duration` en `trackVisit()`
- Actualiza `visitCount` y `lastInteraction` en `CustomerProfile`

### 3️⃣ **Endpoints CRM Expandidos**

```
POST  /crm/setup-hotel/:hotelId           ← NUEVO
POST  /crm/setup-restaurant/:restaurantId ← NUEVO
GET   /crm/config/hotel/:hotelId          ← NUEVO
GET   /crm/config/restaurant/:restaurantId ← NUEVO
POST  /crm/test-connection                ← NUEVO
POST  /crm/disable-hotel/:hotelId         ← NUEVO
POST  /crm/disable-restaurant/:restaurantId ← NUEVO

POST  /crm/identify                       (mejorado)
POST  /crm/track                          (mejorado - captura más datos)
POST  /crm/event                          ← NUEVO (eventos personalizados)
GET   /crm/profiles                       (existente)
```

### 4️⃣ **Google Analytics - Implementación Completa**

#### Dependencias Agregadas
```json
"@google-analytics/data": "^1.5.2"
"gtag.js": "^0.12.0"
```

#### Archivos Creados

**`apps/web/lib/ga.ts`** - Utilidades de GA
```typescript
- pageview()           // Track page views
- event()             // Track custom events
- trackConversion()   // Track conversiones
- trackFormSubmission()
- trackBooking()      // Track bookings (key conversion)
- trackSearch()
- trackUserProperties()
```

**`apps/web/components/GoogleAnalytics.tsx`** - Componente Cliente
- Carga script de Google Analytics
- Inicializa gtag globalmente
- Track automático de page views

**`apps/web/.env.example`** - Template de variables
```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5️⃣ **CRM Tracker para Frontend (NUEVO)**

**`apps/motor-reservas/src/modules/crm/crm-tracker.ts`**

Cliente JavaScript para tracking:
```typescript
const crmTracker = new CrmTracker()

// Automático al inicializar:
- Genera sessionId (session storage)
- Genera visitorId (local storage)
- Track page view
- Captura referrer, userAgent
- Mide duración de página

// APIs:
- identify(email, firstName, lastName)
- trackEvent(eventName, data)
- getSessionId()
- getVisitorId()
```

### 6️⃣ **Documentación de Migración**

**`apps/web/MIGRATION_CRM_ANALYTICS.md`** - Guía completa:
- Pasos de migración de BD
- Variables de entorno
- Uso de APIs
- Ejemplos de frontend
- Troubleshooting

---

## 📋 CAMBIOS POR ARCHIVO

### Backend (apps/motor-reservas)

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `src/modules/crm/crm-integration.service.ts` | Actualizado para usar tabla `CrmIntegration` | Actualizado |
| `src/modules/crm/crm.service.ts` | Mejorado tracking con referrer/userAgent/duration | Actualizado |
| `src/modules/crm/crm-config.service.ts` | NUEVO - Gestión de configuración CRM | Creado |
| `src/modules/crm/crm-tracker.ts` | NUEVO - Cliente TypeScript para tracking | Creado |
| `src/modules/crm/crm.controller.ts` | Agregar endpoints de config y test | Actualizado |
| `src/modules/crm/crm.module.ts` | Registrar CrmConfigService | Actualizado |
| `prisma/schema.prisma` | Tabla `CrmIntegration` + relaciones | Actualizado |

### Frontend (apps/web)

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `package.json` | Agregar gtag.js + @google-analytics/data | Actualizado |
| `lib/ga.ts` | NUEVO - Utilidades de Google Analytics | Creado |
| `components/GoogleAnalytics.tsx` | NUEVO - Componente GA | Creado |
| `app/layout.tsx` | Incluir componente GoogleAnalytics | Actualizado |
| `.env.example` | NUEVO - Template de variables | Creado |

### Documentación

| Archivo | Contenido |
|---------|-----------|
| `MIGRATION_CRM_ANALYTICS.md` | Guía de migración y uso |
| `ANALISIS_Y_CAMBIOS_CRM_ANALYTICS.md` | Este archivo |

---

## 🎯 CÓMO USAR

### 1. Migrar Base de Datos

```bash
cd apps/web
npx prisma migrate dev --name add_crm_integration_table
```

### 2. Configurar Variables de Entorno

```bash
# apps/web/.env.local
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX  # Tu Google Analytics ID
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Instalar Dependencias

```bash
npm install  # en apps/web
```

### 4. Configurar CRM para Hotel/Restaurante

**Opción A: Vía API**
```bash
curl -X POST http://localhost:3000/crm/setup-hotel/hotel-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin-token" \
  -d '{
    "url": "https://your-crm.com/webhook",
    "token": "bearer-token",
    "sourceLabel": "Web Soto del Prior",
    "trackingId": "G-XXXXXXXXXX",
    "campaignSource": "web",
    "campaignMedium": "organic",
    "campaignName": "hotel_reservations"
  }'
```

**Opción B: BD Directa**
```sql
INSERT INTO "CrmIntegration" (
  id, "hotelId", enabled, url, token, "sourceLabel", "trackingId", 
  "campaignSource", "campaignMedium", "campaignName", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'your-hotel-id',
  true,
  'https://your-crm.com/webhook',
  'optional-token',
  'Web Soto del Prior',
  'G-XXXXXXXXXX',
  'web',
  'organic',
  'hotel_reservations',
  NOW(),
  NOW()
);
```

### 5. Usar Google Analytics en Frontend

```typescript
// Automático - ya carga en el layout
// Todas las páginas se tracked automáticamente

// Track custom events
import { event, trackBooking } from '@/lib/ga';

// En componente de reserva
const handleBooking = async () => {
  const booking = await makeBooking();
  
  // Track conversión
  trackBooking({
    bookingId: booking.id,
    value: booking.totalPrice,
    currency: 'EUR',
    type: 'hotel'
  });
};
```

---

## 📊 BENEFICIOS

### Google Analytics
✅ Tracking automático de páginas  
✅ Eventos de conversión (bookings)  
✅ Origen del tráfico (referrer)  
✅ Comportamiento del usuario (duración)  
✅ Identificación de usuarios  

### CRM Integration
✅ Nombre de fuente clara (Web, App, Widget Google, etc.)  
✅ Sincronización monitoreada (last sync, count, errors)  
✅ Correlación con GA (trackingId)  
✅ Prueba de conexión antes de guardar  
✅ Configuración por hotel/restaurante  

### Datos Web
✅ Captura de referrer (de dónde vinieron)  
✅ Captura de userAgent (navegador/dispositivo)  
✅ Duración de visita  
✅ Estadísticas de perfil actualizadas  

---

## ⚠️ NOTAS IMPORTANTES

1. **Google Analytics tiene retraso de ~24 horas** para reportes completos
2. **NEXT_PUBLIC_GA_ID debe ser configurado** o GA no funcionará
3. **La tabla JSON `integrations` aún existe** para compatibilidad pero usar `CrmIntegration` es lo recomendado
4. **Los nombres de `sourceLabel`** deben ser descriptivos para reportes claros en GA
5. **Se pueden tener múltiples integraciones CRM** (una por hotel, otra por restaurante)

---

## 🔄 PRÓXIMOS PASOS SUGERIDOS

1. ✅ Ejecutar migración de BD
2. ✅ Configurar NEXT_PUBLIC_GA_ID
3. ✅ Configurar CRM para cada hotel/restaurante
4. 🔄 Verificar datos en Google Analytics (Tiempo real)
5. 🔄 Crear dashboards en GA para análisis
6. 🔄 Correlacionar datos de GA con CRM para segmentación
7. 🔄 Implementar UTM parameters en links/widgets

---

## 📞 TROUBLESHOOTING RÁPIDO

### GA no muestra datos
```bash
# 1. Verificar variable
echo $NEXT_PUBLIC_GA_ID

# 2. Verificar en DevTools > Network
# Buscar: gtag/js?id=G-
# Status: 200

# 3. Verificar en GA > Tiempo real
```

### CRM no sincroniza
```sql
-- Verificar config
SELECT * FROM "CrmIntegration" WHERE "hotelId" = '...';

-- Verificar últimos syncs
SELECT id, "hotelId", enabled, "lastSync", "syncCount", "failureCount", "lastError"
FROM "CrmIntegration"
ORDER BY "lastSync" DESC;
```

---

**✨ Implementación completada satisfactoriamente**
