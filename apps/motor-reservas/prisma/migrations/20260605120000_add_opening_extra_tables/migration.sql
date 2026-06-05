-- Mesas extra ligadas a una apertura excepcional (RestaurantOpening).
-- Una mesa con openingId != NULL sólo existe/opera durante esa fecha; NULL = mesa del plano base.
ALTER TABLE "Table" ADD COLUMN "openingId" TEXT;

CREATE INDEX "Table_openingId_idx" ON "Table"("openingId");

ALTER TABLE "Table" ADD CONSTRAINT "Table_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "RestaurantOpening"("id") ON DELETE CASCADE ON UPDATE CASCADE;
