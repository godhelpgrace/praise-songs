import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MusicListClient from '@/components/MusicListClient';

// Define project root explicitly
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getSongs() {
  try {
    // Check if DB exists
    try {
      await fs.access(DB_PATH);
    } catch {
      console.error(`DB not found at ${DB_PATH}`);
      return { songs: [], artists: [] };
    }

    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    // Filter out songs that don't have an audio file
    const validSongs = db.songs.filter((song: any) => song.files && song.files.audio);

    // Aggregate albums from songs (implicit) and db.albums (explicit)
    const albumMap: Record<string, any> = {};
    
    // 1. From songs
    validSongs.forEach((song: any) => {
        if (song.album && song.album !== '-') {
            if (!albumMap[song.album]) {
                albumMap[song.album] = { id: song.album, name: song.album, artist: song.artist };
            }
            // If song has image, use it as potential cover
            if (song.files?.image && !albumMap[song.album].cover) {
                albumMap[song.album].cover = song.files.image;
            }
        }
    });

    // 2. From explicit albums (override/enrich)
    if (db.albums) {
        db.albums.forEach((a: any) => {
            if (albumMap[a.name]) {
                albumMap[a.name] = { ...albumMap[a.name], ...a, id: a.id };
            } else {
                albumMap[a.name] = a;
            }
        });
    }

    const allAlbums = Object.values(albumMap);

    return {
      songs: validSongs.reverse(),
      artists: db.artists || [],
      albums: allAlbums
    };
  } catch (e) {
    console.error('Error reading songs list:', e);
    return { songs: [], artists: [], albums: [] };
  }
}

export default async function Home() {
  const { songs, artists, albums } = await getSongs();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <MusicListClient initialSongs={songs} artists={artists} albums={albums} />
      </main>
      <Footer />
    </div>
  );
}
