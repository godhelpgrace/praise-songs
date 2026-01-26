import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    
    let updatedCount = 0;

    // Find the album to get its ID (if exists)
    const albumEntry = db.albums ? db.albums.find((a: any) => a.name === decodedName) : null;
    const albumId = albumEntry ? albumEntry.id : null;
    
    // Find songs belonging to this album (by name OR by ID)
    const songsToDelete = db.songs.filter((song: any) => {
        const nameMatch = song.album === decodedName;
        const idMatch = albumId && song.album_id === albumId;
        return nameMatch || idMatch;
    });
    
    // Delete files for these songs
    for (const song of songsToDelete) {
        if (song.files) {
            for (const key in song.files) {
                const value = song.files[key];
                const pathsToDelete = Array.isArray(value) ? value : [value];
                
                for (const relativePath of pathsToDelete) {
                    if (relativePath) {
                        const fullPath = path.join(STORAGE_ROOT, relativePath);
                        try {
                            await fs.unlink(fullPath);
                        } catch (e) {
                            // ignore
                        }
                    }
                }
            }
        }
    }

    // Remove songs from DB
    const initialSongCount = db.songs.length;
    db.songs = db.songs.filter((song: any) => {
        const nameMatch = song.album === decodedName;
        const idMatch = albumId && song.album_id === albumId;
        return !nameMatch && !idMatch;
    });
    updatedCount += (initialSongCount - db.songs.length);

    // Remove album entry from db.albums if exists
    if (db.albums) {
        const initialLength = db.albums.length;
        db.albums = db.albums.filter((a: any) => a.name !== decodedName);
        if (db.albums.length < initialLength) {
            updatedCount++; // Count explicit album deletion
        }
    }

    if (updatedCount === 0) {
        // Maybe it's already deleted or doesn't exist, but we return success anyway
    }

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
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
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const body = await request.json();
    const { newName } = body;

    if (!newName) {
        return NextResponse.json({ error: 'New name is required' }, { status: 400 });
    }

    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);

    let updatedCount = 0;
    
    // Find the album to get its ID (if exists)
    const albumEntry = db.albums ? db.albums.find((a: any) => a.name === decodedName) : null;
    const albumId = albumEntry ? albumEntry.id : null;

    // Update album name in db.albums
    if (albumEntry) {
        albumEntry.name = newName;
    }

    // Rename album for all songs (match by name OR by ID)
    db.songs = db.songs.map((song: any) => {
        const nameMatch = song.album === decodedName;
        const idMatch = albumId && song.album_id === albumId;
        
        if (nameMatch || idMatch) {
            updatedCount++;
            return { ...song, album: newName };
        }
        return song;
    });

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return NextResponse.json({ success: true, count: updatedCount, newName });
  } catch (e) {
    console.error('Error updating album:', e);
    return NextResponse.json({ error: 'Failed to update album' }, { status: 500 });
  }
}
