
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Actualizando emails de contacto para SOTO del PRIOR...');
  
  const email = 'info@sotodelprior.com';
  
  await prisma.hotel.updateMany({
    where: { name: { contains: 'SOTO del PRIOR', mode: 'insensitive' } },
    data: { contactEmail: email }
  });
  
  await prisma.restaurant.updateMany({
    where: { name: { contains: 'SOTO del PRIOR', mode: 'insensitive' } },
    data: { contactEmail: email }
  });
  
  console.log('✅ Emails actualizados correctamente.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
