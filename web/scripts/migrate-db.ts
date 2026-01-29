import { prisma } from '../lib/db';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// const prisma = new PrismaClient(); // Removed local instance

async function main() {
  const dbPath = path.resolve(__dirname, '../../db.json');
  console.log(`Reading db.json from ${dbPath}`);
  
  // Seed Admin
  console.log('Seeding Admin...');
  const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
          data: {
              username: 'admin',
              password: hashedPassword,
              email: 'admin@example.com',
              role: 'admin'
          }
      });
      console.log('Admin seeded.');
  }

  if (!fs.existsSync(dbPath)) {
      console.error('db.json not found!');
      return;
  }

  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const db = JSON.parse(rawData);

  console.log('Migrating Artists...');
  if (db.artists) {
      for (const a of db.artists) {
        await prisma.artist.upsert({
          where: { id: a.id },
          update: { name: a.name, index: a.index },
          create: { id: a.id, name: a.name, index: a.index }
        });
      }
  }

  console.log('Migrating Albums...');
  if (db.albums) {
      for (const a of db.albums) {
        // Ensure artist exists if referenced
        if (a.artist_id) {
             const artistExists = await prisma.artist.findUnique({ where: { id: a.artist_id } });
             if (!artistExists) {
                 console.warn(`Album ${a.name} references missing artist ${a.artist_id}, creating placeholder.`);
                 await prisma.artist.create({ data: { id: a.artist_id, name: a.artist || 'Unknown' } });
             }
        }

        await prisma.album.upsert({
          where: { id: a.id },
          update: {
            name: a.name,
            artistId: a.artist_id,
            releaseDate: a.release_date,
            description: a.description,
            genre: a.genre,
            language: a.language,
            cover: a.cover,
            type: a.type || '全长专辑'
          },
          create: {
            id: a.id,
            uuid: a.uuid,
            name: a.name,
            artistId: a.artist_id,
            releaseDate: a.release_date,
            description: a.description,
            genre: a.genre,
            language: a.language,
            cover: a.cover,
            type: a.type || '全长专辑'
          }
        });
      }
  }

  console.log('Migrating Songs...');
  if (db.songs) {
      for (const s of db.songs) {
        const files = JSON.stringify(s.files || {});
        
        // Check relations
        if (s.artist_id) {
             const artistExists = await prisma.artist.findUnique({ where: { id: s.artist_id } });
             if (!artistExists) {
                 await prisma.artist.create({ data: { id: s.artist_id, name: s.artist || 'Unknown' } });
             }
        }
        if (s.album_id) {
             const albumExists = await prisma.album.findUnique({ where: { id: s.album_id } });
             if (!albumExists) {
                 // Create partial album? Or just skip linking?
                 // Better to skip linking or create placeholder.
                 // Let's create placeholder if we can, but we need name.
                 console.warn(`Song ${s.title} references missing album ${s.album_id}`);
                 // If we strictly follow FK, we must create it.
                 // Let's try to find it in db.albums to see if it's just order issue? 
                 // We already migrated albums, so it's truly missing if not found.
                 // For now, let's allow it to fail or just set to null if strictly required?
                 // But artistId and albumId are nullable in schema, so we can skip if not found?
                 // Wait, I defined them as optional `String?`. So if I pass a value, it MUST exist.
                 // So if it doesn't exist, I should set it to null or create it.
                 // Let's set to null if missing to avoid crash.
             }
        }

        // We need to be careful: if we pass a non-null id that doesn't exist, foreign key constraint fails.
        // So we should verify existence or catch error.
        // Simple way: check existence.
        let validArtistId = s.artist_id;
        if (s.artist_id && !(await prisma.artist.findUnique({ where: { id: s.artist_id } }))) {
            validArtistId = null; 
        }

        let validAlbumId = s.album_id;
        if (s.album_id && !(await prisma.album.findUnique({ where: { id: s.album_id } }))) {
            validAlbumId = null;
        }

        await prisma.song.upsert({
          where: { id: s.id },
          update: {
            title: s.title,
            artistId: validArtistId,
            albumId: validAlbumId,
            files: files,
            artistName: s.artist, // Store denormalized names too
            albumName: s.album
          },
          create: {
            id: s.id,
            uuid: s.uuid,
            title: s.title,
            artistId: validArtistId,
            albumId: validAlbumId,
            files: files,
            artistName: s.artist,
            albumName: s.album
          }
        });
      }
  }

  console.log('Migrating Playlists...');
  if (db.playlists) {
      for (const p of db.playlists) {
        await prisma.playlist.upsert({
          where: { id: p.id },
          update: {
            title: p.title,
            cover: p.cover,
          },
          create: {
            id: p.id,
            title: p.title,
            cover: p.cover,
          }
        });

        if (p.songs && Array.isArray(p.songs)) {
            const validSongIds = [];
            for (const sid of p.songs) {
                if (await prisma.song.findUnique({ where: { id: sid } })) {
                    validSongIds.push({ id: sid });
                }
            }
            
            if (validSongIds.length > 0) {
                await prisma.playlist.update({
                    where: { id: p.id },
                    data: {
                        songs: {
                            set: validSongIds
                        }
                    }
                });
            }
        }
      }
  }
  
  console.log('Migration complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
