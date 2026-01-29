
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPlaylistCover() {
  const playlist = await prisma.playlist.findFirst({
    where: { title: 'test1' }
  });

  if (playlist) {
    console.log('Updating playlist:', playlist.title);
    await prisma.playlist.update({
      where: { id: playlist.id },
      data: { cover: '/images/default_cover.png' }
    });
    console.log('Updated cover to /images/default_cover.png');
  } else {
    console.log('Playlist test1 not found');
  }
}

fixPlaylistCover()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
