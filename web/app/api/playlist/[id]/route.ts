import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    
    if (!db.playlists) return NextResponse.json({ error: 'No playlists' }, { status: 404 });

    const initialLength = db.playlists.length;
    db.playlists = db.playlists.filter((p: any) => p.id !== id);

    if (db.playlists.length === initialLength) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting playlist:', e);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);

    if (!db.playlists) return NextResponse.json({ error: 'No playlists' }, { status: 404 });

    const index = db.playlists.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Merge updates
    const updatedFields = { ...body };
    if (updatedFields.songs) {
        // Ensure we only store IDs
        updatedFields.songs = updatedFields.songs.map((s: any) => typeof s === 'string' ? s : s.id);
    }

    db.playlists[index] = {
      ...db.playlists[index],
      ...updatedFields,
      updated_at: new Date().toISOString()
    };

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return NextResponse.json(db.playlists[index]);
  } catch (e) {
    console.error('Error updating playlist:', e);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}
