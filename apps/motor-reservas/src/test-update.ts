import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const id = '6ebfc77a-2aab-4c3a-89bb-f6a468e3ee09';
  const data = { name: 'Soto del Prior (Updated)', currency: 'EUR', hotelId: 'none' };
  
  console.log('Testing updateRestaurant logic...');
  try {
    const { hotelId, ...rest } = data;
    
    const result = await prisma.$transaction(async (tx) => {
      console.log('Step 1: Update restaurant');
      const restaurant = await tx.restaurant.update({
        where: { id },
        data: rest
      });

      console.log('Step 2: Handle hotel link');
      if (hotelId === 'none' || hotelId === '') {
        await tx.hotel.updateMany({
          where: { restaurantId: id },
          data: { restaurantId: null }
        });
      }
      
      return restaurant;
    });
    console.log('Update successful:', result.id);
  } catch (e: any) {
    console.error('Update FAILED:', e.message);
    if (e.code) console.error('Prisma Error Code:', e.code);
  } finally {
    await prisma.$disconnect();
  }
}

main();
