const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to create a test playlist...');
    const playlist = await prisma.playlist.create({
      data: {
        title: 'Test Playlist ' + Date.now(),
        description: 'This is a test description',
        tags: 'test,debug',
        cover: '/images/default_cover.png'
      }
    });
    console.log('Successfully created playlist:', playlist);
  } catch (e) {
    console.error('Error creating playlist:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();