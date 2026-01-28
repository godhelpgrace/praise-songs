'use client';

import { useState } from 'react';
import { PlayCircle, Download, ListPlus, PlusSquare, Heart, ThumbsUp, Check } from 'lucide-react';
import AddToPlaylistModal from './AddToPlaylistModal';

type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  files: {
    audio?: string;
    image?: string;
    lrc?: string;
    sheet?: string;
  };
};

type Props = {
  song: Song;
  className?: string;
};

export default function SongActionButtons({ song, className = '' }: Props) {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if player window is active via localStorage heartbeat
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    if (!isActive) {
      // Case 1: New Window - Open directly with URL
      const playerWin = window.open(
        `/song/${song.id}`, 
        'music_player_window'
      );
      
      if (!playerWin) {
        alert('请允许本站弹出窗口以播放音乐');
      }
    } else {
      // Case 2: Existing Window - Focus and send message
      const playerWin = window.open('', 'music_player_window');
      if (playerWin) playerWin.focus();

      // Existing window: fetch lyrics and send message
      (async () => {
        let lrc = undefined;
        if (song.files.lrc) {
          try {
            const res = await fetch(`/api/file${song.files.lrc}`);
            if (res.ok) lrc = await res.text();
          } catch(e) {
            console.error('Failed to fetch lyrics', e);
          }
        }

        const playerSong = {
          id: song.id,
          title: song.title,
          artist: song.artist,
          cover: song.files.image ? `/api/file${song.files.image}` : undefined,
          src: `/api/file${song.files.audio}`,
          lrc: lrc
        };

        const channel = new BroadcastChannel('music_player_channel');
        channel.postMessage({ type: 'PLAY_SONG', song: playerSong });
        channel.close();
      })();
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.files?.audio) return;
    
    // Create a temporary link
    const link = document.createElement('a');
    link.href = `/api/file${song.files.audio}`;
    link.download = `${song.title}-${song.artist}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if player window is active via localStorage heartbeat
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    if (!isActive) {
       // If player not active, open it and play
       handlePlay(e);
       return;
    }

    const playerSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover: song.files.image ? `/api/file${song.files.image}` : undefined,
        src: song.files.audio ? `/api/file${song.files.audio}` : undefined,
        lrcPath: song.files.lrc ? `/api/file${song.files.lrc}` : undefined
    };

    const channel = new BroadcastChannel('music_player_channel');
    channel.postMessage({ 
      type: 'ADD_TO_QUEUE', 
      song: playerSong
    });
    channel.close();
    
    // Show simple feedback
    // alert('已添加到播放列表');
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    // TODO: Call API
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorited(!isFavorited);
    // TODO: Call API
  };

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        <button 
          onClick={handlePlay} 
          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" 
          title="播放"
        >
          <PlayCircle size={16} />
        </button>
        <button 
          onClick={handleAddToQueue} 
          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" 
          title="添加到播放列表"
        >
          <ListPlus size={16} />
        </button>
        <button 
          onClick={handleDownload} 
          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" 
          title="下载"
        >
          <Download size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); }} 
          className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 transition-all" 
          title="添加到歌单"
        >
          <PlusSquare size={16} />
        </button>
        <button 
          onClick={toggleLike} 
          className={`p-1.5 rounded border border-transparent transition-all ${isLiked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100'}`} 
          title="点赞"
        >
          <ThumbsUp size={16} className={isLiked ? "fill-current" : ""} />
        </button>
        <button 
          onClick={toggleFavorite} 
          className={`p-1.5 rounded border border-transparent transition-all ${isFavorited ? 'text-pink-500 bg-pink-50' : 'text-slate-400 hover:text-pink-500 hover:bg-pink-50 hover:border-pink-100'}`} 
          title="收藏"
        >
          <Heart size={16} className={isFavorited ? "fill-current" : ""} />
        </button>
      </div>

      <AddToPlaylistModal 
        isOpen={showPlaylistModal} 
        onClose={() => setShowPlaylistModal(false)} 
        song={song} 
      />
    </>
  );
}
