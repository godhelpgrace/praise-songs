import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AlbumDetailClient from './client';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getAlbum(name: string) {
  try {
    const decodedName = decodeURIComponent(name);
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const songs = db.songs.filter((song: any) => 
        song.files && 
        song.files.audio && 
        song.album && song.album.trim().toLowerCase() === decodedName.trim().toLowerCase()
    );
    
    // Find explicit album cover
    const albumEntry = db.albums?.find((a: any) => a.name.trim().toLowerCase() === decodedName.trim().toLowerCase());
    const explicitCover = albumEntry?.cover;

    // If no songs and no album entry, return null
    if (songs.length === 0 && !albumEntry) return null;

    const artistName = songs[0]?.artist || albumEntry?.artist || '未知歌手';
    
    // Get other albums by this artist
    const otherAlbumsMap = new Map();
    db.songs.forEach((s: any) => {
        if (s.artist === artistName && s.album && s.album.trim().toLowerCase() !== decodedName.trim().toLowerCase()) {
             if (!otherAlbumsMap.has(s.album)) {
                otherAlbumsMap.set(s.album, {
                    name: s.album,
                    cover: s.files.image,
                    date: '2023'
                });
            }
        }
    });
    const otherAlbums = Array.from(otherAlbumsMap.values());

    return {
        name: decodedName,
        artist: artistName,
        cover: explicitCover || songs.find((s: any) => s.files.image)?.files.image,
        songs: songs.reverse(),
        otherAlbums
    };
  } catch (e) {
    return null;
  }
}

export default async function AlbumDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const album = await getAlbum(name);

  if (!album) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-20 text-center text-gray-500">
                专辑不存在
            </main>
            <Footer />
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AlbumDetailClient album={album} />
      <Footer />
    </div>
  );
}
