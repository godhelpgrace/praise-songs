import { promises as fs } from 'fs';
import path from 'path';
import SongDetailClient from './client';

// Define project root explicitly
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');

async function getSong(id: string) {
  try {
    try {
      await fs.access(DB_PATH);
    } catch {
      return null;
    }

    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.songs.find((s: any) => s.id === id) || null;
  } catch (e) {
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
  if (song.files && song.files.lrc) {
    try {
      const relativePath = song.files.lrc.replace(/^\//, '');
      const lrcPath = path.join(STORAGE_ROOT, relativePath);
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
