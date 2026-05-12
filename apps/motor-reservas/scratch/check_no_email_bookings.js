
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.resBooking.count({
    where: {
      guestEmail: null
    }
  });
  console.log('Bookings without email:', count);

  const bookings = await prisma.resBooking.findMany({
    where: { guestEmail: null },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(bookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
