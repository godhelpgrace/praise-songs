import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId') || undefined;
    const songId = searchParams.get('songId') || undefined;
    const q = (searchParams.get('q') || '').trim();

    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, limitParam)) : 50;

    const videos = await (prisma as any).video.findMany({
      where: {
        ...(artistId ? { artistId } : {}),
        ...(songId ? { songId } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { artistName: { contains: q } },
                { song: { title: { contains: q } } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        artist: true,
        song: true
      }
    });

    return NextResponse.json(
      (videos as any[]).map((v) => ({
        id: v.id,
        uuid: v.uuid,
        title: v.title,
        artistId: v.artistId,
        artistName: v.artistName || v.artist?.name || '',
        songId: v.songId,
        songTitle: v.song?.title || null,
        src: v.src,
        cover: v.cover,
        createdAt: v.createdAt.toISOString()
      }))
    );
  } catch (e) {
    console.error('Error fetching videos:', e);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
