const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hotels = await prisma.hotel.findMany();
  const restaurants = await prisma.restaurant.findMany();
  
  console.log('--- HOTELS ---');
  console.log(JSON.stringify(hotels, null, 2));
  
  console.log('--- RESTAURANTS ---');
  console.log(JSON.stringify(restaurants, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
