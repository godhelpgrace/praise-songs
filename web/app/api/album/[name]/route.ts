import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';

const STORAGE_ROOT = path.join(process.cwd(), '..', 'storage');

// Helper to cleanup parent directories if empty
async function cleanupParentDirectories(fullPath: string) {
    try {
        const dir = path.dirname(fullPath);
        if (dir === STORAGE_ROOT) return; 

        const files = await fs.readdir(dir);
        if (files.length === 0) {
            await fs.rmdir(dir);
            if (dir.startsWith(STORAGE_ROOT) && dir !== STORAGE_ROOT) {
                 await cleanupParentDirectories(dir);
            }
        }
    } catch (e) {
        // ignore
    }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    
    // Find album
    // Note: We search by name because the route is /album/[name]
    // But ideally we should use ID.
    // Assuming name is unique per artist, but here we just find first matching album name?
    // Or maybe the route param is actually ID?
    // The previous code decoded it and searched by name.
    
    // Let's find albums with this name
    const albums = await prisma.album.findMany({
        where: { name: decodedName },
        include: { songs: true }
    });

    if (albums.length === 0) {
        // Maybe it's already deleted
        return NextResponse.json({ success: true, count: 0 });
    }

    let updatedCount = 0;

    for (const album of albums) {
        // Find songs belonging to this album
        const songsToDelete = await prisma.song.findMany({
            where: { albumId: album.id }
        });

        // Delete files for these songs
        for (const song of songsToDelete) {
            if (song.files) {
                try {
                    const files = JSON.parse(song.files);
                    for (const key in files) {
                        if (key === 'category') continue;
                        const value = files[key];
                        const pathsToDelete = Array.isArray(value) ? value : [value];
                        
                        for (const relativePath of pathsToDelete) {
                            if (relativePath && typeof relativePath === 'string') {
                                const fullPath = path.join(STORAGE_ROOT, relativePath.replace(/^\//, ''));
                                try {
                                    await fs.unlink(fullPath);
                                    await cleanupParentDirectories(fullPath);
                                } catch {
                                    // ignore
                                }
                            }
                        }
                    }
                } catch {}
            }
        }

        // Delete songs
        await prisma.song.deleteMany({
            where: { albumId: album.id }
        });
        
        updatedCount += songsToDelete.length;

        // Delete album
        await prisma.album.delete({
            where: { id: album.id }
        });
        updatedCount++; // Count explicit album deletion
    }

    revalidatePath('/sheet');
    revalidatePath('/album');
    revalidatePath('/');

    return NextResponse.json({ success: true, count: updatedCount });
  } catch (e) {
    console.error('Error deleting album:', e);
    return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const canEdit = await checkPermission(user.id, 'edit', null);
    if (!canEdit) return forbiddenResponse('You do not have permission to edit albums');

    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const body = await request.json();
    const { newName } = body;

    if (!newName) {
        return NextResponse.json({ error: 'New name is required' }, { status: 400 });
    }

    // Update albums with this name
    const updateResult = await prisma.album.updateMany({
        where: { name: decodedName },
        data: { name: newName }
    });

    // Also update denormalized albumName in songs
    await prisma.song.updateMany({
        where: { albumName: decodedName },
        data: { albumName: newName }
    });

    return NextResponse.json({ success: true, count: updateResult.count });
  } catch (e) {
    console.error('Error updating album:', e);
    return NextResponse.json({ error: 'Failed to update album' }, { status: 500 });
  }
}
