import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink, rename } from 'fs/promises';
import path from 'path';

// Define project root explicitly
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');

async function getDB() {
  try {
    const data = await readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { songs: [], albums: [] };
  }
}

async function saveDB(data: any) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDB();
    const songIndex = db.songs.findIndex((s: any) => s.id === id);

    if (songIndex === -1) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = db.songs[songIndex];

    // Delete files
    if (song.files) {
      for (const key in song.files) {
        const value = song.files[key];
        
        // Handle array of file paths (e.g. sheets, lrcs)
        const pathsToDelete = Array.isArray(value) ? value : [value];
        
        for (const relativePath of pathsToDelete) {
          if (relativePath) {
            const fullPath = path.join(STORAGE_ROOT, relativePath);
            try {
              // Using fs.promises.unlink
              await unlink(fullPath);
            } catch (e) {
              // Ignore if file not found
              // console.warn(`Failed to delete file: ${fullPath}`, e);
            }
          }
        }
      }
    }

    // Remove from DB
    db.songs.splice(songIndex, 1);
    await saveDB(db);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDB();
    const songIndex = db.songs.findIndex((s: any) => s.id === id);

    if (songIndex === -1) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const song = db.songs[songIndex];

    // Handle title change and file renaming
    if (body.title && body.title !== song.title) {
        const oldTitle = song.title;
        const newTitle = body.title;
        const pathMapping = new Map<string, string>();
        
        if (song.files) {
            // 1. Collect unique paths
            const allPaths = new Set<string>();
            const collectPaths = (obj: any) => {
                for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === 'string') allPaths.add(val);
                    else if (Array.isArray(val)) val.forEach(v => typeof v === 'string' && allPaths.add(v));
                }
            };
            collectPaths(song.files);

            // 2. Rename files
            for (const relPath of allPaths) {
                // Use posix for DB paths
                const oldName = path.posix.basename(relPath);
                if (oldName.includes(oldTitle)) {
                    const newName = oldName.replace(oldTitle, newTitle);
                    if (newName !== oldName) {
                        const dir = path.posix.dirname(relPath);
                        const newRelPath = path.posix.join(dir, newName);
                        
                        const oldFullPath = path.join(STORAGE_ROOT, relPath);
                        const newFullPath = path.join(STORAGE_ROOT, newRelPath);
                        
                        try {
                            await rename(oldFullPath, newFullPath);
                            pathMapping.set(relPath, newRelPath);
                        } catch (e) {
                            console.error(`Failed to rename ${relPath} to ${newRelPath}:`, e);
                        }
                    }
                }
            }

            // 3. Update song.files
            const updatePaths = (obj: any) => {
                for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === 'string') {
                        if (pathMapping.has(val)) obj[key] = pathMapping.get(val);
                    } else if (Array.isArray(val)) {
                        obj[key] = val.map((v: string) => pathMapping.has(v) ? pathMapping.get(v) : v);
                    }
                }
            };
            updatePaths(song.files);
        }
        song.title = newTitle;
    }

    // Update other fields
    if (body.artist !== undefined) song.artist = body.artist;
    if (body.album !== undefined) song.album = body.album;

    await saveDB(db);

    return NextResponse.json({ success: true, data: song });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
