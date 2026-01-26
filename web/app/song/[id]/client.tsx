'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { usePlayer, Song } from '@/context/PlayerContext';
import { usePresentation } from '@/context/PresentationContext';
import { 
  PlayCircle, PauseCircle, Download, Share2, Heart, 
  Maximize2, SkipBack, SkipForward, Play, Pause, 
  Search, User, Volume2, Repeat, Trash2, Plus, X, MoreHorizontal,
  FileText, Copy, Minus, ZoomIn, Minimize2, ListMusic, Volume1, VolumeX, Clock,
  Repeat1, Shuffle, Projector
} from 'lucide-react';
import Link from 'next/link';

type Props = {
  song: any;
  lrc: string;
};

export default function SongDetailClient({ song, lrc }: Props) {
  const { 
    playSong, isPlaying, currentSong, togglePlay, currentTime, duration, 
    playlist, playNext, playPrev, seek, removeFromPlaylist, addToPlaylist,
    clearPlaylist, volume, setVolume, playMode, togglePlayMode, replacePlaylist
  } = usePlayer();
  const { addItem, isInList } = usePresentation();
  
  const lrcRef = useRef<HTMLDivElement>(null);
  const isCurrentSong = currentSong?.id === song.id;
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  
  // UI State
  const [fontSize, setFontSize] = useState(16); // Base font size
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiked, setIsLiked] = useState(false); // Local mock state
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Random Listen
  const handleRandomListen = async () => {
    try {
      const res = await fetch('/api/songs/random?limit=50');
      if (!res.ok) throw new Error('Failed to fetch random songs');
      const songs = await res.json();
      
      const playerSongs = songs.map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        cover: s.files.image ? `/api/file${s.files.image}` : undefined,
        src: `/api/file${s.files.audio}`,
        // Note: lrc content is missing here, client needs to handle fetching or we just skip lyrics for now
        // Ideally backend should return lrc path and client fetches it on play.
        // Or we pass the path as a custom property?
        // PlayerContext Song type has `lrc?: string`.
        // We can pass lrc path in a different way if we modify Song type, but let's keep it simple.
        // We will just pass undefined for now, and maybe update PlayerContext to fetch?
        // Actually, let's rely on the fact that we are "just listening" :)
        // Or we can modify Song type to include `lrcPath` and update PlayerContext to fetch.
        lrcPath: s.files.lrc ? `/api/file${s.files.lrc}` : undefined
      }));

      replacePlaylist(playerSongs);
    } catch (e) {
      console.error(e);
      alert('获取随机歌曲失败');
    }
  };

  // Save Playlist
  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) return;
    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: playlistName,
          songs: playlist // Save current playlist
        })
      });
      
      if (res.ok) {
        alert('歌单保存成功');
        setShowPlaylistModal(false);
        setPlaylistName('');
      } else {
        throw new Error('Failed');
      }
    } catch (e) {
      alert('保存失败');
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Listen to fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle Search
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value.trim();
      if (!query) return;
      
      // If we have an opener (main window), redirect it
      if (window.opener && !window.opener.closed) {
        window.opener.location.href = `/search?q=${encodeURIComponent(query)}`;
        window.opener.focus();
      } else {
        // Otherwise open a new window/tab for search
        window.open(`/search?q=${encodeURIComponent(query)}`, '_blank');
      }
    }
  };

  // Auto-play if not playing this song
  useEffect(() => {
    // Only play if we have a valid song ID and it's different from current
    // Or if it's the same ID but not playing (e.g. initial load)
    if (song.id && (currentSong?.id !== song.id || !isPlaying)) {
      playSong({
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover: song.files.image ? `/api/file${song.files.image}` : undefined,
        src: `/api/file${song.files.audio}`,
        lrc: lrc
      });
    }
  }, [song.id]);

  // Parse LRC
  const parsedLrc = useMemo(() => {
    const lyricsToParse = isCurrentSong && currentSong?.lrc ? currentSong.lrc : lrc;
    if (!lyricsToParse) return [];
    const lines = lyricsToParse.split('\n');
    const result = lines.map((line, index) => {
      const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const milliseconds = parseInt(match[3]);
        const time = minutes * 60 + seconds + milliseconds / 1000;
        return { id: `line-${index}`, time, text: match[4].trim() };
      }
      return null;
    }).filter(Boolean) as {id: string, time: number, text: string}[];
    return result;
  }, [lrc, currentSong, isCurrentSong]);

  // Optimize scrolling with scrollIntoView
  const scrollToActiveLine = useCallback((index: number) => {
    if (index === -1 || !lrcRef.current) return;
    const lineId = `lyric-line-${index}`;
    const activeElement = document.getElementById(lineId);
    
    if (activeElement) {
      activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (!parsedLrc.length) return;
    const index = parsedLrc.findIndex((line, i) => {
      const nextLine = parsedLrc[i + 1];
      return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
    });
    
    if (index !== activeLineIndex) {
      setActiveLineIndex(index);
      requestAnimationFrame(() => scrollToActiveLine(index));
    }
  }, [currentTime, parsedLrc, activeLineIndex, scrollToActiveLine]);

  const coverUrl = currentSong?.cover || (song.files.image ? `/api/file${song.files.image}` : '/images/default_cover.png');
  const displayTitle = currentSong?.title || song.title;
  const displayArtist = currentSong?.artist || song.artist;

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!currentSong?.src) return;
    const link = document.createElement('a');
    link.href = currentSong.src;
    link.download = `${currentSong.title || 'song'}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    alert('已复制链接到剪贴板 (模拟分享到微信)');
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#1e1b4b] to-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Top Header Bar (Dark Gray) - Hide in fullscreen */}
      {!isFullscreen && (
      <div className="h-16 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 text-white shrink-0 border-b border-white/10">
        {/* Playback Controls */}
        <div className="flex items-center gap-6">
          <button onClick={playPrev} className="hover:text-gray-200"><SkipBack size={24} /></button>
          <button 
            onClick={togglePlay}
            className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
          <button onClick={playNext} className="hover:text-gray-200"><SkipForward size={24} /></button>
          
          <div className="flex items-center gap-2 ml-4">
            <button onClick={togglePlayMode} className="text-gray-300 hover:text-white" title={playMode === 'sequence' ? '顺序播放' : playMode === 'single' ? '单曲循环' : '随机播放'}>
              {playMode === 'sequence' && <Repeat size={18} />}
              {playMode === 'single' && <Repeat1 size={18} />}
              {playMode === 'shuffle' && <Shuffle size={18} />}
            </button>
            
            {/* Volume Control */}
            <div className="flex items-center gap-2 w-32 group">
              <button onClick={() => setVolume(volume === 0 ? 1 : 0)}>
                {volume === 0 ? <VolumeX size={18} className="text-gray-300" /> : <Volume2 size={18} className="text-gray-300" />}
              </button>
              <div 
                className="h-8 flex items-center flex-1 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const newVol = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setVolume(newVol);
                }}
              >
                <div className="h-1 bg-gray-400 w-full rounded-full relative">
                  <div 
                    className="absolute left-0 top-0 h-full bg-white rounded-full" 
                    style={{ width: `${volume * 100}%` }}
                  ></div>
                  <div 
                    className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${volume * 100}%`, marginLeft: '-6px' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & User */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="请输入搜索关键字" 
              onKeyDown={handleSearch}
              className="bg-transparent border-b border-gray-300 text-sm px-2 py-1 placeholder-gray-200 focus:outline-none focus:border-white w-48"
            />
            <Search size={16} className="absolute right-0 top-1.5 text-gray-200 cursor-pointer hover:text-white" />
          </div>
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
            <User size={18} />
          </div>
        </div>
      </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden pt-4">
        
        {/* Left Sidebar (Playlist & Current Song) */}
        <div className="w-[320px] bg-white/5 backdrop-blur-md flex flex-col border-r border-white/10 shrink-0">
          
          {/* Current Song Box */}
          <div className="p-4 bg-white/5 backdrop-blur-md m-4 rounded shadow-sm relative border border-white/10">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-white/5 rounded shrink-0 overflow-hidden">
                <img src={coverUrl} alt={displayTitle} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h2 className="font-bold text-gray-200 text-sm truncate pr-2">{displayTitle}</h2>
                  <span className="text-xs text-gray-500">- {displayArtist}</span>
                </div>
                
                {/* Mini Progress */}
                <div className="mt-3 h-4 flex items-center cursor-pointer group/progress" onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   if (duration && isFinite(duration)) {
                     seek((e.clientX - rect.left) / rect.width * duration);
                   }
                }}>
                  <div className="w-full h-1 bg-gray-200 rounded-full relative">
                    <div 
                      className="absolute h-full bg-gray-500 rounded-full transition-all duration-100" 
                      style={{width: `${duration ? (currentTime/duration)*100 : 0}%`}}
                    ></div>
                    {/* Progress Thumb */}
                    <div 
                      className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-gray-600 rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity"
                      style={{ left: `${duration ? (currentTime/duration)*100 : 0}%`, marginLeft: '-6px' }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-2 text-[10px] text-gray-500">
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        addItem({
                          id: song.id,
                          title: song.title,
                          sheetUrl: song.files.image ? `/api/file${song.files.image}` : '/images/default_cover.png'
                        });
                      }} 
                      title="加入演示"
                    >
                      <Projector size={12} className={`hover:text-blue-600 cursor-pointer ${isInList(song.id) ? 'text-blue-600' : ''}`} />
                    </button>
                    <button onClick={handleDownload} title="下载">
                      <Download size={12} className="hover:text-blue-600 cursor-pointer" />
                    </button>
                    <button onClick={() => setIsLiked(!isLiked)} title="点赞">
                      <Heart 
                        size={12} 
                        className={`cursor-pointer ${isLiked ? 'text-red-500 fill-red-500' : 'hover:text-red-500'}`} 
                      />
                    </button>
                    <button onClick={handleShare} title="分享微信">
                      <Share2 size={12} className="hover:text-green-600 cursor-pointer" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Playlist Header */}
          <div className="px-4 py-2 flex justify-between items-center bg-white/5 text-xs text-gray-400 font-medium border-b border-white/5">
            <span>播放列表</span>
            <button onClick={clearPlaylist} className="hover:text-red-400"><Trash2 size={14} /></button>
          </div>

          {/* Playlist Items */}
          <div className="flex-1 overflow-y-auto">
            {playlist.map((item) => (
              <div 
                key={item.id} 
                className={`group flex items-center justify-between px-4 py-2 text-xs border-b border-white/5 hover:bg-white/10 ${currentSong?.id === item.id ? 'bg-white/10' : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => playSong(item)}>
                  {currentSong?.id === item.id && <span className="w-0.5 h-3 bg-blue-500 block shrink-0"></span>}
                  <span className={`truncate ${currentSong?.id === item.id ? 'text-blue-400 font-bold' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {item.title}
                  </span>
                </div>
                
                <span className="text-gray-500 w-20 truncate text-right group-hover:hidden">{item.artist}</span>
                
                {/* Hover Actions */}
                <div className="hidden group-hover:flex items-center gap-2 pl-2 bg-transparent">
                  <button onClick={(e) => { e.stopPropagation(); addToPlaylist(item); }} title="添加到歌单" className="text-gray-400 hover:text-white"><Plus size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); removeFromPlaylist(item.id); }} title="删除" className="text-gray-400 hover:text-red-400"><X size={14} /></button>
                  <Link href={`/song/${item.id}`} className="text-gray-400 hover:text-white"><MoreHorizontal size={14} /></Link>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="bg-white/5 p-2 border-t border-white/10 text-[10px] flex justify-around text-gray-400">
             <button onClick={handleRandomListen} className="flex flex-col items-center gap-1 hover:text-white">
               <div className="w-4 h-4 border border-gray-500 rounded flex items-center justify-center">
                 <PlayCircle size={10} />
               </div>
               随便听听
             </button>
             <button onClick={() => setShowPlaylistModal(true)} className="flex flex-col items-center gap-1 hover:text-white">
               <div className="w-4 h-4 border border-gray-500 rounded flex items-center justify-center">
                  <Heart size={10} />
               </div>
               收藏歌单
             </button>
          </div>
        </div>

        {/* Playlist Modal */}
        {showPlaylistModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-slate-800 rounded-lg p-6 w-80 text-white shadow-xl border border-white/10">
              <h3 className="font-bold text-lg mb-4">保存歌单</h3>
              <input 
                type="text" 
                placeholder="请输入歌单名称" 
                className="w-full bg-black/20 border border-white/10 p-2 rounded mb-4 text-white focus:outline-none focus:border-indigo-500"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowPlaylistModal(false)} className="px-4 py-2 text-slate-400 hover:bg-white/10 rounded">取消</button>
                <button onClick={handleSavePlaylist} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">保存</button>
              </div>
            </div>
          </div>
        )}

        {/* Right Content (Lyrics) */}
        <div className="flex-1 bg-white/5 backdrop-blur-md flex flex-col relative border-l border-white/10">
          
          {/* Lyrics Toolbar */}
          <div className="absolute top-4 right-4 flex items-center gap-4 text-slate-400 text-xs z-10">
             <button onClick={() => setFontSize(s => Math.max(12, s - 2))} className="hover:text-white">A-</button>
             <button onClick={() => setFontSize(s => Math.min(36, s + 2))} className="hover:text-white">A+</button>
             <button 
               onClick={toggleFullscreen} 
               className="hover:text-white flex items-center gap-1"
             >
               {isFullscreen ? (
                 <><Minimize2 size={14} /> 退出全屏</>
               ) : (
                 <><Maximize2 size={14} /> 全屏模式</>
               )}
             </button>
          </div>

          {/* Lyrics Container */}
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center py-[50vh] scroll-smooth" ref={lrcRef}>
             <div className="text-center mb-12">
               <h1 className="font-medium text-white mb-2" style={{ fontSize: `${fontSize * 1.5}px` }}>《{displayTitle}》</h1>
               <div className="text-slate-400 space-y-1" style={{ fontSize: `${fontSize * 0.875}px` }}>
                 <p>词/曲：{displayArtist}</p>
                 <p>演唱：{displayArtist}</p>
                 <p>专辑：{song.album || '未分类'}</p>
               </div>
             </div>

             <div className="w-full max-w-xl text-center space-y-6 pb-40">
                {parsedLrc.length > 0 ? (
                  parsedLrc.map((line, i) => {
                    const isActive = activeLineIndex === i;
                    return (
                      <p 
                        key={i} 
                        id={`lyric-line-${i}`}
                        className={`transition-all duration-300 cursor-pointer ${isActive ? 'text-indigo-400 font-bold scale-105' : 'text-slate-500 hover:text-slate-300'}`}
                        style={{ 
                          fontSize: isActive ? `${fontSize * 1.25}px` : `${fontSize}px` 
                        }}
                        onClick={() => seek(line.time)}
                      >
                        {line.text}
                      </p>
                    );
                  })
                ) : (
                  <div className="text-slate-600 text-sm">暂无歌词</div>
                )}
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
