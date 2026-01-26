'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PlayCircle, Heart, Share2, Smartphone, Disc, Video, FileText, Music, User, Search, List, Grid, Eye, Download, ThumbsUp, Star } from 'lucide-react';

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
  };
};

type Artist = {
  id: string;
  name: string;
  enName?: string;
  avatar?: string;
  description?: string;
};

type Album = {
  name: string;
  artist?: string;
  cover?: string;
  date?: string;
};

const DEFAULT_COVER = '/images/default_cover.png';

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
  albums 
}: { 
  artist: Artist, 
  songs: Song[], 
  albums: Album[] 
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState('默认');
  const [isFollowed, setIsFollowed] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('链接已复制到剪贴板');
    });
  };

  const handleMobileView = () => {
    alert('请使用手机访问以获得最佳体验');
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

  // Mock videos data with stats
  const mockVideos = useMemo(() => [
    { id: 1, title: '我献上敬拜', duration: '06:18', cover: DEFAULT_COVER },
    { id: 2, title: '耶稣，美好耶稣', duration: '03:42', cover: DEFAULT_COVER },
    { id: 3, title: '最美的相遇', duration: '05:30', cover: DEFAULT_COVER },
    { id: 4, title: '何等尊贵耶稣', duration: '05:41', cover: DEFAULT_COVER },
    { id: 5, title: '无限希望', duration: '04:45', cover: DEFAULT_COVER },
    { id: 6, title: '愿诸天欢喜', duration: '04:00', cover: DEFAULT_COVER },
    { id: 7, title: '进入神荣耀的命定', duration: '06:59', cover: DEFAULT_COVER },
    { id: 8, title: '得胜的恩膏', duration: '06:13', cover: DEFAULT_COVER },
  ].map(v => ({
    ...v,
    stats: {
        views: getPseudoRandom(v.title + 'view') % 5000 + 100,
        favorites: getPseudoRandom(v.title + 'fav') % 200,
    }
  })), []);

  const getSortedData = <T extends { stats: any }>(data: T[]) => {
    const sorted = [...data];
    switch (sortOption) {
      case '总人气': return sorted.sort((a, b) => b.stats.popularity - a.stats.popularity);
      case '浏览量': 
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
    <div className="px-6 py-4 border-b border-gray-100/50 bg-white/80 backdrop-blur-md flex flex-wrap gap-4 items-center justify-between rounded-t-3xl">
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="font-bold text-gray-700">排序：</span>
        {options.map((opt) => (
          <button 
            key={opt} 
            onClick={() => setSortOption(opt)}
            className={`px-3 py-1 rounded transition-colors ${
              sortOption === opt 
              ? 'bg-gray-800 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {showViewToggle && (
        <div className="flex gap-1 border border-gray-200 rounded p-1">
           <button 
             onClick={() => setViewMode('grid')}
             className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
             title="网格视图"
           >
             <Grid size={18}/>
           </button>
           <button 
             onClick={() => setViewMode('list')}
             className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
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
      <div className="bg-white/80 backdrop-blur-md p-8 rounded shadow-sm border border-white/60 relative mb-6">
        <div className="flex">
          <div className="flex-1 pr-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">关于 {artist.name}</h2>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-12 text-sm text-gray-600 mb-6 max-w-lg">
               <div className="flex justify-start gap-4">
                 <span>专辑数量：</span>
                 <span className="font-bold text-gray-800">{albums.length} 张</span>
               </div>
               <div className="flex justify-start gap-4">
                 <span>歌曲数量：</span>
                 <span className="font-bold text-gray-800">{songs.length} 首</span>
               </div>
               <div className="flex justify-start gap-4">
                 <span>歌谱数量：</span>
                 <span className="font-bold text-gray-800">388 首</span>
               </div>
               <div className="flex justify-start gap-4">
                 <span>视频数量：</span>
                 <span className="font-bold text-gray-800">131 首</span>
               </div>
            </div>

            <div className="text-sm text-gray-500 leading-relaxed mb-8 line-clamp-3">
               <span className="font-bold text-gray-700">简介：</span>
               {artist.description || '暂无简介...'}
               <span className="text-gray-400 ml-2 cursor-pointer hover:text-blue-600" onClick={() => setActiveTab('detail')}>更多...</span>
            </div>

            <div className="flex gap-4">
               <button 
                  onClick={() => setIsFollowed(!isFollowed)}
                  className={`flex items-center gap-2 px-6 py-2 border rounded text-sm font-medium transition-colors ${
                    isFollowed 
                    ? 'bg-red-50 text-red-600 border-red-200' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
               >
                  <Heart size={16} fill={isFollowed ? "currentColor" : "none"} /> {isFollowed ? '已关注' : '关注'}
               </button>
               <button 
                  onClick={() => setIsLiked(!isLiked)}
                  className={`flex items-center gap-2 px-6 py-2 border rounded text-sm font-medium transition-colors ${
                    isLiked
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                  }`}
               >
                  <ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"} /> {isLiked ? '已点赞' : '点赞'}
               </button>
               <button 
                  onClick={handleShare}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-sm font-medium transition-colors"
               >
                  <Share2 size={16} /> 分享
               </button>
               <button 
                  onClick={handleMobileView}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600 text-sm font-medium transition-colors"
               >
                  <Smartphone size={16} /> 手机查看
               </button>
            </div>
          </div>

          {/* Right Large Logo - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex w-64 h-64 flex-shrink-0 bg-white rounded border border-gray-100 items-center justify-center p-4 shadow-sm">
             {artist.avatar ? (
                <img src={`/api/file${artist.avatar}`} alt={artist.name} className="max-w-full max-h-full object-contain" />
             ) : (
                <User size={80} className="text-gray-300" />
             )}
          </div>
        </div>
      </div>

      {/* Hot Songs Section */}
      <div className="bg-white rounded shadow-sm border-t-2 border-gray-800 mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
           <div className="flex items-end gap-4">
              <h2 className="text-lg font-bold text-gray-800">热门歌曲</h2>
           </div>
           <div className="text-xs text-gray-400">
              最新歌曲 | <span className="cursor-pointer hover:text-blue-600" onClick={() => setActiveTab('song')}>更多 &raquo;</span>
           </div>
        </div>
        
        <div className="p-4">
          <table className="w-full text-sm">
             <tbody>
               {enrichedSongs.sort((a, b) => b.stats.popularity - a.stats.popularity).slice(0, 10).map((song, index) => (
                 <tr key={song.id} className="hover:bg-gray-50 group border-b border-gray-50 last:border-0">
                    <td className="py-3 px-2 w-10 text-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </td>
                    <td className="py-3 px-2 w-10 text-gray-400 font-mono">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                         <span className="text-gray-700 font-medium group-hover:text-blue-600 cursor-pointer" onClick={(e) => handlePlay(e, song)}>
                            {song.title}
                         </span>
                         <div className="flex gap-2">
                             <PlayCircle 
                               size={16} 
                               className="text-red-500 cursor-pointer hover:scale-110 transition-transform" 
                               onClick={(e) => handlePlay(e, song)}
                             />
                         </div>
                         <span className="text-gray-400 mx-1">-</span>
                         <span className="text-gray-500">{song.album || '未分类专辑'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right w-32 text-gray-400 text-xs">
                        人气: {song.stats.popularity}
                    </td>
                    <td className="py-3 px-2 text-right w-48">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-500"><Heart size={14}/></button>
                          <button className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-500"><Share2 size={14}/></button>
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
    <div className="bg-white rounded shadow-sm border-t-2 border-gray-800 min-h-[500px] p-8">
       <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-100 pb-4">详细资料</h2>
       <div className="text-sm text-gray-600 leading-relaxed space-y-4">
          {artist.description?.split('\n').map((paragraph, idx) => (
             <p key={idx}>{paragraph}</p>
          ))}
       </div>
    </div>
  );

  const renderAlbumList = () => {
    const sortedAlbums = getSortedData(enrichedAlbums);
    
    return (
        <div className="bg-white/60 backdrop-blur-md rounded shadow-sm border border-white/60 min-h-[500px]">
           <SortBar options={['默认', '总人气', '浏览量', '收藏数', '推荐数']} showViewToggle={true} />
           
           {viewMode === 'grid' ? (
               <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-x-6 gap-y-8">
                  {sortedAlbums.map(album => (
                     <Link href={`/album/${encodeURIComponent(album.name)}`} key={album.name} className="group block">
                        <div className="aspect-square bg-gray-100 rounded shadow-sm overflow-hidden mb-3 relative mx-auto border border-gray-100">
                           {album.cover ? (
                              <img src={album.cover.startsWith('/') ? `/api/file${album.cover}` : album.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                           ) : (
                              <img src={DEFAULT_COVER} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                           )}
                           {/* Hover Play Button */}
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <PlayCircle size={48} className="text-white opacity-90 hover:scale-110 transition-transform" />
                           </div>
                        </div>
                        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 mb-1">{album.name}</div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{album.date || '2023-01-01'}</span>
                            <span className="flex items-center gap-1"><Eye size={10}/> {album.stats.views}</span>
                        </div>
                     </Link>
                  ))}
                  {sortedAlbums.length === 0 && <div className="col-span-full text-center text-gray-400 py-20">暂无专辑</div>}
               </div>
           ) : (
               <div className="p-4">
                   <table className="w-full text-sm">
                       <thead>
                           <tr className="border-b border-gray-200 text-left text-gray-500 bg-gray-50">
                               <th className="py-3 px-4 font-medium">专辑封面</th>
                               <th className="py-3 px-4 font-medium">专辑名称</th>
                               <th className="py-3 px-4 font-medium">发行时间</th>
                               <th className="py-3 px-4 font-medium text-right">热度</th>
                           </tr>
                       </thead>
                       <tbody>
                           {sortedAlbums.map(album => (
                               <tr key={album.name} className="border-b border-gray-100 hover:bg-gray-50 group">
                                   <td className="py-3 px-4 w-20">
                                       <div className="w-12 h-12 rounded overflow-hidden border border-gray-200">
                                           <img 
                                            src={album.cover && album.cover.startsWith('/') ? `/api/file${album.cover}` : (album.cover || DEFAULT_COVER)} 
                                            className="w-full h-full object-cover"
                                           />
                                       </div>
                                   </td>
                                   <td className="py-3 px-4">
                                       <Link href={`/album/${encodeURIComponent(album.name)}`} className="text-gray-800 font-medium hover:text-blue-600 block">
                                           {album.name}
                                       </Link>
                                       <div className="text-xs text-gray-400 mt-1">{album.artist}</div>
                                   </td>
                                   <td className="py-3 px-4 text-gray-500">
                                       {album.date || '2023-01-01'}
                                   </td>
                                   <td className="py-3 px-4 text-right text-gray-500">
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
    const sortedSongs = getSortedData(enrichedSongs);
    return (
        <div className="bg-white rounded shadow-sm border-t-2 border-gray-800 min-h-[500px]">
            <SortBar />
            <div className="p-4">
            <table className="w-full text-sm">
                <tbody>
                {sortedSongs.map((song, index) => (
                    <tr key={song.id} className="hover:bg-gray-50 group border-b border-gray-50 last:border-0 h-12">
                        <td className="px-2 w-10 text-center">
                        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                        </td>
                        <td className="px-2 w-10 text-gray-400 font-mono text-center">
                        {(index + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-700 group-hover:text-blue-600 cursor-pointer" onClick={(e) => handlePlay(e, song)}>
                                {song.title}
                            </span>
                            <span className="text-gray-300 mx-2">-</span>
                            <span className="text-gray-400 hover:text-blue-600 cursor-pointer">{song.album || '未分类专辑'}</span>
                        </div>
                        </td>
                        <td className="px-2 text-right text-gray-400 w-32 text-xs">
                           <div className="flex justify-end items-center gap-3">
                              <span className="flex items-center gap-1"><Eye size={12}/> {song.stats.views}</span>
                              <span className="flex items-center gap-1"><Download size={12}/> {song.stats.downloads}</span>
                           </div>
                        </td>
                        <td className="px-2 text-right w-24">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500" title="收藏"><Heart size={14}/></button>
                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500" title="点赞"><ThumbsUp size={14}/></button>
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
    const sortedVideos = getSortedData(mockVideos);
    return (
        <div className="bg-white rounded shadow-sm border-t-2 border-gray-800 min-h-[500px]">
           <SortBar options={['默认', '观看次数', '收藏数']} />
           <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              {sortedVideos.map(video => (
                 <div key={video.id} className="group cursor-pointer">
                    <div className="aspect-video bg-gray-900 rounded overflow-hidden mb-2 relative">
                       <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">{video.duration}</div>
                       {/* Overlay Play Icon */}
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-all">
                          <PlayCircle size={32} className="text-white" />
                       </div>
                       <img src={video.cover} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm text-gray-800 group-hover:text-blue-600 truncate">{video.title}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Eye size={10}/> {video.stats.views}</span>
                        <span className="flex items-center gap-1"><Heart size={10}/> {video.stats.favorites}</span>
                    </div>
                 </div>
              ))}
           </div>
        </div>
    );
  };

  const renderSheetList = () => (
    <div className="bg-white rounded shadow-sm border-t-2 border-gray-800 min-h-[500px]">
       <SortBar />
       <div className="p-6">
          {/* Mock Sheet List similar to Song List but simpler */}
          <table className="w-full text-sm">
             <tbody>
               {enrichedSongs.map((song, index) => (
                 <tr key={song.id} className="hover:bg-gray-50 group border-b border-gray-50 last:border-0 h-10">
                    <td className="px-2 w-10 text-gray-400 font-mono text-center">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="px-2">
                      <span className="text-gray-700 group-hover:text-blue-600 cursor-pointer">
                         {song.title} [简谱]
                      </span>
                    </td>
                    <td className="px-2 text-right text-gray-400 w-32">
                       {song.album}
                    </td>
                    <td className="px-2 text-right w-24">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 hover:bg-gray-200 rounded text-gray-500"><FileText size={14}/></button>
                       </div>
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12">
      {/* Top Header Info */}
      <div className="relative bg-gradient-to-r from-pink-500 to-rose-600 pb-16 pt-20 overflow-hidden text-white">
         <div className="absolute right-0 top-0 w-1/3 h-full bg-white/10 skew-x-12 transform translate-x-12"></div>
         <div className="container mx-auto px-4 text-center relative z-10">
            <div className="w-28 h-28 mx-auto bg-white/20 rounded-full overflow-hidden mb-6 border-4 border-white/30 shadow-2xl backdrop-blur-sm p-1">
               {artist.avatar ? (
                  <img src={`/api/file${artist.avatar}`} alt={artist.name} className="w-full h-full object-cover rounded-full" />
               ) : (
                  <div className="flex items-center justify-center h-full text-white/70 bg-white/10 rounded-full"><User size={48}/></div>
               )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 tracking-tight shadow-sm">{artist.name}</h1>
            <div className="text-pink-100 text-xl font-medium tracking-wide">{artist.enName}</div>
         </div>
      </div>

      {/* Sticky Navigation */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm mb-8">
         <div className="container mx-auto px-4">
            <div className="flex justify-center items-center gap-2 overflow-x-auto no-scrollbar py-2">
              {menuItems.map(item => (
                 <button
                   key={item.id}
                   onClick={() => {
                       setActiveTab(item.id);
                       setSortOption('默认'); // Reset sort when tab changes
                   }}
                   className={`px-6 py-3 text-sm font-bold rounded-full transition-all whitespace-nowrap ${
                      activeTab === item.id 
                      ? 'bg-gray-900 text-white shadow-md transform scale-105' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
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
