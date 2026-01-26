import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

export async function GET(request: Request) {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    return NextResponse.json(db.playlists || []);
  } catch (e) {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, songs, cover } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    
    if (!db.playlists) db.playlists = [];
    
    const newPlaylist = {
      id: Date.now().toString(),
      title,
      cover: cover || '/images/default_cover.jpg',
      // Only store song IDs
      songs: songs ? songs.map((s: any) => typeof s === 'string' ? s : s.id) : [],
      created_at: new Date().toISOString()
    };

    db.playlists.push(newPlaylist);
    
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));

    return NextResponse.json(newPlaylist);
  } catch (e) {
    console.error('Error saving playlist:', e);
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
  }
}