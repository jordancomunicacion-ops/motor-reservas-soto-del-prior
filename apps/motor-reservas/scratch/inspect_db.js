
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      integrations: true
    }
  });
  console.log('Restaurants:', JSON.stringify(restaurants, null, 2));

  const lastBookings = await prisma.resBooking.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      guestName: true,
      status: true,
      restaurantId: true,
      tags: true
    }
  });
  console.log('Last Bookings:', JSON.stringify(lastBookings, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
