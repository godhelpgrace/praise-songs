import { promises as fs } from 'fs';
import path from 'path';
import SongDetailClient from './client';
import { prisma } from '@/lib/db';

// Define project root explicitly
// In Next.js server components, process.cwd() is the project root (web folder)
const STORAGE_ROOT = path.join(process.cwd(), '..', 'storage');

async function getSong(id: string) {
  try {
    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        artist: true,
        album: true
      }
    });
    
    if (!song) return null;

    // Parse files JSON
    let files = {};
    try {
        files = JSON.parse(song.files);
    } catch (e) {}

    return {
        ...song,
        files
    };
  } catch (e) {
    console.error("Error fetching song:", e);
    return null;
  }
}

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const song = await getSong(id);

  if (!song) {
    return <div className="text-center py-20">歌曲不存在</div>;
  }

  let lrcContent = '';
  // song.files is now an object because we parsed it in getSong
  const files = song.files as any;
  
  if (files && files.lrc) {
    try {
      const relativePath = files.lrc.replace(/^\//, '');
      const lrcPath = path.join(STORAGE_ROOT, relativePath);
      // Check if file exists
      await fs.access(lrcPath);
      lrcContent = await fs.readFile(lrcPath, 'utf-8');
    } catch (e) {
      console.warn(`LRC file issue for song ${id}:`, e);
    }
  }

  // Removed standard Header/Footer to support immersive player layout
  return (
    <SongDetailClient song={song} lrc={lrcContent} />
  );
}
