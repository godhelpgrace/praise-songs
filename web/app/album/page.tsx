import { promises as fs } from 'fs';
import path from 'path';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Disc, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

const FILTER_TYPES = ['全部', '全长专辑', '单曲EP', '现场Live', '精选集', '原创集', '伴奏集', '诗歌本', '经文诗歌', '有声读物'];
const FILTER_GENRES = ['全部', '古典/传统', '现代流行', '乡村民谣', '中国风', '器乐/纯音乐', 'R&B/Hip-Hop', '戏曲', '爵士/布鲁斯', '以色列', '舞曲/电子', '古风', '其它'];
const FILTER_LANGUAGES = ['全部', '国语', '闽南语', '粤语', '韩语', '英语', '地方', '希伯来语', '少数民族语', '德语', '拉丁语', '法语', '西班牙语', '其它'];
const FILTER_INITIALS = ['全部', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

type Album = {
  name: string;
  artist: string;
  cover: string;
  genre?: string;
  language?: string;
  type?: string;
  songCount: number;
};

async function getAlbums() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    const songs = db.songs.filter((song: any) => song.album);
    
    const albumMap: Record<string, Album> = {};

    // 1. Initialize from explicit albums
    if (db.albums) {
        db.albums.forEach((a: any) => {
            albumMap[a.name] = {
                name: a.name,
                artist: a.artist || '未知歌手',
                cover: a.cover,
                genre: a.genre,
                language: a.language,
                type: '全长专辑', // Default to album if explicitly defined
                songCount: 0 // Will count from songs
            };
        });
    }

    // 2. Add songs to albums and count
    songs.forEach((song: any) => {
        const albumName = song.album;
        if (!albumMap[albumName]) {
            albumMap[albumName] = {
                name: albumName,
                artist: song.artist || '未知歌手',
                cover: song.files.image, // Fallback to song image
                songCount: 0,
                type: '全长专辑'
            };
        } else if (!albumMap[albumName].cover && song.files.image) {
            albumMap[albumName].cover = song.files.image;
        }
        albumMap[albumName].songCount++;
    });

    return Object.values(albumMap);
  } catch (e) {
    return [];
  }
}

function FilterSection({ title, options, current, paramKey, searchParams }: { title: string, options: string[], current: string, paramKey: string, searchParams: Record<string, string | string[] | undefined> }) {
    return (
        <div className="mb-8">
            <h3 className="font-bold text-slate-800 mb-3 border-l-4 border-amber-500 pl-3 text-base">{title}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                {options.map(opt => {
                    const isActive = current === opt || (opt === '全部' && !current);
                    
                    // Construct new params
                    const newParams = new URLSearchParams();
                    Object.entries(searchParams).forEach(([key, value]) => {
                        if (value) {
                            if (Array.isArray(value)) {
                                value.forEach(v => newParams.append(key, v));
                            } else {
                                newParams.set(key, value);
                            }
                        }
                    });

                    if (opt === '全部') {
                        newParams.delete(paramKey);
                    } else {
                        newParams.set(paramKey, opt);
                    }

                    return (
                        <Link 
                            key={opt} 
                            href={`/album?${newParams.toString()}`}
                            className={cn(
                                "hover:text-amber-600 transition-colors",
                                isActive ? "text-amber-600 font-bold" : ""
                            )}
                        >
                            {opt}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export default async function AlbumPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const albums = await getAlbums();
  const params = await searchParams;
  
  const currentType = (params.type as string) || '';
  const currentGenre = (params.genre as string) || '';
  const currentLanguage = (params.language as string) || '';
  const currentInitial = (params.initial as string) || '';

  // Filter albums
  const filteredAlbums = albums.filter(album => {
      if (currentType && currentType !== '全部' && album.type !== currentType) return false; // Note: type might not be populated well yet
      if (currentGenre && currentGenre !== '全部' && album.genre !== currentGenre) return false;
      if (currentLanguage && currentLanguage !== '全部' && album.language !== currentLanguage) return false;
      // Initial filtering would require pinyin conversion or storing initial
      // For now, if we don't have initial, we skip this check or implement basic check if name starts with English
      if (currentInitial && currentInitial !== '全部') {
          // Very basic check, ideally use a pinyin library
          return true; 
      }
      return true;
  });

  // Sort by some criteria? Maybe recently added if we had dates, or name
  filteredAlbums.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Main Content Area */}
            <div className="flex-1">
                <div className="bg-white rounded-xl p-6 shadow-sm min-h-[500px]">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
                        <h2 className="text-xl font-bold text-slate-800">最新入库专辑</h2>
                        <span className="text-xs text-slate-400 hover:text-amber-500 cursor-pointer">更多 &raquo;</span>
                    </div>

                    {filteredAlbums.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Disc size={48} className="mx-auto mb-4 opacity-50" />
                            <p>没有找到相关专辑</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {filteredAlbums.map((album) => (
                                <Link 
                                    href={`/album/${encodeURIComponent(album.name)}`} 
                                    key={album.name} 
                                    className="group block"
                                >
                                    <div className="relative aspect-square mb-3 overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                                        <img 
                                            src={
                                                (!album.cover || album.cover.includes('default_cover'))
                                                ? '/images/default_cover.png'
                                                : (album.cover.startsWith('/') && !album.cover.startsWith('/api/file') ? `/api/file${album.cover}` : album.cover)
                                            } 
                                            alt={album.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <PlayCircle className="text-white w-10 h-10 drop-shadow-lg transform scale-90 group-hover:scale-100 transition-transform" />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 truncate mb-1 group-hover:text-amber-600 transition-colors" title={album.name}>
                                        {album.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 truncate">
                                        {album.artist}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Filters */}
            <aside className="w-full lg:w-64 shrink-0 space-y-8">
                <FilterSection title="类型" options={FILTER_TYPES} current={currentType} paramKey="type" searchParams={params} />
                <FilterSection title="流派" options={FILTER_GENRES} current={currentGenre} paramKey="genre" searchParams={params} />
                <FilterSection title="语言" options={FILTER_LANGUAGES} current={currentLanguage} paramKey="language" searchParams={params} />
                <div className="mb-8">
                    <h3 className="font-bold text-slate-800 mb-3 border-l-4 border-amber-500 pl-3 text-base">首字母</h3>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 font-medium">
                        {FILTER_INITIALS.map(opt => {
                             const isActive = currentInitial === opt || (opt === '全部' && !currentInitial);
                             
                             const newParams = new URLSearchParams();
                             Object.entries(params).forEach(([key, value]) => {
                                 if (value) {
                                     if (Array.isArray(value)) {
                                         value.forEach(v => newParams.append(key, v));
                                     } else {
                                         newParams.set(key, value);
                                     }
                                 }
                             });

                             if (opt === '全部') {
                                 newParams.delete('initial');
                             } else {
                                 newParams.set('initial', opt);
                             }

                             return (
                                <Link 
                                    key={opt} 
                                    href={`/album?${newParams.toString()}`}
                                    className={cn(
                                        "w-6 h-6 flex items-center justify-center rounded hover:bg-amber-100 hover:text-amber-600 transition-colors",
                                        isActive ? "bg-amber-500 text-white hover:bg-amber-600 hover:text-white" : "bg-slate-100"
                                    )}
                                >
                                    {opt}
                                </Link>
                             );
                        })}
                    </div>
                </div>
            </aside>

        </div>
      </main>
      <Footer />
    </div>
  );
}
