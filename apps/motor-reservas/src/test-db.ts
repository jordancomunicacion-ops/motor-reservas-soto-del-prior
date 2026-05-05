import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('START');
  try {
    // @ts-ignore
    const res = await prisma.shift.findMany();
    console.log('RES:', res);
  } catch (err: any) {
    console.log('CAUGHT:', err.message);
  }
  console.log('END');
}
main();
