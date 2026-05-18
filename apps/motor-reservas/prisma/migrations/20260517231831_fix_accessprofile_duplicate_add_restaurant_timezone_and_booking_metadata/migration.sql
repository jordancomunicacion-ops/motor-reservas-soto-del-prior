-- AlterTable: Restaurant.timezone (IANA tz string, default Europe/Madrid)
ALTER TABLE "Restaurant" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid';

-- AlterTable: ResBooking.metadata (Json) — usada para guardar linkedTableIds del cluster
ALTER TABLE "ResBooking" ADD COLUMN "metadata" JSONB DEFAULT '{}';
