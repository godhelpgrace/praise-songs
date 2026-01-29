import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlaylistDetailClient from './client';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

async function getData(id: string) {
  try {
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        songs: true
      }
    });

    const allSongs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' }
    });

    if (!playlist) return { playlist: null, allSongs: [] };

    // Format playlist songs
    const formattedPlaylist = {
        ...playlist,
        created_at: playlist.createdAt.toISOString(),
        cover: playlist.cover ?? undefined,
        description: playlist.description ?? undefined,
        songs: playlist.songs.map((s: any) => {
            let files = {};
            try { files = JSON.parse(s.files); } catch {}
            return {
                id: s.id,
                title: s.title,
                artist: s.artistName || '未知歌手',
                album: s.albumName || '-',
                files
            };
        }),
        tags: playlist.tags ? playlist.tags.split(',') : []
    };

    // Format all songs
    const formattedAllSongs = allSongs.map((s: any) => {
        let files = {};
        try { files = JSON.parse(s.files); } catch {}
        return {
            id: s.id,
            title: s.title,
            artist: s.artistName || '未知歌手',
            album: s.albumName || '-',
            files
        };
    });

    return { playlist: formattedPlaylist, allSongs: formattedAllSongs };
  } catch (e) {
    console.error(e);
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6 flex items-center gap-2">
          <a href="/" className="hover:text-primary transition-colors">首页</a> &gt; <a href="/playlist" className="hover:text-primary transition-colors">歌单</a> &gt; <span className="text-foreground">{playlist.title}</span>
        </div>
        
        <PlaylistDetailClient playlist={playlist} allSongs={allSongs} />
      </main>
      <Footer />
    </div>
  );
}
