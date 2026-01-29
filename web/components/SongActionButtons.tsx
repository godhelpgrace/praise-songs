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
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

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
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

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
    const toast = document.createElement('div');
    toast.textContent = '已添加到播放列表';
    toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm z-[9999] animate-in fade-in slide-in-from-top-2 duration-200';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out', 'slide-out-to-top-2');
        setTimeout(() => toast.remove(), 200);
    }, 2000);
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
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all" 
          title="播放"
        >
          <PlayCircle size={16} />
        </button>
        <button 
          onClick={handleAddToQueue} 
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all" 
          title="添加到播放列表"
        >
          <ListPlus size={16} />
        </button>
        <button 
          onClick={handleDownload} 
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all" 
          title="下载"
        >
          <Download size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); }} 
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-all" 
          title="添加到歌单"
        >
          <PlusSquare size={16} />
        </button>
        <button 
          onClick={toggleLike} 
          className={`p-1.5 rounded transition-all ${isLiked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`} 
          title="点赞"
        >
          <ThumbsUp size={16} className={isLiked ? "fill-current" : ""} />
        </button>
        <button 
          onClick={toggleFavorite} 
          className={`p-1.5 rounded transition-all ${isFavorited ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`} 
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
