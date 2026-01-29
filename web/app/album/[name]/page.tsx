import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AlbumDetailClient from './client';
import { prisma } from '@/lib/db';

async function getAlbum(name: string) {
  try {
    const decodedName = decodeURIComponent(name);
    
    // 1. Try to find explicit album
    const albumEntry = await prisma.album.findFirst({
        where: { name: decodedName },
        include: {
            songs: true
        }
    });

    let songs: any[] = [];
    let cover = '';
    let artistName = '未知歌手';
    let albumName = decodedName;

    if (albumEntry) {
        songs = albumEntry.songs;
        cover = albumEntry.cover || '';
        artistName = albumEntry.artistName || '未知歌手';
    } else {
        // 2. Fallback: find songs with this album name
        songs = await prisma.song.findMany({
            where: { albumName: decodedName }
        });

        if (songs.length === 0) return null;
        
        // Infer details from first song
        const firstSong = songs[0];
        // Parse files for cover
        let files: any = {};
        try { files = JSON.parse(firstSong.files); } catch {}
        
        cover = files.image || '';
        artistName = firstSong.artistName || '未知歌手';
    }

    // Process songs to match client expectation
    const processedSongs = songs.map((s: any) => {
        let files: any = {};
        try { files = JSON.parse(s.files); } catch {}
        return {
            ...s,
            files
        };
    }).reverse();

    if (!cover && processedSongs.length > 0) {
        cover = processedSongs.find((s: any) => s.files.image)?.files.image || '';
    }

    // Get other albums
    const otherAlbumsData = await prisma.album.findMany({
        where: {
            artistName: artistName,
            name: { not: decodedName }
        }
    });

    const otherAlbums = otherAlbumsData.map((a: any) => ({
        name: a.name,
        cover: a.cover,
        date: a.releaseDate || '2023'
    }));

    // Also consider orphan albums from songs if we want to be thorough? 
    // Probably overkill for now.

    // Calculate songs count (audio only)
    const audioSongs = processedSongs.filter((s: any) => s.files && s.files.audio);
    const songsCount = audioSongs.length;

    return {
        name: decodedName,
        artist: artistName,
        cover: cover,
        songs: audioSongs,
        songsCount,
        otherAlbums
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default async function AlbumDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const album = await getAlbum(name);

  if (!album) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8 text-center pt-20">
                <h1 className="text-2xl font-bold text-foreground mb-4">未找到专辑</h1>
                <p className="text-muted-foreground">抱歉，您访问的专辑不存在。</p>
            </main>
            <Footer />
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <AlbumDetailClient album={album} />
      <Footer />
    </div>
  );
}
