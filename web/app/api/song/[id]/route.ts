import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/permission-check';
import { unlink, rmdir, readdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import pinyin from 'tiny-pinyin';
import { Prisma } from '@prisma/client';

// Define project root explicitly
const STORAGE_ROOT = path.join(process.cwd(), '..', 'storage');

// Helper to cleanup parent directories if empty
async function cleanupParentDirectories(fullPath: string) {
    try {
        const dir = path.dirname(fullPath);
        if (dir === STORAGE_ROOT) return; // Don't delete root

        const files = await readdir(dir);
        if (files.length === 0) {
            await rmdir(dir);
            // Recursively check parent
            // But we might want to stop at some point (e.g. storage root)
            // For safety, let's just do one level up or verify it's inside storage
            if (dir.startsWith(STORAGE_ROOT) && dir !== STORAGE_ROOT) {
                 await cleanupParentDirectories(dir); // Recurse
            }
        }
    } catch (e) {
        // Ignore errors (e.g. dir not empty, not exists)
    }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const canDelete = await checkPermission(user.id, 'delete', null);
    if (!canDelete) return forbiddenResponse('You do not have permission to delete songs');

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sheetIndexStr = searchParams.get('sheetIndex');
    const sheetIndex = sheetIndexStr ? parseInt(sheetIndexStr) : -1;
    
    // Find song to get files
    const song = await prisma.song.findUnique({
      where: { id }
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    // Check if we are deleting a specific sheet
    if (sheetIndex >= 0 && song.files) {
        try {
            const files = JSON.parse(song.files);
            
            // Check if sheets array exists and index is valid
            if (files.sheets && Array.isArray(files.sheets) && sheetIndex < files.sheets.length) {
                const pathToDelete = files.sheets[sheetIndex];
                
                // Delete file from disk
                if (pathToDelete && typeof pathToDelete === 'string') {
                    const fullPath = path.join(STORAGE_ROOT, pathToDelete.replace(/^\//, ''));
                    try {
                        await unlink(fullPath);
                        await cleanupParentDirectories(fullPath);
                    } catch {
                        // Ignore if file not found
                    }
                }
                
                // Remove from array
                files.sheets.splice(sheetIndex, 1);
                
                // If sheets is empty, and no audio, delete the whole song
                if (files.sheets.length === 0 && !files.audio) {
                     await prisma.$transaction([
                         prisma.$executeRaw`DELETE FROM "_PlaylistSongs" WHERE "B" = ${id}`,
                         prisma.song.delete({ where: { id } })
                     ]);
                     return NextResponse.json({ success: true, deleted: true });
                }
                
                // Sync 'sheet' property with the first item of 'sheets'
                if (files.sheets.length > 0) {
                    files.sheet = files.sheets[0];
                } else {
                    delete files.sheet;
                }
                
                // Update song
                await prisma.song.update({
                    where: { id },
                    data: { files: JSON.stringify(files) }
                });
                
                return NextResponse.json({ success: true, updated: true });
            }
        } catch (e) {
            console.error('Error parsing/modifying files:', e);
        }
    }

    // Delete files
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
                            await unlink(fullPath);
                            await cleanupParentDirectories(fullPath);
                        } catch {
                            // Ignore if file not found
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing files:', e);
        }
    }

    await prisma.$transaction([
      prisma.$executeRaw`DELETE FROM "_PlaylistSongs" WHERE "B" = ${id}`,
      prisma.song.delete({ where: { id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorObj = (typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}) as Record<
      string,
      unknown
    >;
    const code = typeof errorObj['code'] === 'string' ? errorObj['code'] : undefined;
    const message =
      typeof errorObj['message'] === 'string' ? errorObj['message'] : 'Internal Server Error';

    console.error('Delete song error details:', {
        message,
        code,
        meta: errorObj['meta']
    });
    if (code === 'P2025') {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return unauthorizedResponse();

    const canEdit = await checkPermission(user.id, 'edit', null);
    if (!canEdit) return forbiddenResponse('You do not have permission to edit songs');

    const { id } = await params;
    const body = await request.json();
    
    const song = await prisma.song.findUnique({
      where: { id }
    });

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const updateData: Prisma.SongUncheckedUpdateInput = {};
    
    if (body.title) updateData.title = body.title;

    if (body.category) {
        try {
            const files = JSON.parse(song.files);
            files.category = body.category;
            updateData.files = JSON.stringify(files);
        } catch (e) {
            // If files is not valid JSON, we can't update category easily or reset it
        }
    }

    // Handle Artist update
    if (body.artist && body.artist !== song.artistName) {
        // Find or create artist
        let artist = await prisma.artist.findFirst({
            where: { name: body.artist }
        });

        if (!artist) {
            const firstChar = body.artist.charAt(0);
            let index = '#';
            if (pinyin.isSupported()) {
                 const py = pinyin.convertToPinyin(firstChar, '', true);
                 const firstLetter = py.charAt(0).toUpperCase();
                 if (/^[A-Z]$/.test(firstLetter)) index = firstLetter;
            }
            artist = await prisma.artist.create({
                data: { name: body.artist, index }
            });
        }
        updateData.artistId = artist.id;
        updateData.artistName = body.artist;
    }

    // Handle Album update
    if (body.album && body.album !== song.albumName) {
        const artistId = typeof updateData.artistId === 'string' ? updateData.artistId : song.artistId;
        const artistName = typeof updateData.artistName === 'string' ? updateData.artistName : song.artistName;

        if (artistId) {
             let album = await prisma.album.findFirst({
                 where: { 
                     name: body.album,
                     artistId: artistId
                 }
             });

             if (!album) {
                 album = await prisma.album.create({
                     data: {
                         name: body.album,
                         artistId: artistId,
                         artistName: artistName,
                         createdAt: new Date(),
                         cover: '/images/default_cover.png'
                     }
                 });
             }
             updateData.albumId = album.id;
             updateData.albumName = body.album;
        }
    }

    if (Object.keys(updateData).length > 0) {
        const updatedSong = await prisma.song.update({
            where: { id },
            data: updateData
        });
        return NextResponse.json({ success: true, data: updatedSong });
    }

    return NextResponse.json({ success: true, data: song });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
