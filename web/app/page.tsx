import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MusicListClient from '@/components/MusicListClient';
import { prisma } from '@/lib/db';

async function getSongs() {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        artist: true,
        album: true
      }
    });

    const artists = await prisma.artist.findMany();
    const albums = await prisma.album.findMany();
    const videos = await (prisma as any).video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        artist: true,
        song: true
      }
    });

    // Map to client types
    const validSongs = songs.map((s: any) => {
        let files: any = {};
        try {
            files = JSON.parse(s.files);
        } catch (e) {
            files = {};
        }

        return {
            id: s.id,
            title: s.title,
            artist: s.artistName || s.artist?.name || '未知歌手',
            album: s.albumName || s.album?.name || '-',
            files: files
        };
    }).filter((s: any) => s.files && s.files.audio);

    const formattedArtists = artists.map((a: any) => ({
        id: a.id,
        name: a.name
    }));

    const formattedAlbums = albums.map((a: any) => ({
        id: a.id,
        name: a.name,
        cover: a.cover || undefined,
        artist: a.artistName || undefined
    }));

    return {
      songs: validSongs,
      artists: formattedArtists,
      albums: formattedAlbums,
      videos: (videos as any[]).map((v) => ({
        id: v.id,
        uuid: v.uuid,
        title: v.title,
        artistId: v.artistId,
        artistName: v.artistName || v.artist?.name || '',
        songId: v.songId,
        songTitle: v.song?.title || null,
        src: v.src,
        cover: v.cover,
        createdAt: v.createdAt?.toISOString ? v.createdAt.toISOString() : null
      }))
    };
  } catch (e) {
    console.error('Error fetching songs:', e);
    return { songs: [], artists: [], albums: [], videos: [] };
  }
}

export default async function Home() {
  const { songs, artists, albums, videos } = await getSongs();

  return (
    <div className="min-h-screen flex flex-col bg-background transition-colors duration-300">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <MusicListClient initialSongs={songs} initialVideos={videos} artists={artists} albums={albums} />
      </main>
      <Footer />
    </div>
  );
}
