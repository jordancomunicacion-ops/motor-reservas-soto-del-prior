
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lastBookings = await prisma.resBooking.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      guestName: true,
      status: true,
      createdAt: true
    }
  });
  console.log('Last 20 Restaurant Bookings:', JSON.stringify(lastBookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
