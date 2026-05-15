# Migraciones Prisma

El repo NO tiene `prisma/migrations/` versionadas todavía. La BD se ha
mantenido con `prisma db push` (sin histórico). Esto significa que cualquier
cambio de schema aplicado en producción no está auditado.

## Crear la baseline (una sola vez, por entorno)

Hay que hacerlo en cada entorno cuya BD esté ya en uso (local, staging, prod).

### 1. Genera la primera migración SIN aplicarla

En local, contra una BD limpia:

```bash
DATABASE_URL=postgresql://reservas_user:PASS@localhost:5442/reservas \
  npx prisma migrate dev \
  --schema=apps/motor-reservas/prisma/schema.prisma \
  --name baseline \
  --create-only
```

Esto crea `apps/motor-reservas/prisma/migrations/<timestamp>_baseline/migration.sql`.
Cómmitalo.

Repite para `apps/web/prisma/schema.prisma` (los schemas son idénticos —
mantenlos sincronizados).

### 2. Marca la migración como aplicada en cada entorno con BD existente

En cada servidor donde la BD ya tiene las tablas (sin pasar por la migración):

```bash
DATABASE_URL=$DATABASE_URL \
  npx prisma migrate resolve \
  --schema=apps/motor-reservas/prisma/schema.prisma \
  --applied <timestamp>_baseline
```

Esto inserta el registro en `_prisma_migrations` sin tocar las tablas.

### 3. A partir de ahí

Cualquier cambio de schema:

```bash
npx prisma migrate dev \
  --schema=apps/motor-reservas/prisma/schema.prisma \
  --name <descripcion>
```

Y en deploy se aplican con:

```bash
npx prisma migrate deploy \
  --schema=apps/motor-reservas/prisma/schema.prisma
```

## Cambios de schema pendientes de aplicar

El commit que añade `onDelete` explícitos al schema cambia las foreign keys
existentes en BD. La primera vez que generes la baseline después de ese
commit, la migración resultante incluirá los `ALTER TABLE … DROP CONSTRAINT
… ADD CONSTRAINT … ON DELETE …`. Revísala y aplica con `migrate deploy`.
