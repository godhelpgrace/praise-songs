import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const songs = await prisma.song.findMany({
    where: {
      title: {
        contains: '不变的爱'
      }
    }
  });

  console.log(JSON.stringify(songs, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
