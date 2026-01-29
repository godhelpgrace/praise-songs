import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/permission-check';
import { unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';

// Define project root explicitly
// In Next.js app/api routes, process.cwd() is usually the project root (web folder)
const STORAGE_ROOT = path.join(process.cwd(), '..', 'storage');

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const canDelete = await checkPermission(user.id, 'delete', null);
    if (!canDelete) return forbiddenResponse('You do not have permission to delete songs');

    const { ids } = await request.json();
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    // Find songs to be deleted to get file paths
    const songsToDelete = await prisma.song.findMany({
      where: {
        id: { in: ids }
      }
    });
    
    // Delete files for each song
    for (const song of songsToDelete) {
        if (song.files) {
            try {
                const files = JSON.parse(song.files);
                for (const key in files) {
                    // Skip metadata keys like 'category'
                    if (key === 'category') continue;

                    const value = files[key];
                    const pathsToDelete = Array.isArray(value) ? value : [value];
                    
                    for (const relativePath of pathsToDelete) {
                        if (relativePath && typeof relativePath === 'string') {
                            const fullPath = path.join(STORAGE_ROOT, relativePath.replace(/^\//, ''));
                            try {
                                await unlink(fullPath);
                            } catch (e) {
                                // Ignore if file not found
                                console.warn(`Failed to delete file ${fullPath}:`, e);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`Error parsing files for song ${song.id}:`, e);
            }
        }
    }

    for (const id of ids) {
      await prisma.$executeRaw`DELETE FROM "_PlaylistSongs" WHERE "B" = ${id}`;
    }

    // Delete songs from DB
    const deleteResult = await prisma.song.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({ success: true, count: deleteResult.count });
  } catch (error) {
    console.error('Batch delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
