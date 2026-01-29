'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PlayCircle, Heart, Share2, Smartphone, Disc, Video, FileText, Music, User, Search, List, Grid, Eye, Download, ThumbsUp, Star, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AlbumCover from '@/components/AlbumCover';

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  files: {
    audio?: string;
    image?: string;
    lrc?: string;
    sheet?: string;
    sheets?: string[];
    video?: string;
  };
};

type Artist = {
  id: string;
  name: string;
  enName?: string;
  avatar?: string;
  description?: string;
  stats?: {
    songsCount: number;
    sheetCount: number;
    videoCount: number;
  };
};

type Album = {
  name: string;
  artist?: string;
  cover?: string;
  date?: string;
};

type VideoItem = {
  id: string;
  uuid?: string | null;
  title: string;
  artistId?: string | null;
  artistName?: string;
  songId?: string | null;
  src: string;
  cover?: string | null;
  createdAt?: string | null;
};

const DEFAULT_COVER = '/images/default_cover.png';

const detectCategoryFromFilename = (fileName: string): string => {
    if (fileName.match(/五线|Staff/i)) return '五线谱';
    if (fileName.match(/吉他|Guitar/i)) return '吉他谱';
    if (fileName.match(/钢琴|Piano/i)) return '五线谱';
    if (fileName.match(/和弦|Chord/i)) return '和弦谱';
    if (fileName.match(/贝斯|Bass/i)) return '贝斯谱';
    if (fileName.match(/鼓|Drum/i)) return '鼓谱';
    if (fileName.match(/官方|Official/i)) return '和弦谱';
    return '';
};

const extractKeyFromFilename = (fileName: string): string => {
    const match = fileName.match(/\(([A-G][#b♭]?调)\)/);
    return match ? match[1] : '';
};

// Deterministic pseudo-random generator to avoid hydration mismatches
const getPseudoRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export default function ArtistClient({ 
  artist, 
  songs, 
  albums,
  videos
}: { 
  artist: Artist, 
  songs: Song[], 
  albums: Album[],
  videos: VideoItem[]
}) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState('默认');
  const [isFollowed, setIsFollowed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [sheetSearch, setSheetSearch] = useState('');

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('链接已复制到剪贴板');
    });
  };

  const handleMobileView = () => {
    alert('请使用手机访问以获得最佳体验');
  };

  const handleDelete = async () => {
      if (!confirm(`确定要删除音乐人 "${artist.name}" 吗？\n这将清除所有相关歌曲和专辑的关联信息。`)) return;

      try {
          const res = await fetch(`/api/artist/${artist.id}`, { method: 'DELETE' });
          if (res.ok) {
              router.push('/artist');
              router.refresh();
          } else {
              alert('删除失败');
          }
      } catch (e) {
          alert('删除出错');
      }
  };

  const handleDeleteVideo = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      
      let realId = id;
      if (id.startsWith('video_')) {
          realId = id.replace('video_', '');
      } else if (id.startsWith('legacy_')) {
          alert('无法直接删除关联歌曲的视频，请在歌曲管理中操作');
          return;
      }

      if (!confirm('确定要删除这个视频吗？')) return;

      try {
          const res = await fetch(`/api/video/${realId}`, { method: 'DELETE' });
          if (res.ok) {
              router.refresh();
          } else {
              alert('删除失败');
          }
      } catch (e) {
          alert('删除出错');
      }
  };

  const menuItems = [
    { id: 'home', label: '音乐人主页' },
    { id: 'detail', label: '详细资料' },
    { id: 'album', label: '专辑列表' },
    { id: 'song', label: '歌曲列表' },
    { id: 'video', label: '视频列表' },
    { id: 'sheet', label: '歌谱列表' },
  ];

  // Enrich data with deterministic mock stats
  const enrichedSongs = useMemo(() => songs.map(s => {
    const seed = s.id;
    return {
      ...s,
      stats: {
        popularity: getPseudoRandom(seed + 'pop') % 100,
        views: getPseudoRandom(seed + 'view') % 10000 + 500,
        listens: getPseudoRandom(seed + 'listen') % 5000 + 100,
        downloads: getPseudoRandom(seed + 'down') % 1000,
        favorites: getPseudoRandom(seed + 'fav') % 500,
        recommends: getPseudoRandom(seed + 'rec') % 200,
      }
    };
  }), [songs]);

  const enrichedAlbums = useMemo(() => albums.map(a => {
    const seed = a.name;
    return {
      ...a,
      stats: {
        popularity: getPseudoRandom(seed + 'pop') % 100,
        views: getPseudoRandom(seed + 'view') % 5000 + 200,
        favorites: getPseudoRandom(seed + 'fav') % 300,
        recommends: getPseudoRandom(seed + 'rec') % 100,
      }
    };
  }), [albums]);

  const enrichedVideos = useMemo(() => {
    const merged: Array<{
      id: string;
      title: string;
      src: string;
      cover?: string | null;
      stats: { views: number; favorites: number };
    }> = [];

    const add = (item: { id: string; title: string; src: string; cover?: string | null }) => {
      const seed = item.id;
      merged.push({
        ...item,
        stats: {
          views: getPseudoRandom(seed + 'view') % 5000 + 100,
          favorites: getPseudoRandom(seed + 'fav') % 200
        }
      });
    };

    videos.forEach((v) => {
      if (!v.src) return;
      add({
        id: `video_${v.id}`,
        title: v.title,
        src: v.src,
        cover: v.cover || null
      });
    });

    enrichedSongs
      .filter((s) => s.files.video)
      .forEach((s) => {
        add({
          id: `legacy_${s.id}`,
          title: s.title,
          src: s.files.video!,
          cover: s.files.image || null
        });
      });

    const deduped = new Map<string, (typeof merged)[number]>();
    merged.forEach((v) => {
      const key = v.src;
      if (!deduped.has(key)) deduped.set(key, v);
    });

    return Array.from(deduped.values());
  }, [videos, enrichedSongs]);

  const audioSongs = useMemo(() => enrichedSongs.filter(s => s.files.audio), [enrichedSongs]);

  // Flatten and filter sheets
  const allSheets = useMemo(() => {
    const flattened: any[] = [];
    enrichedSongs.forEach(song => {
        // Handle multiple sheets
        if (song.files.sheets && song.files.sheets.length > 0) {
            song.files.sheets.forEach((sheetPath, idx) => {
                 const decodedPath = decodeURIComponent(sheetPath);
                 const fileName = decodedPath.split('/').pop()?.replace(/\.[^/.]+$/, "") || '';
                 const category = detectCategoryFromFilename(fileName);
                 const key = extractKeyFromFilename(fileName);
                 
                 let displayTitle = song.title;
                 if (key) displayTitle += ` ${key}`;

                 flattened.push({
                     ...song,
                     id: `${song.id}_${idx}`,
                     sheetUrl: sheetPath,
                     displayTitle: displayTitle,
                     category: category || '简谱'
                 });
            });
        } else if (song.files.sheet) {
            // Single sheet legacy
             const decodedPath = decodeURIComponent(song.files.sheet);
             const fileName = decodedPath.split('/').pop()?.replace(/\.[^/.]+$/, "") || '';
             const category = detectCategoryFromFilename(fileName);
             const key = extractKeyFromFilename(fileName);

             let displayTitle = song.title;
             if (key) displayTitle += ` ${key}`;
             
             flattened.push({
                 ...song,
                 id: `${song.id}_0`,
                 sheetUrl: song.files.sheet,
                 displayTitle: displayTitle,
                 category: category || '简谱'
             });
        }
    });
    return flattened;
  }, [enrichedSongs]);

  const filteredSheets = allSheets.filter(s => 
    s.displayTitle.toLowerCase().includes(sheetSearch.toLowerCase()) ||
    (s.album && s.album.toLowerCase().includes(sheetSearch.toLowerCase()))
  );

  const getSortedData = <T extends { stats: any }>(data: T[]) => {
    const sorted = [...data];
    switch (sortOption) {
      case '总人气': return sorted.sort((a, b) => b.stats.popularity - a.stats.popularity);
      case '浏览量': return sorted.sort((a, b) => b.stats.views - a.stats.views);
      case '观看次数': return sorted.sort((a, b) => b.stats.views - a.stats.views);
      case '试听量': return sorted.sort((a, b) => b.stats.listens - a.stats.listens);
      case '下载量': return sorted.sort((a, b) => b.stats.downloads - a.stats.downloads);
      case '收藏数': return sorted.sort((a, b) => b.stats.favorites - a.stats.favorites);
      case '推荐数': return sorted.sort((a, b) => b.stats.recommends - a.stats.recommends);
      default: return sorted;
    }
  };

  const handlePlay = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    const width = 1200;
    const height = 800;
    const left = (window.screen.availWidth - width) / 2;
    const top = (window.screen.availHeight - height) / 2;
    
    window.open(
      `/song/${song.id}`, 
      'music_player_window', 
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );
  };

  const SortBar = ({ 
    options = ['默认', '总人气', '浏览量', '试听量', '下载量', '收藏数', '推荐数'],
    showViewToggle = false
  }) => (
    <div className="px-6 py-4 border-b border-border bg-muted/30 backdrop-blur-md flex flex-wrap gap-4 items-center justify-between">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="font-bold text-muted-foreground">排序：</span>
        {options.map((opt) => (
          <button 
            key={opt} 
            onClick={() => setSortOption(opt)}
            className={`px-3 py-1 rounded transition-colors text-xs ${
              sortOption === opt 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {showViewToggle && (
        <div className="flex gap-1 border border-border rounded p-1 bg-card">
           <button 
             onClick={() => setViewMode('grid')}
             className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
             title="网格视图"
           >
             <Grid size={18}/>
           </button>
           <button 
             onClick={() => setViewMode('list')}
             className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
             title="列表视图"
           >
             <List size={18}/>
           </button>
        </div>
      )}
    </div>
  );

  const renderHome = () => (
    <>
      {/* Header Info Card */}
      <div className="bg-card backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-border relative mb-6">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-6 border-l-4 border-primary pl-4">关于 {artist.name}</h2>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-12 text-sm text-muted-foreground mb-6 max-w-lg">
               <div className="flex justify-start gap-4">
                 <span>专辑数量：</span>
                 <span className="font-bold text-foreground">{albums.length} 张</span>
               </div>
               <div className="flex justify-start gap-4">
                 <span>歌曲数量：</span>
                 <span className="font-bold text-foreground">{artist.stats?.songsCount || 0} 首</span>
               </div>
               <div className="flex justify-start gap-4">
                 <span>歌谱数量：</span>
                 <span className="font-bold text-foreground">{artist.stats?.sheetCount || 0} 首</span>
               </div>
               <div className="flex justify-start gap-4">
                 <span>视频数量：</span>
                 <span className="font-bold text-foreground">{artist.stats?.videoCount || 0} 首</span>
               </div>
            </div>

            <div className="text-sm text-muted-foreground leading-relaxed mb-8 line-clamp-3">
               <span className="font-bold text-foreground">简介：</span>
               {artist.description || '暂无简介...'}
               <span className="text-primary ml-2 cursor-pointer hover:text-primary/80" onClick={() => setActiveTab('detail')}>更多...</span>
            </div>

            <div className="flex gap-4 flex-wrap">
               <button 
                  onClick={() => setIsFollowed(!isFollowed)}
                  className={`flex items-center gap-2 px-6 py-2 border rounded-lg text-sm font-medium transition-colors ${
                    isFollowed 
                    ? 'bg-rose-500/20 text-rose-500 border-rose-500/50' 
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                  }`}
               >
                  <Heart size={16} fill={isFollowed ? "currentColor" : "none"} /> {isFollowed ? '已关注' : '关注'}
               </button>
               <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`flex items-center gap-2 px-6 py-2 border rounded-lg text-sm font-medium transition-colors ${
                    isLiked
                    ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/50'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                  }`}
               >
                  <ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"} /> {isLiked ? '已点赞' : '点赞'}
               </button>
               <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-2 bg-muted/50 hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
               >
                  <Share2 size={16} /> 分享
               </button>
               <button 
                  onClick={handleMobileView}
                  className="flex items-center gap-2 px-6 py-2 bg-muted/50 hover:bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
               >
                  <Smartphone size={16} /> 手机查看
               </button>
               {isAdmin && (
                   <button 
                      onClick={handleDelete}
                      className="flex items-center gap-2 px-6 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-500 text-sm font-medium transition-colors"
                   >
                      <Trash2 size={16} /> 删除
                   </button>
               )}
            </div>
          </div>

          {/* Right Large Logo */}
          <div className="hidden lg:flex w-64 h-64 flex-shrink-0 bg-muted/30 rounded-2xl border border-border items-center justify-center p-4 shadow-inner">
             {artist.avatar ? (
                <img src={`/api/file${artist.avatar}`} alt={artist.name} className="max-w-full max-h-full object-contain" />
             ) : (
                <User size={80} className="text-muted-foreground/50" />
             )}
          </div>
        </div>
      </div>

      {/* Hot Songs Section */}
      <div className="bg-card backdrop-blur-xl rounded-2xl shadow-xl border border-border mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
           <div className="flex items-end gap-4">
              <h2 className="text-lg font-bold text-foreground">热门歌曲</h2>
           </div>
           <div className="text-xs text-muted-foreground">
              最新歌曲 | <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveTab('song')}>更多 &raquo;</span>
           </div>
        </div>
        
        <div className="p-4">
          <table className="w-full text-sm text-muted-foreground">
             <tbody>
               {audioSongs.sort((a, b) => b.stats.popularity - a.stats.popularity).slice(0, 10).map((song, index) => (
                 <tr key={song.id} className="hover:bg-muted/50 group border-b border-border/50 last:border-0 transition-colors">
                    <td className="py-3 px-2 w-10 text-center">
                      <input type="checkbox" className="rounded border-border bg-muted text-primary focus:ring-primary" />
                    </td>
                    <td className="py-3 px-2 w-10 text-muted-foreground font-mono text-center">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                         <span className="text-foreground font-medium group-hover:text-primary cursor-pointer transition-colors" onClick={(e) => handlePlay(e, song)}>
                            {song.title}
                         </span>
                         <div className="flex gap-2">
                             <PlayCircle 
                               size={16} 
                               className="text-primary cursor-pointer hover:scale-110 transition-transform hover:text-primary/80" 
                               onClick={(e) => handlePlay(e, song)}
                             />
                         </div>
                         <span className="text-muted-foreground mx-1">-</span>
                         <span className="text-muted-foreground">{song.album || '未分类专辑'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right w-32 text-muted-foreground text-xs">
                        人气: {song.stats.popularity}
                    </td>
                    <td className="py-3 px-2 text-right w-48">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 bg-muted/50 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"><Heart size={14}/></button>
                          <button className="p-1.5 bg-muted/50 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"><Share2 size={14}/></button>
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderDetail = () => (
    <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-xl border border-border min-h-[500px] p-8">
       <h2 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">详细资料</h2>
       <div className="text-sm text-muted-foreground leading-relaxed space-y-4">
          {artist.description?.split('\n').map((paragraph, idx) => (
             <p key={idx}>{paragraph}</p>
          ))}
       </div>
    </div>
  );

  const renderAlbumList = () => {
    const sortedAlbums = getSortedData(enrichedAlbums);
    
    return (
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-xl border border-border min-h-[500px] overflow-hidden">
           <SortBar options={['默认', '总人气', '浏览量', '收藏数', '推荐数']} showViewToggle={true} />
           
           {viewMode === 'grid' ? (
               <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {sortedAlbums.map(album => (
                     <Link href={`/album/${encodeURIComponent(album.name)}`} key={album.name} className="group block">
                        <div className="aspect-square bg-muted/50 rounded-xl shadow-lg overflow-hidden mb-3 relative mx-auto border border-border/50">
                           <AlbumCover 
                              src={album.cover ? (album.cover.startsWith('/') ? `/api/file${album.cover}` : album.cover) : DEFAULT_COVER} 
                              alt={album.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                           />
                           {/* Hover Play Button */}
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                              <PlayCircle size={48} className="text-white drop-shadow-lg hover:scale-110 transition-transform" />
                           </div>
                        </div>
                        <div className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors mb-1">{album.name}</div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>{album.date || '2023-01-01'}</span>
                            <span className="flex items-center gap-1"><Eye size={10}/> {album.stats.views}</span>
                        </div>
                     </Link>
                  ))}
                  {sortedAlbums.length === 0 && <div className="col-span-full text-center text-muted-foreground py-20">暂无专辑</div>}
               </div>
           ) : (
               <div className="p-4">
                   <table className="w-full text-sm text-muted-foreground">
                       <thead>
                           <tr className="border-b border-border text-left text-muted-foreground bg-muted/50">
                               <th className="py-3 px-4 font-medium">专辑封面</th>
                               <th className="py-3 px-4 font-medium">专辑名称</th>
                               <th className="py-3 px-4 font-medium">发行时间</th>
                               <th className="py-3 px-4 font-medium text-right">热度</th>
                           </tr>
                       </thead>
                       <tbody>
                           {sortedAlbums.map(album => (
                               <tr key={album.name} className="border-b border-border/50 hover:bg-muted/50 group transition-colors">
                                   <td className="py-3 px-4 w-20">
                                       <div className="w-12 h-12 rounded-lg overflow-hidden border border-border">
                                           <AlbumCover 
                                            src={album.cover && album.cover.startsWith('/') ? `/api/file${album.cover}` : (album.cover || DEFAULT_COVER)} 
                                            alt={album.name}
                                            className="w-full h-full object-cover"
                                           />
                                       </div>
                                   </td>
                                   <td className="py-3 px-4">
                                       <Link href={`/album/${encodeURIComponent(album.name)}`} className="text-foreground font-bold hover:text-primary block transition-colors">
                                           {album.name}
                                       </Link>
                                       <div className="text-xs text-muted-foreground mt-1">{album.artist}</div>
                                   </td>
                                   <td className="py-3 px-4 text-muted-foreground">
                                       {album.date || '2023-01-01'}
                                   </td>
                                   <td className="py-3 px-4 text-right text-muted-foreground">
                                       <div className="flex items-center justify-end gap-3">
                                           <span className="flex items-center gap-1" title="浏览"><Eye size={14}/> {album.stats.views}</span>
                                           <span className="flex items-center gap-1" title="收藏"><Heart size={14}/> {album.stats.favorites}</span>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           )}
        </div>
    );
  };

  const renderSongList = () => {
    const sortedSongs = getSortedData(audioSongs);
    return (
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-xl border border-border min-h-[500px] overflow-hidden">
            <SortBar />
            <div className="p-4">
            <table className="w-full text-sm text-muted-foreground">
                <tbody>
                {sortedSongs.map((song, index) => (
                    <tr key={song.id} className="hover:bg-muted/50 group border-b border-border/50 last:border-0 h-12 transition-colors">
                        <td className="px-2 w-10 text-center">
                        <input type="checkbox" className="rounded border-border bg-muted text-primary focus:ring-primary" />
                        </td>
                        <td className="px-2 w-10 text-muted-foreground font-mono text-center">
                        {(index + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-foreground font-medium group-hover:text-primary cursor-pointer transition-colors" onClick={(e) => handlePlay(e, song)}>
                                {song.title}
                            </span>
                            <span className="text-muted-foreground mx-2">-</span>
                            <span className="text-muted-foreground hover:text-primary cursor-pointer transition-colors">{song.album || '未分类专辑'}</span>
                        </div>
                        </td>
                        <td className="px-2 text-right text-muted-foreground w-32 text-xs">
                           <div className="flex justify-end items-center gap-3">
                              <span className="flex items-center gap-1"><Eye size={12}/> {song.stats.views}</span>
                              <span className="flex items-center gap-1"><Download size={12}/> {song.stats.downloads}</span>
                           </div>
                        </td>
                        <td className="px-2 text-right w-24">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="收藏"><Heart size={14}/></button>
                            <button className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="点赞"><ThumbsUp size={14}/></button>
                        </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
    );
  };

  const renderVideoList = () => {
    const sortedVideos = getSortedData(enrichedVideos);
    
    return (
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-xl border border-border min-h-[500px] overflow-hidden">
           <SortBar options={['默认', '观看次数', '收藏数']} />
           {sortedVideos.length > 0 ? (
             <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {sortedVideos.map(video => (
                   <div key={video.id} className="group cursor-pointer" onClick={() => window.open(video.src.startsWith('/') ? `/api/file${video.src}` : video.src, '_blank')}>
                      <div className="aspect-video bg-muted rounded-xl overflow-hidden mb-2 relative border border-border shadow-lg">
                         {/* Overlay Play Icon */}
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all backdrop-blur-[1px]">
                            <PlayCircle size={32} className="text-white drop-shadow-lg" />
                         </div>
                         {isAdmin && (
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <button 
                                  onClick={(e) => handleDeleteVideo(e, video.id)}
                                  className="p-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm"
                                  title="删除视频"
                                >
                                    <Trash2 size={14} />
                                </button>
                             </div>
                         )}
                         {video.cover ? (
                             <img src={video.cover.startsWith('/') ? `/api/file${video.cover}` : video.cover} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                         ) : (
                             <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                 <Video size={32} />
                             </div>
                         )}
                      </div>
                      <div className="text-sm font-bold text-foreground group-hover:text-primary truncate transition-colors">{video.title}</div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Eye size={10}/> {video.stats.views}</span>
                          <span className="flex items-center gap-1"><Heart size={10}/> {video.stats.favorites}</span>
                      </div>
                   </div>
                ))}
             </div>
           ) : (
             <div className="p-10 text-center text-muted-foreground">
                暂无视频
             </div>
           )}
        </div>
    );
  };

  const renderSheetList = () => {
    const sortedSheets = getSortedData(filteredSheets);

    const handleOpenSheet = (sheetUrl: string) => {
        if (!sheetUrl) return;
        window.open(sheetUrl.startsWith('/') ? `/api/file${sheetUrl}` : sheetUrl, '_blank');
    };

    return (
    <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-xl border border-border min-h-[500px] overflow-hidden">
       <SortBar />
       <div className="px-6 py-4 border-b border-border">
          <div className="relative">
             <input
              type="text"
              placeholder="搜索歌谱..."
              value={sheetSearch}
              onChange={(e) => setSheetSearch(e.target.value)}
              className="bg-muted border border-border text-foreground text-sm rounded-full px-4 py-2 pl-10 focus:outline-none focus:border-primary w-full md:w-64 transition-colors placeholder-muted-foreground"
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
       </div>
       <div className="p-6">
          {sortedSheets.length > 0 ? (
          <table className="w-full text-sm text-muted-foreground">
             <tbody>
               {sortedSheets.map((song, index) => (
                 <tr key={song.id} className="hover:bg-muted/50 group border-b border-border/50 last:border-0 h-12 transition-colors">
                    <td className="px-2 w-10 text-muted-foreground font-mono text-center">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-2">
                      <span 
                        className="text-foreground font-medium group-hover:text-primary cursor-pointer transition-colors"
                        onClick={() => handleOpenSheet(song.sheetUrl)}
                      >
                         {song.displayTitle} <span className="text-muted-foreground text-xs">[{song.category}]</span>
                      </span>
                    </td>
                    <td className="px-2 text-right text-muted-foreground w-32">
                       {song.album}
                    </td>
                    <td className="px-2 text-right w-24">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => handleOpenSheet(song.sheetUrl)}
                            title="查看歌谱"
                          >
                            <FileText size={14}/>
                          </button>
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
          ) : (
            <div className="text-center text-muted-foreground py-10">暂无歌谱</div>
          )}
       </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Top Header Info */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 py-8 overflow-hidden text-white shadow-2xl">
         <div className="absolute right-0 top-0 w-1/3 h-full bg-white/10 skew-x-12 transform translate-x-12"></div>
         <div className="container mx-auto px-4 text-center relative z-10 flex items-center justify-center gap-6">
            <div className="w-24 h-24 bg-white/10 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl backdrop-blur-sm p-1 shrink-0">
               {artist.avatar ? (
                  <img src={`/api/file${artist.avatar}`} alt={artist.name} className="w-full h-full object-cover rounded-full" />
               ) : (
                  <div className="flex items-center justify-center h-full text-white/50 bg-white/5 rounded-full"><User size={40}/></div>
               )}
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold mb-1 tracking-tight drop-shadow-md">{artist.name}</h1>
              <div className="text-indigo-200 text-xl font-medium tracking-wide">{artist.enName}</div>
            </div>
         </div>
      </div>

      {/* Sticky Navigation */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border shadow-lg mb-8">
         <div className="container mx-auto px-4">
            <div className="flex justify-center items-center gap-2 overflow-x-auto no-scrollbar py-3">
              {menuItems.map(item => (
                 <button
                   key={item.id}
                   onClick={() => {
                       setActiveTab(item.id);
                       setSortOption('默认'); // Reset sort when tab changes
                   }}
                   className={`px-6 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                      activeTab === item.id 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 transform scale-105' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                   }`}
                 >
                   {item.label}
                 </button>
              ))}
            </div>
         </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 max-w-6xl">
         {activeTab === 'home' && renderHome()}
         {activeTab === 'detail' && renderDetail()}
         {activeTab === 'album' && renderAlbumList()}
         {activeTab === 'song' && renderSongList()}
         {activeTab === 'video' && renderVideoList()}
         {activeTab === 'sheet' && renderSheetList()}
      </main>
    </div>
  );
}
