# 🔍 Diagnóstico: Reservas de Soroeta No Se Sincronizan al CRM

## ❌ Problema Identificado

Las reservas en **Soroeta (res2)** no aparecen en el CRM, mientras que en Soto del Prior sí.

### Causa Raíz

El campo `restaurant.integrations.crm` de Soroeta está **vacío o no está configurado correctamente**.

El código en `crm-integration.service.ts` (línea 119) busca:
```typescript
const restIntegrations = (booking.restaurant.integrations as any) || {};
let crm = restIntegrations.crm;
```

Si `integrations.crm` está vacío, **la sincronización falla silenciosamente**.

---

## ✅ Solución

### Opción 1: Usar el endpoint (Recomendado)

Si tienes acceso a un admin token:

```bash
# Ver configuración actual de Soroeta
curl -X GET "http://localhost:4000/crm/config/restaurant/res2" \
  -H "Authorization: Bearer {admin_token}"

# Configurar el CRM (ejemplo con URL real)
curl -X POST "http://localhost:4000/crm/setup-restaurant/res2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "url": "https://tu-crm.sotodelprior.com/api/webhook",
    "token": "tu_api_key"
  }'

# Probar conexión
curl -X POST "http://localhost:4000/crm/test-connection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {admin_token}" \
  -d '{
    "url": "https://tu-crm.sotodelprior.com/api/webhook",
    "token": "tu_api_key"
  }'
```

### Opción 2: Script de Migración Automática

Ejecuta el script que copia la configuración de Soto del Prior a Soroeta:

```bash
# Primero, exporta DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/reservas"

# Luego ejecuta:
npx ts-node apps/motor-reservas/scripts/setup-soroeta-crm.ts
```

### Opción 3: Acceso Directo a BD (SQL)

```sql
UPDATE "Restaurant" 
SET integrations = jsonb_set(
  COALESCE(integrations, '{}'::jsonb),
  '{crm}',
  '{"enabled": true, "url": "https://tu-crm.sotodelprior.com/api/webhook", "token": "tu_api_key"}'::jsonb
)
WHERE id = 'res2';
```

---

## 🧪 Verificar la Configuración

Después de configurar, haz una prueba:

```bash
# 1. Crea una reserva de prueba en Soroeta
# 2. Revisa los logs del API para ver:
#    [CRM-DEBUG] Restaurant: SOROETA
#    [CRM-DEBUG] Syncing to CRM URL: https://...
# 3. Verifica que aparezca en tu CRM
```

---

## 📝 Cambios Realizados en el Código

- ✅ Creado `CrmConfigService` que trabaja con `integrations` JSON
- ✅ Mejorados los logs en `crm-integration.service.ts` para mostrar el nombre del restaurante
- ✅ Agregado endpoint GET/POST `/crm/config/restaurant/:id`
- ✅ Agregado endpoint `/crm/test-connection`

---

## 🔗 Configuración Correcta en BD

El campo `restaurant.integrations` debe verse así:

```json
{
  "crm": {
    "enabled": true,
    "url": "https://tu-crm.com/api/webhook",
    "token": "tu_api_key"
  }
}
```

Si está vacío o es `null`, la sincronización NO funcionará.
