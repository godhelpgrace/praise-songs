
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import ArtistClient from './ArtistClient';
import { prisma } from '@/lib/db';

async function getArtist(id: string) {
  try {
    const artist = await (prisma as any).artist.findUnique({
        where: { id },
        include: {
            songs: {
                orderBy: { createdAt: 'desc' }
            },
            albums: true,
            videos: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
    
    if (!artist) return null;

    // Process songs
    const processedSongs = artist.songs.map((s: any) => {
        let files: any = {};
        try { files = JSON.parse(s.files); } catch {}
        return {
            id: s.id,
            title: s.title,
            artist: s.artistName || artist.name,
            album: s.albumName || '-',
            files
        };
    });

    const processedVideos = artist.videos.map((v: any) => ({
        id: v.id,
        uuid: v.uuid,
        title: v.title,
        artistId: v.artistId,
        artistName: v.artistName || artist.name,
        songId: v.songId,
        src: v.src,
        cover: v.cover || null,
        createdAt: v.createdAt?.toISOString ? v.createdAt.toISOString() : null
    }));

    // Extract implicit albums from songs to supplement explicit albums
    const albumsMap = new Map();
    
    // 1. Add explicit albums
    artist.albums.forEach((a: any) => {
        albumsMap.set(a.name, {
            name: a.name,
            artist: artist.name,
            cover: a.cover || '',
            date: a.releaseDate || '2023'
        });
    });

    // 2. Add implicit albums from songs
    processedSongs.forEach((s: any) => {
        if (s.album && s.album !== '-' && !albumsMap.has(s.album)) {
            albumsMap.set(s.album, {
                name: s.album,
                artist: artist.name,
                cover: s.files.image || '',
                date: '2023'
            });
        }
    });

    const albums = Array.from(albumsMap.values());

    const songsCount = processedSongs.filter((s: any) => s.files && s.files.audio).length;
    const sheetCount = processedSongs.filter((s: any) => s.files && (s.files.sheet || (s.files.sheets && s.files.sheets.length > 0))).length;
    const legacyVideoCount = processedSongs.filter((s: any) => s.files && s.files.video).length;
    const videoCount = processedVideos.length + legacyVideoCount;

    return {
        id: artist.id,
        name: artist.name,
        songs: processedSongs,
        videos: processedVideos,
        albums,
        stats: {
            songsCount,
            sheetCount,
            videoCount
        }
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await getArtist(id);

  if (!artist) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-20 text-center text-muted-foreground">
                音乐人不存在
            </main>
            <Footer />
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
         <ArtistClient artist={artist} songs={artist.songs} albums={artist.albums} videos={(artist as any).videos || []} />
      </main>
      <Footer />
    </div>
  );
}
