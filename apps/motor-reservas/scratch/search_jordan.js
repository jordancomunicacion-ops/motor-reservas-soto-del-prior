
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profile = await prisma.resBooking.findFirst({
    where: {
      OR: [
        { guestName: { contains: 'Jordán', mode: 'insensitive' } },
        { guestName: { contains: 'Jordan', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Jordán ResBooking:', JSON.stringify(profile, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
