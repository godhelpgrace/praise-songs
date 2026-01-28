import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import TinyPinyin from 'tiny-pinyin';
import { User } from 'lucide-react';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getArtists() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const songs = db.songs || [];
    
    // Extract unique artists from songs
    const artistMap: Record<string, { id: string, name: string, index: string }> = {};
    
    songs.forEach((song: any) => {
        if (song.artist && song.artist !== '未分类歌手') {
            if (!artistMap[song.artist]) {
                // Determine index
                const firstChar = song.artist.trim().charAt(0);
                let index = '#';
                if (/[a-zA-Z]/.test(firstChar)) {
                    index = firstChar.toUpperCase();
                } else if (/[\u4e00-\u9fa5]/.test(firstChar)) {
                    const pinyin = TinyPinyin.convertToPinyin(firstChar);
                    if (pinyin && /^[A-Za-z]/.test(pinyin)) {
                        index = pinyin.charAt(0).toUpperCase();
                    }
                }

                artistMap[song.artist] = {
                    id: song.artist_id || `artist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, // Fallback ID if not in song
                    name: song.artist,
                    index: index
                };
            }
        }
    });

    return Object.values(artistMap);
  } catch (e) {
    return [];
  }
}

export default async function ArtistPage() {
  const artists = await getArtists();

  // Group artists by index
  const groupedArtists = artists.reduce((acc: any, artist: any) => {
    const index = artist.index;
    if (!acc[index]) {
      acc[index] = [];
    }
    acc[index].push(artist);
    return acc;
  }, {});

  // Get sorted indexes
  const indexes = Object.keys(groupedArtists).sort();
  const allIndexes = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  allIndexes.push('其他');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="relative bg-gradient-to-r from-pink-400 to-rose-500 rounded-2xl p-6 mb-8 shadow-xl overflow-hidden text-white">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl font-bold mb-2 tracking-tight flex items-center gap-3">
              <User className="w-7 h-7" />
              赞美诗音乐人
            </h1>
            <p className="text-pink-50 text-sm leading-relaxed">
              汇聚全球优秀赞美诗创作者与敬拜团，聆听他们的生命故事与灵感分享。
            </p>
          </div>
          <div className="absolute right-0 top-0 w-1/3 h-full bg-white/20 skew-x-12 transform translate-x-12 backdrop-blur-sm"></div>
        </div>

        {/* Index Navigation */}
        <div className="bg-white/90 p-6 rounded-2xl shadow-sm border border-white/20 mb-8 sticky top-28 z-10 backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            {allIndexes.map((index) => (
              <a 
                key={index} 
                href={`#index-${index}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white text-slate-900 font-bold transition-all duration-200 bg-slate-100 hover:shadow-md text-sm border border-slate-200"
              >
                {index}
              </a>
            ))}
          </div>
        </div>

        {/* Artist List */}
        <div className="bg-white/90 backdrop-blur-lg p-8 rounded-3xl shadow-sm min-h-[500px] border border-white/20">
          <div className="flex justify-end mb-4">
             <Link href="/" className="text-sm text-slate-900 hover:text-rose-500 flex items-center gap-1 transition-colors font-medium">
                返回首页
             </Link>
          </div>

          {indexes.map((index) => (
            <div key={index} id={`index-${index}`} className="mb-10 scroll-mt-32">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2 flex items-center gap-2">
                 <span className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center text-sm">{index}</span>
              </h2>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {groupedArtists[index].map((artist: any) => (
                  <Link 
                    key={artist.id} 
                    href={`/artist/${artist.id}`}
                    className="text-sm text-slate-900 hover:text-rose-500 truncate block py-2 px-3 rounded hover:bg-slate-100 transition-colors font-medium"
                    title={artist.name}
                  >
                    {artist.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          
          {indexes.length === 0 && (
            <div className="text-center text-slate-400 py-24">
              <User size={48} className="mx-auto text-slate-600 mb-4" />
              暂无音乐人数据
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
