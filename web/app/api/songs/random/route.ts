import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const songs = db.songs || [];

    // Shuffle array (Fisher-Yates)
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }

    // Slice to limit
    const randomSongs = songs.slice(0, limit);

    return NextResponse.json(randomSongs);
  } catch (e) {
    console.error('Error fetching random songs:', e);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}