import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const restaurants = await prisma.restaurant.findMany({
    include: { _count: { select: { zones: true, bookings: true } } }
  });
  console.log('RESTAURANTS:', JSON.stringify(restaurants, null, 2));
}
main();
