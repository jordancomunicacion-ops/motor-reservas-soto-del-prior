
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando base de datos a fondo...');

  // Orden de borrado para evitar errores de claves foráneas
  const tables = [
    'EventBooking', 'Event', 'BookingRoom', 'Booking', 'DailyPrice', 'Restriction', 
    'RatePlan', 'Season', 'Room', 'RoomType', 'HotelWaitlist', 'RestaurantWaitlist',
    'TableHold', 'ResBooking', 'Table', 'Zone', 'Shift', 'User', 'Hotel', 'Restaurant'
  ];

  for (const table of tables) {
    try {
      await prisma[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany();
    } catch (e) {
      console.log(`Saltando ${table}: ${e.message}`);
    }
  }

  console.log('Creando registros con IDs fijos...');

  // 1. Restaurantes
  await prisma.restaurant.create({
    data: { id: 'soto-rest', name: 'SOTO del PRIOR', contactEmail: 'info@sotodelprior.com' }
  });
  await prisma.restaurant.create({ data: { id: 'res1', name: 'MONTAGU' } });
  await prisma.restaurant.create({ data: { id: 'res2', name: 'SOROETA' } });

  // 2. Hotel
  await prisma.hotel.create({
    data: {
      id: 'soto-hotel',
      name: 'SOTO del PRIOR',
      restaurantId: 'soto-rest',
      contactEmail: 'info@sotodelprior.com',
      timezone: 'Europe/Madrid'
    }
  });

  console.log('✅ IDs restaurados: res1, res2, soto-rest, soto-hotel');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
