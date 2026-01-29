import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';

const STORAGE_ROOT = path.join(process.cwd(), '..', 'storage');

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
    // Find album by name
    let album = await prisma.album.findFirst({
        where: { name: albumName }
    });
    
    if (album) {
        await prisma.album.update({
            where: { id: album.id },
            data: { cover: publicPath }
        });
    } else {
        // Create new album entry if not exists
        // We need to find artist from songs to populate artist info if possible
        const song = await prisma.song.findFirst({
            where: { albumName: albumName }
        });
        
        const artistName = song ? song.artistName : '未知歌手';
        const artistId = song ? song.artistId : null;

        album = await prisma.album.create({
            data: {
                name: albumName,
                artistName: artistName || '未知歌手',
                artistId: artistId,
                cover: publicPath,
                createdAt: new Date()
            }
        });
    }

    return NextResponse.json({ success: true, cover: publicPath });
  } catch (e) {
    console.error('Error uploading album cover:', e);
    return NextResponse.json({ error: 'Failed to upload cover' }, { status: 500 });
  }
}
