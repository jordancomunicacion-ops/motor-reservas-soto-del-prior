-- Reservas de grupos grandes pendientes de autorización manual del restaurante.
-- ADD VALUE IF NOT EXISTS es idempotente: aplicable tanto vía `migrate deploy`
-- como sobre una BD ya actualizada con `db push`.
ALTER TYPE "ResBookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

-- Configuración del umbral de grupo grande en el restaurante (local).
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "largeGroupApprovalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "largeGroupThreshold" INTEGER NOT NULL DEFAULT 10;
