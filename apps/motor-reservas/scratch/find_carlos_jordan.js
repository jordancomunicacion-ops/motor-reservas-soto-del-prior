
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const booking = await prisma.resBooking.findFirst({
    where: {
      guestName: {
        contains: 'Carlos Jordán'
      }
    }
  });
  console.log(JSON.stringify(booking, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
