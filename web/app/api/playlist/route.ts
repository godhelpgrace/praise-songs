import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? verifyToken(token) : null;
    const userId = user?.id;
    const isAdmin = user?.role === 'admin';

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const adminView = searchParams.get('admin_view') === 'true';

    let where: any = {};

    if (isAdmin && adminView) {
        // Admin mode: See all (or filtered by status)
        if (statusFilter) {
            where.status = statusFilter;
        }
    } else {
        // Regular User mode
        where.OR = [
            { status: 'public' }
        ];
        if (userId) {
            where.OR.push({ creatorId: userId });
        }
        
        // If status filter provided, it acts as AND
        if (statusFilter) {
            where.status = statusFilter;
        }
    }

    const playlists = await (prisma.playlist as any).findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
        songs: true,
        creator: {
          select: { id: true, username: true, role: true }
        }
      }
    });
    return NextResponse.json(playlists);
  } catch (e) {
    console.error(e);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, songs, cover, description, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const songIds = songs ? songs.map((s: any) => typeof s === 'string' ? s : s.id) : [];

    // Default status: 'public' if admin, 'private' if user
    const status = user.role === 'admin' ? 'public' : 'private';

    const newPlaylist = await prisma.playlist.create({
      data: {
        title,
        description: description || '',
        tags: tags || '',
        cover: cover || '/images/default_cover.png',
        creatorId: user.id,
        status,
        songs: {
          connect: songIds.map((id: string) => ({ id }))
        }
      },
      include: {
        songs: true,
        creator: {
            select: { id: true, username: true }
        }
      }
    });

    return NextResponse.json(newPlaylist);
  } catch (e: any) {
    console.error('Error saving playlist:', e);
    return NextResponse.json({ 
      error: 'Failed to save playlist', 
      details: e.message || String(e) 
    }, { status: 500 });
  }
}