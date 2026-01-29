'use client';

import { PlayCircle, Heart, ThumbsUp, Share2, Smartphone, ListMusic, Disc, Download, FileText, PlusSquare, Headphones, AlignLeft, Edit2, Check, X, Trash2, Plus, Minus, Projector, Eye, Settings, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePresentation } from '@/context/PresentationContext';
import Link from 'next/link';
import { detectCategoryFromFilename, normalizeCategory } from '@/utils/sheetUtils';

type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  files: {
    audio?: string;
    sheet?: string | string[];
    sheets?: string[];
    lrc?: string;
    image?: string;
  };
  cover?: string;
};

type Playlist = {
  id: string;
  title: string;
  songs: Song[];
  created_at: string;
  creator?: string;
  description?: string;
  tags?: string[];
  cover?: string;
};

type Props = {
  playlist: Playlist;
  allSongs: Song[];
};

export default function PlaylistDetailClient({ playlist, allSongs }: Props) {
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [metadata, setMetadata] = useState({
    title: playlist.title,
    creator: playlist.creator || '赞美吧编辑精选',
    description: playlist.description || '暂无',
    tags: playlist.tags || []
  });
  const [tempMetadata, setTempMetadata] = useState(metadata);
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>(playlist.songs);
  
  const [favoritedSongs, setFavoritedSongs] = useState<Set<string>>(new Set());
  const [likedSongs, setLikedSongs] = useState<Set<string>>(new Set());
  const [isPlaylistFavorited, setIsPlaylistFavorited] = useState(false);
  const [isPlaylistLiked, setIsPlaylistLiked] = useState(false);
  
  const [showAddSongModal, setShowAddSongModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [songsToAdd, setSongsToAdd] = useState<Set<string>>(new Set());
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerUrl, setPlayerUrl] = useState('');
  
  // Presentation & Conflict Handling
  const { addItem, clearList } = usePresentation();
  const [conflictQueue, setConflictQueue] = useState<{song: Song, sheets: string[]}[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<{song: Song, sheets: string[]} | null>(null);
  
  // New State for Preview & Preference Management
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPrefManager, setShowPrefManager] = useState(false);
  const [prefList, setPrefList] = useState<{song: Song, currentSheet: string}[]>([]);

  const router = useRouter();

  const coverUrl = playlist.cover || playlistSongs[0]?.cover || (playlistSongs[0]?.files?.image ? `/api/file${playlistSongs[0]?.files?.image}` : undefined);

  const handleEdit = () => {
    setTempMetadata(metadata);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
        const res = await fetch(`/api/playlist/${playlist.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...tempMetadata,
                songs: playlistSongs
            })
        });

        if (res.ok) {
            setMetadata(tempMetadata);
            setIsEditing(false);
            router.refresh();
        } else {
            alert('保存失败');
        }
    } catch (e) {
        alert('保存出错');
    }
  };

  const handleDeletePlaylist = async () => {
      if (!confirm('确定要删除这个歌单吗？此操作不可恢复。')) return;
      try {
          const res = await fetch(`/api/playlist/${playlist.id}`, { method: 'DELETE' });
          if (res.ok) {
              router.push('/playlist');
          } else {
              const data = await res.json().catch(() => null);
              alert(data?.error || '删除失败');
          }
      } catch (e) {
          alert('删除出错');
      }
  };

  const handleRemoveSong = (songId: string) => {
      if (!confirm('确定要从歌单中移除这首歌曲吗？')) return;
      const newSongs = playlistSongs.filter(s => s.id !== songId);
      setPlaylistSongs(newSongs);
      
      if (!isEditing) {
          fetch(`/api/playlist/${playlist.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...metadata,
                songs: newSongs
            })
        }).then(res => {
            if (res.ok) router.refresh();
        });
      }
  };

  const handleAddSongs = () => {
      const selected = allSongs.filter(s => songsToAdd.has(s.id));
      const newSongs = [...playlistSongs];
      selected.forEach(s => {
          if (!newSongs.find(exist => exist.id === s.id)) {
              newSongs.push(s);
          }
      });
      setPlaylistSongs(newSongs);
      setShowAddSongModal(false);
      setSongsToAdd(new Set());

      if (!isEditing) {
        fetch(`/api/playlist/${playlist.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              ...metadata,
              songs: newSongs
          })
      }).then(res => {
          if (res.ok) router.refresh();
      });
    }
  };

  const filteredAllSongs = allSongs.filter(s => 
      !playlistSongs.find(ps => ps.id === s.id) && 
      (s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCancel = () => {
    setIsEditing(false);
  };

  const toggleSelectAll = () => {
    if (selectedSongs.size === playlistSongs.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(playlistSongs.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedSongs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSongs(newSet);
  };

  const handlePlayAll = () => {
    if (playlistSongs.length === 0) return;
    
    const firstSong = playlistSongs[0];
    
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

    setPlayerUrl(`/song/${firstSong.id}`);
    setShowPlayer(true);
    
    setTimeout(() => {
      const channel = new BroadcastChannel('music_player_channel');
      const playerSongs = playlistSongs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      cover: s.cover || (s.files?.image ? `/api/file${s.files.image}` : undefined),
      src: s.files?.audio ? `/api/file${s.files.audio}` : undefined,
      lrcPath: s.files?.lrc ? `/api/file${s.files.lrc}` : undefined
    }));
      channel.postMessage({ type: 'REPLACE_PLAYLIST', songs: playerSongs });
      channel.close();
    }, 2000);
  };

  const handlePlay = (song: Song) => {
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

    const playerSongs = playlistSongs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        cover: s.cover || (s.files?.image ? `/api/file${s.files.image}` : undefined),
        src: s.files?.audio ? `/api/file${s.files.audio}` : undefined,
        lrcPath: s.files?.lrc ? `/api/file${s.files.lrc}` : undefined
    }));

    if (!isActive) {
        window.open(`/song/${song.id}`, 'music_player_window');
    } else {
        const channel = new BroadcastChannel('music_player_channel');
        channel.postMessage({ 
          type: 'PLAY_SONG', 
          song: {
             id: song.id,
             title: song.title,
             artist: song.artist,
             cover: song.cover || (song.files?.image ? `/api/file${song.files.image}` : undefined),
             src: song.files?.audio ? `/api/file${song.files.audio}` : undefined,
             lrcPath: song.files?.lrc ? `/api/file${song.files.lrc}` : undefined
          }
        });
        channel.postMessage({ type: 'REPLACE_PLAYLIST', songs: playerSongs });
        channel.close();
    }
  };

  const handleAddToPlaylist = (song: Song) => {
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

    const playerSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover: song.cover || (song.files?.image ? `/api/file${song.files.image}` : undefined),
        src: song.files?.audio ? `/api/file${song.files.audio}` : undefined,
        lrcPath: song.files?.lrc ? `/api/file${song.files.lrc}` : undefined
    };

    if (!isActive && !showPlayer) {
       handlePlay(song);
    } else {
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
    }
  };

  const handleDownload = async (song: Song) => {
    if (!song.files?.audio) return;
    const downloadUrl = `/api/file${song.files.audio}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${song.title}-${song.artist}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = (song: Song) => {
    const url = `${window.location.origin}/song/${song.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('链接已复制到剪贴板');
    });
  };

  const handleLike = (songId: string) => {
    const newLiked = new Set(likedSongs);
    if (newLiked.has(songId)) {
      newLiked.delete(songId);
    } else {
      newLiked.add(songId);
    }
    setLikedSongs(newLiked);
  };

  const handleFavorite = (songId: string) => {
    const newFavorited = new Set(favoritedSongs);
    if (newFavorited.has(songId)) {
      newFavorited.delete(songId);
    } else {
      newFavorited.add(songId);
    }
    setFavoritedSongs(newFavorited);
  };

  const handleSharePlaylist = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      alert('歌单链接已复制到剪贴板');
    });
  };

  const handleFavoritePlaylist = () => {
    setIsPlaylistFavorited(!isPlaylistFavorited);
  };

  const handleLikePlaylist = () => {
    setIsPlaylistLiked(!isPlaylistLiked);
  };

  // --- Presentation Logic ---
  
  const getChordSheets = (song: Song): string[] => {
    const allSheets = new Set<string>();
    
    if (song.files?.sheet) {
      if (Array.isArray(song.files.sheet)) {
        song.files.sheet.forEach(s => allSheets.add(s));
      } else {
        allSheets.add(song.files.sheet);
      }
    }
    
    if (song.files?.sheets && Array.isArray(song.files.sheets)) {
      song.files.sheets.forEach(s => allSheets.add(s));
    }
    
    const sheets = Array.from(allSheets);
      
    return sheets.filter(path => {
       const cat = detectCategoryFromFilename(path);
       return normalizeCategory(cat) === '和弦谱';
    });
  };

  const handleGeneratePresentation = () => {
    const queue: {song: Song, sheets: string[]}[] = [];
    let addedCount = 0;
    
    clearList();
    
    playlistSongs.forEach(song => {
      const chordSheets = getChordSheets(song);
      
      if (chordSheets.length === 0) return;
      
      if (chordSheets.length === 1) {
        addItem({
          id: song.id,
          title: song.title,
          sheetUrl: `/api/file${chordSheets[0]}`
        });
        addedCount++;
      } else {
        const prefKey = `sheet_pref_${song.id}`;
        const pref = localStorage.getItem(prefKey);
        
        if (pref && chordSheets.includes(pref)) {
          addItem({
            id: song.id,
            title: song.title,
            sheetUrl: `/api/file${pref}`
          });
          addedCount++;
        } else {
          queue.push({ song, sheets: chordSheets });
        }
      }
    });
    
    if (queue.length > 0) {
      setConflictQueue(queue);
      setCurrentConflict(queue[0]);
      setShowConflictModal(true);
    } else {
        if (addedCount > 0) {
            router.push('/presentation');
        } else {
            alert('未找到符合条件的和弦谱');
        }
    }
  };

  const handleResolveConflict = (sheetPath: string) => {
    if (!currentConflict) return;
    
    localStorage.setItem(`sheet_pref_${currentConflict.song.id}`, sheetPath);
    
    addItem({
      id: currentConflict.song.id,
      title: currentConflict.song.title,
      sheetUrl: `/api/file${sheetPath}`
    });
    
    const nextQueue = conflictQueue.slice(1);
    setConflictQueue(nextQueue);
    
    if (nextQueue.length > 0) {
      setCurrentConflict(nextQueue[0]);
    } else {
      setShowConflictModal(false);
      setCurrentConflict(null);
      router.push('/presentation');
    }
  };

  // --- Preference Manager Logic ---

  const handleOpenPrefManager = () => {
    const list: {song: Song, currentSheet: string}[] = [];
    playlistSongs.forEach(song => {
      const prefKey = `sheet_pref_${song.id}`;
      const pref = localStorage.getItem(prefKey);
      if (pref) {
        list.push({ song, currentSheet: pref });
      }
    });
    setPrefList(list);
    setShowPrefManager(true);
  };

  const handleRemovePref = (songId: string) => {
    localStorage.removeItem(`sheet_pref_${songId}`);
    setPrefList(prev => prev.filter(item => item.song.id !== songId));
  };

  const handleChangePref = (item: {song: Song, currentSheet: string}) => {
    handleRemovePref(item.song.id);
    const sheets = getChordSheets(item.song);
    setConflictQueue([{ song: item.song, sheets }]);
    setCurrentConflict({ song: item.song, sheets });
    setShowPrefManager(false);
    setShowConflictModal(true);
  };

  return (
    <div className="w-full">
      {/* Breadcrumbs */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
         <Link href="/" className="hover:text-primary transition-colors">赞美吧</Link>
         <span>&gt;</span>
         <Link href="/playlist" className="hover:text-primary transition-colors">歌单</Link>
         <span>&gt;</span>
         <span className="text-foreground">{playlist.title}</span>
      </div>

      {/* Header Info Section - Redesigned */}
      <div className="bg-card/50 backdrop-blur-xl p-6 rounded-2xl shadow-xl mb-6 flex flex-col md:flex-row gap-8 border border-border relative overflow-hidden group">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

          {/* Cover Image */}
          <div className="w-64 h-64 shrink-0 relative rounded-xl overflow-hidden shadow-2xl border border-border group-cover">
             {coverUrl ? (
               <img src={coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full bg-muted/50 flex items-center justify-center text-muted-foreground">
                  <ListMusic size={64} />
               </div>
             )}
             <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 {/* Maybe upload cover trigger if I add that later, currently not in this file */}
             </div>
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col z-10">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded shadow-lg shadow-primary/20">歌单</span>
                   {isEditing ? (
                       <input 
                         type="text"
                         value={tempMetadata.title}
                         onChange={(e) => setTempMetadata({...tempMetadata, title: e.target.value})}
                         className="bg-muted border border-border rounded px-3 py-1 text-2xl font-bold text-foreground focus:outline-none focus:border-primary w-full"
                         autoFocus
                       />
                   ) : (
                       <h1 className="text-3xl font-bold text-foreground">{metadata.title}</h1>
                   )}
                </div>
             </div>

             {/* Metadata Grid */}
             <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground mb-6 max-w-lg">
                <div className="flex gap-2 items-center">
                   <span className="text-muted-foreground">创建者：</span>
                   {isEditing ? (
                      <input 
                        type="text"
                        value={tempMetadata.creator}
                        onChange={(e) => setTempMetadata({...tempMetadata, creator: e.target.value})}
                        className="bg-muted border border-border rounded px-2 py-0.5 text-xs text-foreground focus:outline-none w-32"
                      />
                   ) : (
                      <span className="text-foreground">{metadata.creator}</span>
                   )}
                </div>
                 <div className="flex gap-2 items-center">
                   <span className="text-muted-foreground">歌曲数：</span>
                   <span className="text-foreground">{playlistSongs.length} 首</span>
                </div>
                <div className="flex gap-2 items-center col-span-2">
                   <span className="text-muted-foreground">标签：</span>
                   {isEditing ? (
                      <input 
                        type="text"
                        value={tempMetadata.tags.join(', ')}
                        onChange={(e) => setTempMetadata({...tempMetadata, tags: e.target.value.split(/,\s*/).filter(t => t.trim())})}
                        className="bg-muted border border-border rounded px-2 py-0.5 text-xs text-foreground focus:outline-none w-64"
                        placeholder="标签以逗号分隔"
                      />
                   ) : (
                      <div className="flex gap-2">
                         {metadata.tags?.map((tag, idx) => <span key={idx} className="bg-muted px-2 py-0.5 rounded text-xs text-primary">#{tag}</span>)}
                      </div>
                   )}
                </div>
             </div>
             
             {/* Description */}
             <div className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                 {isEditing ? (
                    <textarea
                      value={tempMetadata.description}
                      onChange={(e) => setTempMetadata({...tempMetadata, description: e.target.value})}
                      className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none h-24 resize-none"
                    />
                 ) : (
                    metadata.description || "暂无简介"
                 )}
             </div>

             {/* Actions Toolbar */}
             {!isEditing ? (
                 <div className="flex flex-wrap gap-3">
                     <button onClick={handlePlayAll} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        <PlayCircle size={20} /> 播放全部
                     </button>
                     <button onClick={handleEdit} className="border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
                        <Edit2 size={16} /> 编辑
                     </button>
                     <button onClick={handleGeneratePresentation} className="border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-all" title="生成演示列表">
                        <Projector size={16} /> 演示
                     </button>
                     <button onClick={handleOpenPrefManager} className="border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-all" title="歌谱偏好">
                        <Settings size={16} /> 偏好
                     </button>
                     <button onClick={handleSharePlaylist} className="border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
                        <Share2 size={16} /> 分享
                     </button>
                     <button onClick={handleDeletePlaylist} className="border border-border bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive hover:border-destructive/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-all ml-auto">
                        <Trash2 size={16} /> 删除
                     </button>
                 </div>
             ) : (
                <div className="flex gap-3 mt-4">
                   <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                      <Check size={18} /> 保存更改
                   </button>
                   <button onClick={handleCancel} className="bg-muted hover:bg-muted/80 text-foreground px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all">
                      <X size={18} /> 取消
                   </button>
                </div>
             )}
          </div>
      </div>

      {/* Song List */}
      <div className="bg-card/50 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-border min-h-[400px]">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">歌曲列表</h2>
              <button 
                  onClick={() => setShowAddSongModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
              >
                  <Plus size={16} /> 添加歌曲
              </button>
          </div>
          
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-muted-foreground">
              <thead>
                <tr className="border-b border-border bg-card/50 text-muted-foreground font-normal">
                  <th className="py-4 pl-6 w-12 text-center font-normal">
                    <input 
                      type="checkbox" 
                      checked={playlistSongs.length > 0 && selectedSongs.size === playlistSongs.length}
                      onChange={toggleSelectAll}
                      className="rounded border-border bg-muted text-primary focus:ring-primary w-4 h-4"
                    />
                  </th>
                  <th className="py-4 w-16 text-center font-normal">序号</th>
                  <th className="py-4 pl-4 text-left font-normal">歌曲标题</th>
                  <th className="py-4 pr-6 text-right font-normal">操作</th>
                </tr>
              </thead>
              <tbody>
              {playlistSongs.length === 0 ? (
                  <tr>
                      <td colSpan={4} className="py-20 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-4">
                              <ListMusic size={48} className="opacity-20" />
                              <p>歌单暂无歌曲，快去添加吧</p>
                          </div>
                      </td>
                  </tr>
              ) : (
                  playlistSongs.map((song, index) => (
                    <tr key={song.id} className="hover:bg-muted/30 group border-b border-dashed border-border last:border-0 transition-colors">
                      <td className="py-4 pl-6 w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedSongs.has(song.id)}
                          onChange={() => toggleSelect(song.id)}
                          className="rounded border-border bg-muted text-primary focus:ring-primary w-4 h-4"
                        />
                      </td>
                      <td className="py-4 w-16 text-center font-mono text-muted-foreground text-xs">
                        {(index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                              {song.cover || (song.files?.image ? `/api/file${song.files.image}` : null) ? (
                                  <img src={song.cover || (song.files?.image ? `/api/file${song.files.image}` : '')} alt={song.title} className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Disc size={20} /></div>
                              )}
                          </div>
                          <div>
                              <div className="text-foreground font-bold text-sm truncate max-w-[300px]">{song.title}</div>
                              <div className="text-muted-foreground text-xs truncate max-w-[200px]">{song.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handlePlay(song)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                            title="播放"
                          >
                            <PlayCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleAddToPlaylist(song)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all" 
                            title="添加到播放队列"
                          >
                            <PlusSquare size={18} />
                          </button>
                          <button 
                            onClick={() => handleDownload(song)}
                            className={`p-2 rounded-lg transition-all ${song.files?.audio ? 'text-muted-foreground hover:text-primary hover:bg-primary/10' : 'text-muted-foreground/50 cursor-not-allowed'}`}
                            title={song.files?.audio ? "下载" : "暂无下载"}
                            disabled={!song.files?.audio}
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => handleRemoveSong(song.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all" 
                            title="从歌单移除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Song Modal */}
      {showAddSongModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-card/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-foreground">添加歌曲</h2>
              <button onClick={() => setShowAddSongModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="relative mb-4">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-4 pr-4 py-3 text-sm focus:outline-none focus:border-primary text-foreground placeholder-muted-foreground transition-all"
                  placeholder="搜索歌曲..."
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-border rounded-xl bg-muted/30 custom-scrollbar">
                {filteredAllSongs.length > 0 ? (
                  filteredAllSongs.map(song => (
                    <div 
                      key={song.id} 
                      onClick={() => {
                          const newSet = new Set(songsToAdd);
                          if (newSet.has(song.id)) newSet.delete(song.id);
                          else newSet.add(song.id);
                          setSongsToAdd(newSet);
                      }}
                      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 border-b border-border last:border-0 transition-colors ${songsToAdd.has(song.id) ? 'bg-primary/20' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                             {song.files?.image ? (
                                <img src={`/api/file${song.files.image}`} alt={song.title} className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Disc size={20} /></div>
                             )}
                        </div>
                        <div>
                           <div className={`font-bold text-sm ${songsToAdd.has(song.id) ? 'text-primary' : 'text-foreground'}`}>{song.title}</div>
                           <div className="text-xs text-muted-foreground">{song.artist}{song.album ? ` - ${song.album}` : ''}</div>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${songsToAdd.has(song.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {songsToAdd.has(song.id) && <Check size={14} className="text-primary-foreground" />}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    没有找到相关歌曲
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 bg-card/50 rounded-b-2xl">
              <button 
                onClick={() => setShowAddSongModal(false)}
                className="px-6 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors font-medium"
              >
                取消
              </button>
              <button 
                onClick={handleAddSongs}
                className="px-8 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-all shadow-lg shadow-primary/20 font-bold"
                disabled={songsToAdd.size === 0}
              >
                添加 ({songsToAdd.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Modal */}
      {showPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full h-full max-w-7xl max-h-[95vh] p-4 flex flex-col">
            <button 
              onClick={() => setShowPlayer(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-50 bg-black/20 p-2 rounded-full hover:bg-black/50"
            >
              <X size={24} />
            </button>
            <iframe 
              src={playerUrl} 
              className="w-full h-full rounded-2xl shadow-2xl bg-black border border-border"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && currentConflict && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center bg-card/50 rounded-t-2xl">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                 <FileText size={18} className="text-primary" />
                 选择歌谱版本
              </h3>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                剩余: {conflictQueue.length}
              </div>
            </div>
            
            <div className="p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                歌曲 <span className="font-bold text-foreground">《{currentConflict.song.title}》</span> 存在多个和弦谱版本，请选择一个用于演示：
              </p>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {currentConflict.sheets.map((sheet, idx) => {
                    const fileName = sheet.split('/').pop() || sheet;
                    return (
                        <div key={idx} className="flex items-center gap-2 mb-2 group">
                            <button
                                onClick={() => handleResolveConflict(sheet)}
                                className="flex-1 text-left px-4 py-3 rounded-xl border border-border hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-3 bg-muted/50"
                            >
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-card transition-colors">
                                    <FileText size={16} />
                                </div>
                                <span className="text-sm text-foreground font-medium truncate flex-1">
                                    {fileName}
                                </span>
                                <span className="text-xs text-muted-foreground group-hover:text-primary">选择</span>
                            </button>
                            <button
                                onClick={() => setPreviewUrl(`/api/file${sheet}`)}
                                className="p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all bg-muted/50"
                                title="预览"
                            >
                                <Eye size={20} />
                            </button>
                        </div>
                    );
                })}
              </div>
              
              <p className="mt-6 text-xs text-muted-foreground text-center">
                您的选择将被记住，下次将自动使用此版本。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewUrl(null)}>
           <button 
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 bg-black/20 rounded-full hover:bg-black/40"
              onClick={() => setPreviewUrl(null)}
           >
              <X size={32} />
           </button>
           <img 
              src={previewUrl} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
           />
        </div>
      )}

      {/* Preference Manager Modal */}
      {showPrefManager && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-border flex justify-between items-center bg-card/50 rounded-t-2xl">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                   <Settings size={18} className="text-primary" />
                   歌谱版本偏好管理
                </h3>
                <button onClick={() => setShowPrefManager(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                 {prefList.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-4">
                       <Settings size={48} className="opacity-20" />
                       <p>暂无已保存的歌谱偏好</p>
                    </div>
                 ) : (
                    <div className="divide-y divide-border">
                       {prefList.map((item, idx) => {
                          const fileName = item.currentSheet.split('/').pop() || item.currentSheet;
                          return (
                             <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-4 overflow-hidden">
                                   <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                                      <FileText size={24} />
                                   </div>
                                   <div className="min-w-0">
                                      <div className="font-bold text-foreground truncate text-base mb-1">{item.song.title}</div>
                                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                         当前选择: <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground border border-border">{fileName}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                   <button 
                                      onClick={() => setPreviewUrl(`/api/file${item.currentSheet}`)}
                                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                      title="预览当前版本"
                                   >
                                      <Eye size={18} />
                                   </button>
                                   <button 
                                      onClick={() => handleChangePref(item)}
                                      className="px-3 py-1.5 text-xs font-bold text-primary border border-primary/50 rounded-lg hover:bg-primary/10 transition-colors"
                                   >
                                      更改
                                   </button>
                                   <button 
                                      onClick={() => handleRemovePref(item.song.id)}
                                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                      title="清除偏好 (下次询问)"
                                   >
                                      <Trash2 size={18} />
                                   </button>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 )}
              </div>
              
              <div className="p-4 bg-card/50 border-t border-border text-xs text-muted-foreground text-center rounded-b-2xl">
                 清除偏好后，下次生成演示时将重新询问版本选择。
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
