import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchClient from './SearchClient';
import { Suspense } from 'react';

// Define project root explicitly
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getSongs() {
  try {
    try {
      await fs.access(DB_PATH);
    } catch {
      return [];
    }

    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    return db.songs || [];
  } catch (e) {
    console.error('Error reading songs list:', e);
    return [];
  }
}

export default async function SearchPage() {
  const songs = await getSongs();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading...</div>}>
          <SearchClient songs={songs} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}