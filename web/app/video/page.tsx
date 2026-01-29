import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VideoClient from './VideoClient';
import { prisma } from '@/lib/db';

async function getVideos() {
  const videos = await (prisma as any).video.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      artist: true,
      song: true
    }
  });

  return (videos as any[]).map((v) => ({
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
  }));
}

export default async function VideoPage() {
  const videos = await getVideos();
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-white">视频</h1>
        <VideoClient initialVideos={videos as any} />
      </main>
      <Footer />
    </div>
  );
}
