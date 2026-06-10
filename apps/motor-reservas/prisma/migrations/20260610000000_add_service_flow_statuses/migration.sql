-- Añade las fases del flujo de servicio en sala al enum ResBookingStatus.
-- ADD VALUE IF NOT EXISTS es idempotente: aplicable tanto vía `migrate deploy`
-- como sobre una BD ya actualizada con `db push`.
ALTER TYPE "ResBookingStatus" ADD VALUE IF NOT EXISTS 'BAR_ARRIVAL';
ALTER TYPE "ResBookingStatus" ADD VALUE IF NOT EXISTS 'DESSERT';
ALTER TYPE "ResBookingStatus" ADD VALUE IF NOT EXISTS 'BILL_REQUESTED';
ALTER TYPE "ResBookingStatus" ADD VALUE IF NOT EXISTS 'CLEANING';
ALTER TYPE "ResBookingStatus" ADD VALUE IF NOT EXISTS 'TO_REVIEW';
