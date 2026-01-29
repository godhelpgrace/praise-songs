import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlaylistClient from './PlaylistClient';
import { prisma } from '@/lib/db';

async function getData() {
  try {
    const playlists = await prisma.playlist.findMany({
      include: {
        songs: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const songs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const formattedPlaylists = playlists.map((p: any) => ({
        ...p,
        songs: p.songs.map((s: any) => {
            let files = {};
            try { files = JSON.parse(s.files); } catch {}
            return { ...s, files };
        }),
        tags: p.tags ? p.tags.split(',') : []
    }));

    const formattedSongs = songs.map((s: any) => {
        let files = {};
        try { files = JSON.parse(s.files); } catch {}
        return {
            id: s.id,
            title: s.title,
            artist: s.artistName || '未知歌手',
            files
        };
    });

    return {
      playlists: formattedPlaylists,
      songs: formattedSongs
    };
  } catch (e) {
    console.error(e);
    return { playlists: [], songs: [] };
  }
}

export const dynamic = 'force-dynamic';

export default async function PlaylistPage() {
  const { playlists, songs } = await getData();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <PlaylistClient initialPlaylists={playlists} allSongs={songs} />
      </main>
      <Footer />
    </div>
  );
}