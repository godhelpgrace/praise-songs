
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPlaylists() {
  const playlists = await prisma.playlist.findMany({
    where: {
      cover: {
        contains: 'default_cover.jpg'
      }
    }
  });
  console.log('Playlists with wrong cover:', playlists);
}

checkPlaylists()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
