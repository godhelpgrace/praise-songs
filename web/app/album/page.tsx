import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Disc, Music } from 'lucide-react';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getAlbums() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    // Allow songs without audio (e.g. sheet/lrc only)
    const songs = db.songs.filter((song: any) => song.album);
    
    // Group by album
    const albums: Record<string, { songs: any[], cover?: string }> = {};

    // 1. Initialize from explicit albums
    if (db.albums) {
        db.albums.forEach((a: any) => {
            albums[a.name] = { songs: [], cover: a.cover };
        });
    }

    // 2. Add songs to albums
    songs.forEach((song: any) => {
        const albumName = song.album;
        if (!albums[albumName]) {
            albums[albumName] = { songs: [] };
        }
        albums[albumName].songs.push(song);
    });

    return albums;
  } catch (e) {
    return {};
  }
}

export default async function AlbumPage() {
  const albums = await getAlbums();
  const albumNames = Object.keys(albums).sort((a, b) => a.localeCompare(b, 'zh-CN'));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="relative bg-gradient-to-r from-purple-400 to-indigo-500 rounded-3xl p-10 mb-12 shadow-xl overflow-hidden text-white">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl font-bold mb-4 tracking-tight flex items-center gap-3">
              <Disc className="w-10 h-10" />
              专辑资料库
            </h1>
            <p className="text-purple-50 text-lg leading-relaxed">
              汇集经典与现代赞美诗专辑，按专辑分类浏览，发现更多美好音乐。
            </p>
          </div>
          <div className="absolute right-0 top-0 w-1/3 h-full bg-white/20 skew-x-12 transform translate-x-12 backdrop-blur-sm"></div>
        </div>
        
        {albumNames.length === 0 ? (
             <div className="bg-white/5 backdrop-blur-md p-12 rounded-3xl shadow-sm text-center text-slate-400 py-24 border border-white/10">
               <Disc size={48} className="mx-auto text-slate-600 mb-4" />
               <p className="text-lg">暂无专辑数据</p>
               <p className="text-sm text-slate-500 mt-2">请在“歌库”中编辑歌曲专辑信息</p>
             </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {albumNames.map(name => {
                const albumData = albums[name];
                const albumSongs = albumData.songs;
                // Guess artist from first song
                const artist = albumSongs[0]?.artist || '未知歌手';
                // Prioritize explicit album cover, fallback to first song with image
                const cover = albumData.cover || albumSongs.find((s: any) => s.files.image)?.files.image;

                return (
                    <Link href={`/album/${encodeURIComponent(name)}`} key={name} className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 group block transform hover:-translate-y-1 border border-white/10 hover:bg-white/10">
                        <div className="aspect-square bg-white/5 relative flex items-center justify-center overflow-hidden">
                            <img 
                                src={
                                    (!cover || cover.includes('default_cover'))
                                    ? '/images/default_cover.png'
                                    : (cover.startsWith('/') && !cover.startsWith('/api/file') ? `/api/file${cover}` : cover)
                                } 
                                alt={name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shadow-lg transform scale-50 group-hover:scale-100 transition-all duration-300 backdrop-blur-md border border-white/20">
                                    <Disc size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="font-bold text-slate-200 truncate mb-1 text-lg group-hover:text-purple-400 transition-colors" title={name}>{name}</h3>
                            <p className="text-sm text-slate-500 truncate flex items-center gap-1 mb-2">
                                <span className="text-gray-600">{artist}</span>
                            </p>
                            <p className="text-xs text-gray-600 flex items-center gap-2">
                                <span className="bg-white/10 px-2 py-0.5 rounded text-gray-400">{albumSongs.length} 首</span>
                            </p>
                        </div>
                    </Link>
                );
            })}
            </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
