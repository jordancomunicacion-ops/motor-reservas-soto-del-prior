const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://reservas_user:reservas_pass@127.0.0.1:5442/reservas?schema=public"
    }
  }
});

async function main() {
  console.log("Listing all restaurants in RESERVAS DB...");
  try {
    const restaurants = await prisma.restaurant.findMany();
    console.log(`Found ${restaurants.length} restaurants:`);
    restaurants.forEach(r => {
      console.log(`- ID: ${r.id}, Name: ${r.name}`);
    });
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
