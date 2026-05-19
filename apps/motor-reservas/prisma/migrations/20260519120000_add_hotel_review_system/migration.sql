-- Hotel: campos de configuración de reviews
ALTER TABLE "Hotel" ADD COLUMN "googleReviewUrl" TEXT;
ALTER TABLE "Hotel" ADD COLUMN "reviewMinScoreForGoogle" INTEGER NOT NULL DEFAULT 4;

-- Actualizar default de emailTemplates para incluir 'review'
ALTER TABLE "Hotel" ALTER COLUMN "emailTemplates" SET DEFAULT '{"created": "", "confirmed": "", "cancelled": "", "modified": "", "reminder": "", "waitlist_join": "", "waitlist_available": "", "review": ""}';

-- Booking: tracking del envío y token de valoración
ALTER TABLE "Booking" ADD COLUMN "reviewToken" TEXT;
ALTER TABLE "Booking" ADD COLUMN "reviewSent" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Booking_reviewToken_key" ON "Booking"("reviewToken");
CREATE INDEX "Booking_reviewSent_checkOutDate_idx" ON "Booking"("reviewSent", "checkOutDate");

-- Tabla nueva HotelReview
CREATE TABLE "HotelReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "serviceScore" INTEGER NOT NULL,
    "roomScore" INTEGER NOT NULL,
    "cleanlinessScore" INTEGER NOT NULL,
    "advice" TEXT,
    "redirectedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HotelReview_bookingId_key" ON "HotelReview"("bookingId");
CREATE INDEX "HotelReview_hotelId_createdAt_idx" ON "HotelReview"("hotelId", "createdAt");

ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HotelReview" ADD CONSTRAINT "HotelReview_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
