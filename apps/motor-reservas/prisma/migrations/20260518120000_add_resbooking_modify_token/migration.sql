-- AlterTable
ALTER TABLE "ResBooking" ADD COLUMN "modifyToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ResBooking_modifyToken_key" ON "ResBooking"("modifyToken");
