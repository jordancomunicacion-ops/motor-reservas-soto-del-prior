
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: '554b687c-1f3e-4613-b964-1be7df039333' },
    include: { area: true }
  });
  console.log('Table Info:', JSON.stringify(table, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
