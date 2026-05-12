
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allCarlos = await prisma.resBooking.findMany({
    where: {
      guestName: { contains: 'Carlos', mode: 'insensitive' }
    }
  });
  console.log('All Carlos Bookings:', JSON.stringify(allCarlos, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
