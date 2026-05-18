-- Restaurant: campos de configuración de reviews
ALTER TABLE "Restaurant" ADD COLUMN "googleReviewUrl" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN "reviewMinScoreForGoogle" INTEGER NOT NULL DEFAULT 4;

-- Actualizar default de emailTemplates para incluir 'review'
ALTER TABLE "Restaurant" ALTER COLUMN "emailTemplates" SET DEFAULT '{"created": "", "confirmed": "", "cancelled": "", "modified": "", "reminder": "", "waitlist_join": "", "waitlist_available": "", "review": ""}';

-- ResBooking: tracking del envío y token de valoración
ALTER TABLE "ResBooking" ADD COLUMN "reviewToken" TEXT;
ALTER TABLE "ResBooking" ADD COLUMN "reviewSent" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "ResBooking_reviewToken_key" ON "ResBooking"("reviewToken");
CREATE INDEX "ResBooking_reviewSent_date_idx" ON "ResBooking"("reviewSent", "date");

-- Tabla nueva ResReview
CREATE TABLE "ResReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "serviceScore" INTEGER NOT NULL,
    "ambianceScore" INTEGER NOT NULL,
    "foodScore" INTEGER NOT NULL,
    "advice" TEXT,
    "redirectedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResReview_bookingId_key" ON "ResReview"("bookingId");
CREATE INDEX "ResReview_restaurantId_createdAt_idx" ON "ResReview"("restaurantId", "createdAt");

ALTER TABLE "ResReview" ADD CONSTRAINT "ResReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ResBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResReview" ADD CONSTRAINT "ResReview_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
