import { NextResponse } from 'next/server';
import { getAuthUser, checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/permission-check';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();

    if (!user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // Check if artist exists
    const artist = await prisma.artist.findUnique({ where: { id } });
    if (!artist) {
        return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    // Unlink songs
    await prisma.song.updateMany({
        where: { artistId: id },
        data: { artistId: null }
    });

    // Unlink albums
    await prisma.album.updateMany({
        where: { artistId: id },
        data: { artistId: null }
    });
    
    // Unlink videos
    await (prisma as any).video.updateMany({
        where: { artistId: id },
        data: { artistId: null }
    });

    // Delete artist
    await prisma.artist.delete({
        where: { id }
    });

    revalidatePath('/artist');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting artist:', e);
    return NextResponse.json({ error: 'Failed to delete artist' }, { status: 500 });
  }
}
