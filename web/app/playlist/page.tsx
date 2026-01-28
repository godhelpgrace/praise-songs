import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlaylistClient from './PlaylistClient';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getData() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    return {
      playlists: db.playlists || [],
      songs: db.songs || []
    };
  } catch (e) {
    return { playlists: [], songs: [] };
  }
}

export const dynamic = 'force-dynamic';

export default async function PlaylistPage() {
  const { playlists, songs } = await getData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <PlaylistClient initialPlaylists={playlists} allSongs={songs} />
      </main>
      <Footer />
    </div>
  );
}