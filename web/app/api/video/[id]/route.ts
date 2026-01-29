import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { unlink, rmdir, readdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), '..', 'storage');

// Helper to cleanup parent directories if empty
async function cleanupParentDirectories(fullPath: string) {
    try {
        const dir = path.dirname(fullPath);
        if (dir === STORAGE_ROOT) return; // Don't delete root

        const files = await readdir(dir);
        if (files.length === 0) {
            await rmdir(dir);
            // Recursively check parent
            if (dir.startsWith(STORAGE_ROOT) && dir !== STORAGE_ROOT) {
                 await cleanupParentDirectories(dir);
            }
        }
    } catch (e) {
        // Ignore errors
    }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const canDelete = await checkPermission(user.id, 'delete', null);
    if (!canDelete) return forbiddenResponse('You do not have permission to delete videos');

    const { id } = await params;
    
    // Find video
    const video = await (prisma as any).video.findUnique({
      where: { id }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Delete files
    const pathsToDelete: string[] = [];
    if (video.src && video.src.startsWith('/')) {
        pathsToDelete.push(video.src);
    }
    if (video.cover && video.cover.startsWith('/')) {
        pathsToDelete.push(video.cover);
    }

    for (const relativePath of pathsToDelete) {
        if (relativePath && typeof relativePath === 'string') {
            // relativePath e.g. /videos/uuid/file.mp4
            const fullPath = path.join(STORAGE_ROOT, relativePath.replace(/^\//, ''));
            try {
                await unlink(fullPath);
                await cleanupParentDirectories(fullPath);
            } catch {
                // ignore
            }
        }
    }

    // Delete database record
    await (prisma as any).video.delete({
        where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting video:', e);
    return NextResponse.json({ error: 'Failed to delete video' }, { status: 500 });
  }
}
