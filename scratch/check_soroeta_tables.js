const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const restaurantId = 'res2';
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    include: {
      zones: {
        include: {
          tables: true
        }
      }
    }
  });

  if (!restaurant) {
    console.log('Restaurant not found');
    return;
  }

  console.log(`Restaurant: ${restaurant.name} (${restaurant.id})`);
  for (const zone of restaurant.zones) {
    console.log(`  Zone: ${zone.name} (${zone.id})`);
    for (const table of zone.tables) {
      console.log(`    Table: ${table.name} (${table.id}) - Capacity: ${table.capacity}, minPax: ${table.minPax}, maxPax: ${table.maxPax}, isActive: ${table.isActive}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
