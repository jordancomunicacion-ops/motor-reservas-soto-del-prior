const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = await prisma.widgetConfig.findMany({
    select: { restaurantId: true, customCss: true }
  });
  console.log("Configs:", JSON.stringify(configs, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
