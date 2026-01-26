'use client';

import { usePlayer } from '@/context/PlayerContext';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Player() {
  const { currentSong, isPlaying, togglePlay, currentTime, duration, playNext, playPrev, seek } = usePlayer();
  const pathname = usePathname();

  // Hide player on song detail page
  if (pathname.startsWith('/song/')) {
    return null;
  }

  if (!currentSong) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(pos * duration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 h-20">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        
        {/* Song Info */}
        <div className="flex items-center w-1/4 gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
            {currentSong.cover ? (
              <img src={currentSong.cover} alt={currentSong.title} className="w-full h-full object-cover" />
            ) : (
              <img src="/images/default_cover.png" alt={currentSong.title} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-gray-800 truncate">{currentSong.title}</div>
            <div className="text-xs text-gray-500 truncate">{currentSong.artist}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-2/4">
          <div className="flex items-center gap-6 mb-1">
            <button onClick={playPrev} className="text-gray-400 hover:text-blue-600"><SkipBack size={20} /></button>
            <button 
              onClick={togglePlay}
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
            </button>
            <button onClick={playNext} className="text-gray-400 hover:text-blue-600"><SkipForward size={20} /></button>
          </div>
          <div className="w-full max-w-md flex items-center gap-3 text-xs text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <div 
              className="flex-1 h-1 bg-gray-200 rounded-full relative group cursor-pointer"
              onClick={handleProgressClick}
            >
              <div 
                className="absolute left-0 top-0 h-full bg-blue-600 rounded-full" 
                style={{ width: `${progress}%` }}
              />
              {/* Hover thumb */}
              <div 
                className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                style={{ left: `${progress}%`, marginLeft: '-6px' }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume / Extras */}
        <div className="w-1/4 flex justify-end items-center gap-4">
           <div className="flex items-center gap-2 w-32">
             <Volume2 size={18} className="text-gray-400" />
             <div className="flex-1 h-1 bg-gray-200 rounded-full cursor-pointer">
               <div className="w-3/4 h-full bg-gray-400 rounded-full"></div>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
