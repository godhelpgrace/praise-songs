import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { Disc, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/db';
import AlbumCover from '@/components/AlbumCover';

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

async function getAlbums(): Promise<Album[]> {
  try {
    const albums = await prisma.album.findMany({
      include: {
        _count: {
          select: { songs: true }
        }
      }
    });

    return albums.map((a: any) => ({
        name: a.name,
        artist: a.artistName || '未知歌手',
        cover: a.cover || '',
        genre: a.genre || undefined,
        language: a.language || undefined,
        type: a.type || '全长专辑',
        songCount: a._count.songs
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

function FilterSection({ title, options, current, paramKey, searchParams }: { title: string, options: string[], current: string, paramKey: string, searchParams: Record<string, string | string[] | undefined> }) {
    return (
        <div className="mb-8">
            <h3 className="font-bold text-foreground mb-3 border-l-4 border-primary pl-3 text-base">{title}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
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
                                "hover:text-primary transition-colors",
                                isActive ? "text-primary font-bold" : ""
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col gap-8">
            
            {/* Main Content Area */}
            <div className="flex-1">
                <div className="bg-card/50 backdrop-blur-xl rounded-xl p-6 shadow-xl border border-border min-h-[500px]">
                    <div className="flex justify-between items-center mb-6 pb-2 border-b border-border">
                        <h2 className="text-xl font-bold text-foreground">最新入库专辑</h2>
                        <span className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">更多 &raquo;</span>
                    </div>

                    {filteredAlbums.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Disc size={48} className="mx-auto mb-4 opacity-50" />
                            <p>没有找到相关专辑</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredAlbums.map((album) => (
                                <Link 
                                    href={`/album/${encodeURIComponent(album.name)}`} 
                                    key={album.name} 
                                    className="group block"
                                >
                                    <div className="relative aspect-square mb-3 overflow-hidden rounded-lg shadow-lg shadow-black/5 dark:shadow-black/20 group-hover:shadow-primary/20 transition-all">
                                        <AlbumCover 
                                            src={
                                                (!album.cover || album.cover.includes('default_cover'))
                                                ? '/images/default_cover.png'
                                                : (album.cover.startsWith('/') && !album.cover.startsWith('/api/file') ? `/api/file${album.cover}` : album.cover)
                                            } 
                                            alt={album.name} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <PlayCircle className="text-white w-12 h-12 drop-shadow-lg transform scale-90 group-hover:scale-100 transition-transform" />
                                        </div>
                                    </div>
                                    <h3 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors" title={album.name}>
                                        {album.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
                                        {album.artist}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
