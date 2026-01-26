import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlaylistDetailClient from './client';
import { notFound } from 'next/navigation';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getData(id: string) {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const playlist = db.playlists?.find((p: any) => p.id === id);
    const allSongs = db.songs || [];
    
    if (playlist && playlist.songs) {
        // Hydrate songs if they are IDs
        playlist.songs = playlist.songs.map((item: any) => {
            if (typeof item === 'string') {
                return allSongs.find((s: any) => s.id === item);
            }
            // If it's already an object (legacy data), try to find updated version by ID
            if (item && item.id) {
                const updated = allSongs.find((s: any) => s.id === item.id);
                return updated || item;
            }
            return item;
        }).filter(Boolean); // Remove nulls if song not found
    }

    return { playlist, allSongs };
  } catch (e) {
    return { playlist: null, allSongs: [] };
  }
}

export const dynamic = 'force-dynamic';

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { playlist, allSongs } = await getData(id);

  if (!playlist) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <a href="/" className="hover:text-orange-500">首页</a> &gt; <a href="/playlist" className="hover:text-orange-500">歌单</a> &gt; <span className="text-gray-800">{playlist.title}</span>
        </div>
        
        <PlaylistDetailClient playlist={playlist} allSongs={allSongs} />
      </main>
      <Footer />
    </div>
  );
}