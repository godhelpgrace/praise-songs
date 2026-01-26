import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const albumName = decodeURIComponent(name);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const dir = path.join(STORAGE_ROOT, 'images', 'albums');
    await fs.mkdir(dir, { recursive: true });
    
    // Use timestamp + random string to avoid collision
    const ext = path.extname(file.name);
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(dir, fileName);
    
    await fs.writeFile(filePath, buffer);
    const publicPath = `/images/albums/${fileName}`;

    // Update DB
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    if (!db.albums) db.albums = [];

    let album = db.albums.find((a: any) => a.name === albumName);
    
    if (album) {
        album.cover = publicPath;
    } else {
        // Create new album entry if not exists
        // We need to find artist from songs to populate artist info if possible
        const song = db.songs.find((s: any) => s.album === albumName);
        const artist = song ? song.artist : '未知歌手';
        const artistId = song ? song.artist_id : '';

        album = {
            id: Date.now().toString(),
            uuid: uuidv4().replace(/-/g, '').substring(0, 24),
            name: albumName,
            artist: artist,
            artist_id: artistId,
            cover: publicPath,
            songs: [],
            created_at: new Date().toISOString()
        };
        db.albums.push(album);
    }

    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, cover: publicPath });
  } catch (e) {
    console.error('Error uploading album cover:', e);
    return NextResponse.json({ error: 'Failed to upload cover' }, { status: 500 });
  }
}
