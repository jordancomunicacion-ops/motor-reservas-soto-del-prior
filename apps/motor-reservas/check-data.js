const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const hotels = await prisma.hotel.findMany();
        const restaurants = await prisma.restaurant.findMany();

        console.log("Hotels:", hotels.map(h => h.name));
        console.log("Restaurants:", restaurants.map(r => r.name));

        // Setup SOTO del PRIOR Hotel
        const sotoHotel = hotels.find(h => h.name.includes("SOTO"));
        if (sotoHotel) {
            console.log("Setting up SOTO hotel rooms...");
            const rt = await prisma.roomType.create({
                data: {
                    hotelId: sotoHotel.id,
                    name: "Habitación Estándar",
                    basePrice: 120,
                    capacity: 2,
                    rooms: {
                        create: [
                            { name: "Hab 1" },
                            { name: "Hab 2" },
                            { name: "Hab 3" },
                            { name: "Hab 4" }
                        ]
                    }
                }
            });
        }

        // Setup SOTO del PRIOR Restaurant
        const sotoRest = restaurants.find(r => r.name.includes("SOTO"));
        if (sotoRest) {
            console.log("Setting up SOTO restaurant tables...");
            const zone = await prisma.zone.create({
                data: {
                    restaurantId: sotoRest.id,
                    name: "Salón",
                    tables: {
                        create: [
                            { name: "M1", capacity: 4, x: 50, y: 50 },
                            { name: "M2", capacity: 4, x: 150, y: 50 },
                            { name: "M3", capacity: 2, x: 250, y: 50 },
                            { name: "M4", capacity: 6, x: 350, y: 50 }
                        ]
                    }
                }
            });
        }

        // Setup MONTAGU Restaurant
        const montagu = restaurants.find(r => r.name.includes("MONTAGU"));
        if (montagu) {
            console.log("Setting up MONTAGU restaurant tables...");
            const zone = await prisma.zone.create({
                data: {
                    restaurantId: montagu.id,
                    name: "Principal",
                    tables: {
                        create: [
                            { name: "MT1", capacity: 2, x: 100, y: 100 },
                            { name: "MT2", capacity: 4, x: 200, y: 100 }
                        ]
                    }
                }
            });
        }

        console.log("Infrastructure setup done. Now generating bookings...");

        // Refetch to get IDs
        const allHotels = await prisma.hotel.findMany({ include: { roomTypes: { include: { rooms: true } } } });
        const allRests = await prisma.restaurant.findMany({ include: { zones: { include: { tables: true } } } });

        const today = new Date();

        for (const h of allHotels) {
            const rooms = h.roomTypes.flatMap(rt => rt.rooms);
            if (rooms.length === 0) continue;
            for (let i = 0; i < 8; i++) {
                const room = rooms[Math.floor(Math.random() * rooms.length)];
                const start = new Date(today);
                start.setDate(today.getDate() + Math.floor(Math.random() * 5) - 1);
                const end = new Date(start);
                end.setDate(start.getDate() + 2);

                await prisma.booking.create({
                    data: {
                        hotelId: h.id,
                        referenceCode: `HB-${Math.random().toString(36).substring(7).toUpperCase()}`,
                        guestName: ["Carlos Soto", "Ana Garcia", "Juan Perez", "Maria Lopez", "Luis Martinez"][Math.floor(Math.random() * 5)],
                        checkInDate: start,
                        checkOutDate: end,
                        nights: 2,
                        totalPrice: 240,
                        status: "CONFIRMED",
                        bookingRooms: {
                            create: { roomId: room.id, priceSnapshot: 120, date: start }
                        }
                    }
                });
            }
        }

        for (const r of allRests) {
            const tables = r.zones.flatMap(z => z.tables);
            if (tables.length === 0) continue;
            for (let i = 0; i < 15; i++) {
                const table = tables[Math.floor(Math.random() * tables.length)];
                const date = new Date(today);
                date.setHours(13 + (Math.random() > 0.5 ? 0 : 7), 0, 0, 0); // Lunch or Dinner

                await prisma.resBooking.create({
                    data: {
                        restaurantId: r.id,
                        tableId: table.id,
                        guestName: ["Roberto", "Lucia", "Fernando", "Elena", "Pablo"][Math.floor(Math.random() * 5)],
                        pax: 2 + Math.floor(Math.random() * 3),
                        date: date,
                        status: "CONFIRMED"
                    }
                });
            }
        }

        console.log("All content generated successfully.");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
