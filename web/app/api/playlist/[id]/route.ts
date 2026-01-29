import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: { 
        songs: true,
        creator: {
            select: { id: true, username: true, role: true }
        }
    }
  });

  if (!playlist) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isOwner = user && user.id === playlist.creatorId;
  const isAdmin = user && user.role === 'admin';
  const isPublic = playlist.status === 'public';

  if (!isPublic && !isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(playlist);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, cover, tags, songs, status } = body;

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = user.id === playlist.creatorId;
  const isAdmin = user.role === 'admin';

  const updateData: any = {};

  // Status update logic
  if (status) {
      if (status === 'pending') {
          // User submitting for review
          if (!isOwner) return NextResponse.json({ error: 'Only owner can submit for review' }, { status: 403 });
          updateData.status = 'pending';
      } else if (status === 'public') {
          // Approve
          if (!isAdmin) return NextResponse.json({ error: 'Only admin can approve playlists' }, { status: 403 });
          updateData.status = 'public';
      } else if (status === 'private') {
          // Reject or Revert
          if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          updateData.status = 'private';
      }
  }

  // Content update logic
  if (title || description !== undefined || cover || tags !== undefined || songs) {
      if (!isOwner && !isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (cover) updateData.cover = cover;
      if (tags !== undefined) updateData.tags = tags;

      if (songs) {
          const songIds = songs.map((s: any) => typeof s === 'string' ? s : s.id);
          updateData.songs = {
              set: songIds.map((sid: string) => ({ id: sid }))
          };
      }
  }

  if (Object.keys(updateData).length === 0) {
      return NextResponse.json(playlist);
  }

  try {
      const updated = await prisma.playlist.update({
          where: { id },
          data: updateData,
          include: { songs: true }
      });
      return NextResponse.json(updated);
  } catch (e: any) {
      console.error('Error updating playlist:', e);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const playlist = await prisma.playlist.findUnique({ where: { id } });
  if (!playlist) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isOwner = user.id === playlist.creatorId;
  // Admin can delete? User said "Only delete own" as default. 
  // But usually admin should be able to delete spam.
  // Let's allow admin for now, or stick to user rule strictly?
  // "admin要可以为用户授权... 默认设置：... 只能删除自己创建的歌单"
  // This likely refers to the user permission configuration.
  // As a system safeguard, Admin role usually implies full access.
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
      await prisma.playlist.delete({ where: { id } });
      return NextResponse.json({ success: true });
  } catch (e) {
      console.error('Error deleting playlist:', e);
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
