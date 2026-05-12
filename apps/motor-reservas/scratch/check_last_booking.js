
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lastBooking = await prisma.resBooking.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(lastBooking, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
