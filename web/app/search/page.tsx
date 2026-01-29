import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchClient from './SearchClient';
import { Suspense } from 'react';
import { prisma } from '@/lib/db';

async function getSongs() {
  try {
    const songs = await prisma.song.findMany({
      include: {
        artist: true,
        album: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return songs.map((s: any) => {
      let files = {};
      try {
        files = JSON.parse(s.files);
      } catch {}

      return {
        id: s.id,
        title: s.title,
        artist: s.artistName || s.artist?.name || '未知歌手',
        album: s.albumName || s.album?.name || '-',
        files
      };
    });
  } catch (e) {
    console.error('Error reading songs list:', e);
    return [];
  }
}

export default async function SearchPage() {
  const songs = await getSongs();

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-slate-500 dark:text-slate-400 text-center py-20">Loading...</div>}>
          <SearchClient songs={songs} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
