-- RestaurantOpening: excepciones de apertura puntual en restaurantes
CREATE TABLE "RestaurantOpening" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "shiftIds" TEXT NOT NULL,
    "customShifts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOpening_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RestaurantOpening_restaurantId_date_idx" ON "RestaurantOpening"("restaurantId", "date");

ALTER TABLE "RestaurantOpening" ADD CONSTRAINT "RestaurantOpening_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HotelOpening: excepciones de apertura puntual en hoteles (saltan stopSell/CTA/CTD)
CREATE TABLE "HotelOpening" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelOpening_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HotelOpening_hotelId_date_idx" ON "HotelOpening"("hotelId", "date");

ALTER TABLE "HotelOpening" ADD CONSTRAINT "HotelOpening_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
