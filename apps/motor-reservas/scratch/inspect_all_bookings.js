
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lastResBookings = await prisma.resBooking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, guestName: true, status: true, createdAt: true }
  });
  console.log('Last Restaurant Bookings:', JSON.stringify(lastResBookings, null, 2));

  const lastHotelBookings = await prisma.booking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, guestName: true, status: true, createdAt: true }
  });
  console.log('Last Hotel Bookings:', JSON.stringify(lastHotelBookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
