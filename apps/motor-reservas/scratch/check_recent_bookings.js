
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recentBookings = await prisma.resBooking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      status: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(recentBookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
