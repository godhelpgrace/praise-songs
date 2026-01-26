
import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import ArtistClient from './ArtistClient';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getArtist(id: string) {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const artist = db.artists.find((a: any) => a.id === id);
    
    if (!artist) return null;

    // Find songs by this artist
    const songs = db.songs.filter((song: any) => 
        song.files && 
        song.files.audio && 
        song.artist === artist.name
    );

    // Extract albums from songs
    const albumsMap = new Map();
    songs.forEach((s: any) => {
        if (s.album && !albumsMap.has(s.album) && s.album !== '-') {
            albumsMap.set(s.album, {
                name: s.album,
                cover: s.files.image,
                date: '2023' // Placeholder
            });
        }
    });
    
    // Also check db.albums for any albums by this artist (if we had artistId there)
    // For now, rely on song aggregation + explicit album covers if any
    // ...

    const albums = Array.from(albumsMap.values());

    return {
        ...artist,
        songs: songs.reverse(),
        albums
    };
  } catch (e) {
    return null;
  }
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await getArtist(id);

  if (!artist) {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-20 text-center text-gray-500">
                音乐人不存在
            </main>
            <Footer />
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* Breadcrumb / Back Link */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
            <Link href="/" className="hover:text-blue-600">赞美吧</Link>
            <span>&gt;</span>
            <Link href="/artist" className="hover:text-blue-600">音乐人</Link>
            <span>&gt;</span>
            <span className="text-gray-800">{artist.name}</span>
            <span>&gt;</span>
            <span>主页</span>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-8">
         <ArtistClient artist={artist} songs={artist.songs} albums={artist.albums} />
      </main>
      <Footer />
    </div>
  );
}
