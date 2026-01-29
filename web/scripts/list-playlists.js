
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listPlaylists() {
  const playlists = await prisma.playlist.findMany();
  console.log('All playlists:', playlists);
}

listPlaylists()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
