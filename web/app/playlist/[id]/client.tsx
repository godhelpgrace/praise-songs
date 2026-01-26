'use client';

import { PlayCircle, Heart, ThumbsUp, Share2, Smartphone, ListMusic, Disc, Download, FileText, PlusSquare, Headphones, AlignLeft, Edit2, Check, X, Trash2, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  files: {
    audio?: string;
    sheet?: string;
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
    tags: playlist.tags || ['布道会', '毕业典礼', '主日学', '赞美会', '现代流行']
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
              alert('删除失败');
          }
      } catch (e) {
          alert('删除出错');
      }
  };

  const handleRemoveSong = (songId: string) => {
      if (!confirm('确定要从歌单中移除这首歌曲吗？')) return;
      const newSongs = playlistSongs.filter(s => s.id !== songId);
      setPlaylistSongs(newSongs);
      // If we are not in edit mode, we should save immediately? 
      // User expects "Remove" to happen. But our UX is "Edit -> Save".
      // Let's assume remove works only in Edit mode or triggers a save if outside?
      // Actually, better to just update local state and let user click "Save" if in edit mode.
      // But if not in edit mode, maybe we should auto-save?
      // For simplicity, let's make Remove available only in Edit mode or explicitly Save.
      // But user requested "management operations".
      
      // If not in edit mode, let's do an auto-save for better UX
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
    
    // Reuse the random play logic but for this specific list
    const firstSong = playlistSongs[0];
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    // We need to pass the whole playlist to the player...
    // But our URL-based opening only plays one song.
    // The strategy: Open the player with the first song, then send a "REPLACE_PLAYLIST" message.
    
    // Check if player is active
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    // Instead of window.open, we use internal state to show iframe modal
    setPlayerUrl(`/song/${firstSong.id}`);
    setShowPlayer(true);
    
    setTimeout(() => {
      const channel = new BroadcastChannel('music_player_channel');
      const playerSongs = playlistSongs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      cover: s.cover || (s.files?.image ? `/api/file${s.files.image}` : undefined),
      src: s.files?.audio ? `/api/file${s.files.audio}` : undefined, // Ensure src is always a string or handle undefined
      lrcPath: s.files?.lrc ? `/api/file${s.files.lrc}` : undefined
    }));
      channel.postMessage({ type: 'REPLACE_PLAYLIST', songs: playerSongs });
      channel.close();
    }, 2000);
  };

  const handlePlay = (song: Song) => {
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    const playerSongs = playlistSongs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        cover: s.cover || (s.files?.image ? `/api/file${s.files.image}` : undefined),
        src: s.files?.audio ? `/api/file${s.files.audio}` : undefined,
        lrcPath: s.files?.lrc ? `/api/file${s.files.lrc}` : undefined
    }));

    // Use iframe modal instead of window.open
    setPlayerUrl(`/song/${song.id}`);
    setShowPlayer(true);
    
    setTimeout(() => {
      const channel = new BroadcastChannel('music_player_channel');
      // First play the specific song
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
      // Then update the playlist context
      channel.postMessage({ type: 'REPLACE_PLAYLIST', songs: playerSongs });
      channel.close();
    }, 2000);
  };

  const handleAddToPlaylist = (song: Song) => {
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    const playerSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover: song.cover || (song.files?.image ? `/api/file${song.files.image}` : undefined),
        src: song.files?.audio ? `/api/file${song.files.audio}` : undefined,
        lrcPath: song.files?.lrc ? `/api/file${song.files.lrc}` : undefined
    };

    // Simply add to queue, if player is not open, open it
    if (!isActive && !showPlayer) {
       handlePlay(song);
    } else {
       const channel = new BroadcastChannel('music_player_channel');
       channel.postMessage({ 
         type: 'ADD_TO_QUEUE', 
         song: playerSong
       });
       channel.close();
       // Optional: Show a toast or notification
       alert('已添加到播放列表');
    }
  };

  const handleDownload = async (song: Song) => {
    if (!song.files?.audio) return;
    try {
      const response = await fetch(`/api/file${song.files.audio}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${song.title}-${song.artist}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请稍后重试');
    }
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

  return (
    <div className="flex bg-white shadow rounded-lg overflow-hidden min-h-[600px]">
      {/* Left Sidebar */}
      <div className="w-48 border-r border-gray-100 flex flex-col items-center pt-8 gap-6 bg-gray-50/30">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm mb-4">
           <img src="https://file.xiaohai.ai/avatar/2020/06/17/5ee99c6982b10b3c163fea8a.jpg" alt="User" className="w-full h-full object-cover" />
        </div>
        
        <ul className="w-full text-center space-y-1">
          <li className="border-l-4 border-orange-500 bg-white py-3 text-gray-800 font-medium cursor-pointer">
            <span>歌单主页</span>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Breadcrumbs */}
        <div className="px-8 py-4 text-xs text-gray-500 flex items-center gap-2 border-b border-gray-50">
           <a href="/" className="hover:text-orange-500">赞美吧</a>
           <span>&gt;</span>
           <a href="/playlist" className="hover:text-orange-500">歌单</a>
           <span>&gt;</span>
           <span className="text-gray-800">{playlist.title}</span>
           <span>&gt;</span>
           <span>主页</span>
        </div>

        {/* Header Info Section */}
        <div className="p-10 flex gap-10 bg-gradient-to-r from-orange-400 to-pink-500 relative overflow-hidden text-white">
          <div className="absolute right-0 top-0 w-1/2 h-full bg-white/10 skew-x-12 transform translate-x-20"></div>
          
          {/* Left: Round Playlist Cover */}
          <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/30 shrink-0 relative group backdrop-blur-sm">
             {coverUrl ? (
               <img src={coverUrl} alt={playlist.title} className="w-full h-full object-cover" />
             ) : (
               <img src="/images/default_cover.png" alt={playlist.title} className="w-full h-full object-cover" />
             )}
             <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center transition-all">
                <PlayCircle size={48} className="text-white opacity-90 drop-shadow-lg" />
             </div>
          </div>

          {/* Middle: Info */}
          <div className="flex-1 z-10 flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center gap-3 group/title text-white tracking-tight">
              {isEditing ? (
                <input 
                  type="text"
                  value={tempMetadata.title}
                  onChange={(e) => setTempMetadata({...tempMetadata, title: e.target.value})}
                  className="bg-white/20 border border-white/30 rounded px-3 py-1 text-3xl font-bold text-white placeholder-white/50 focus:bg-white/30 focus:ring-2 focus:ring-white/50 outline-none w-full max-w-[500px]"
                />
              ) : (
                metadata.title
              )}
              {!isEditing && (
                <button onClick={handleEdit} className="opacity-0 group-hover/title:opacity-100 transition-opacity text-white/70 hover:text-white p-1" title="编辑信息">
                  <Edit2 size={20} />
                </button>
              )}
            </h1>
            
            <div className="space-y-2 text-sm text-orange-50 mb-8">
              <div className="flex items-center gap-2">
                <span className="opacity-80 shrink-0">创建者：</span>
                {isEditing ? (
                  <input 
                    type="text"
                    value={tempMetadata.creator}
                    onChange={(e) => setTempMetadata({...tempMetadata, creator: e.target.value})}
                    className="bg-white/20 border border-white/30 rounded px-2 py-0.5 text-sm text-white focus:bg-white/30 outline-none w-full max-w-[200px]"
                  />
                ) : (
                  <span className="font-medium hover:underline cursor-pointer">{metadata.creator}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-80 shrink-0">歌曲数量：</span>
                <span className="font-medium bg-white/20 px-2 py-0.5 rounded-full text-xs">{playlistSongs.length} 首</span>
              </div>
              <div className="flex items-center gap-2 items-start">
                <span className="opacity-80 shrink-0 mt-1">歌单简介：</span>
                {isEditing ? (
                  <textarea
                    value={tempMetadata.description}
                    onChange={(e) => setTempMetadata({...tempMetadata, description: e.target.value})}
                    className="bg-white/20 border border-white/30 rounded px-2 py-1 text-sm text-white focus:bg-white/30 outline-none w-full max-w-[400px] min-h-[60px]"
                  />
                ) : (
                  <span className="opacity-90 mt-1 max-w-2xl leading-relaxed">{metadata.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap items-start pt-1">
                 {isEditing ? (
                   <input 
                     type="text"
                     value={tempMetadata.tags.join(', ')}
                     onChange={(e) => setTempMetadata({...tempMetadata, tags: e.target.value.split(/,\s*/).filter(t => t.trim())})}
                     className="bg-white/20 border border-white/30 rounded px-2 py-0.5 text-sm text-white focus:bg-white/30 outline-none w-full max-w-[400px]"
                     placeholder="使用逗号分隔标签"
                   />
                 ) : (
                   <div className="flex gap-2 flex-wrap">
                     {metadata.tags.map((tag, index) => (
                       <span key={index} className="px-2 py-0.5 bg-white/20 rounded text-xs hover:bg-white/30 cursor-pointer transition-colors">#{tag}</span>
                     ))}
                   </div>
                 )}
              </div>
              
              {isEditing && (
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSave} className="px-4 py-1.5 bg-white text-orange-600 rounded font-bold text-xs flex items-center gap-1 hover:bg-orange-50 shadow-lg">
                    <Check size={14} /> 保存修改
                  </button>
                  <button onClick={handleCancel} className="px-4 py-1.5 bg-white/20 text-white rounded font-medium text-xs flex items-center gap-1 hover:bg-white/30">
                    <X size={14} /> 取消
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handlePlayAll}
                className="px-6 py-2.5 bg-white text-orange-600 rounded-full font-bold flex items-center gap-2 hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PlayCircle size={20} className="fill-orange-600 text-white" /> 播放全部
              </button>
              <button 
                onClick={handleFavoritePlaylist}
                className={`px-5 py-2.5 rounded-full font-medium flex items-center gap-2 text-sm transition-all border border-white/30 hover:bg-white/10 ${isPlaylistFavorited ? 'bg-white/20 text-white' : 'text-white'}`}
              >
                <Heart size={18} className={isPlaylistFavorited ? "fill-current" : ""} /> {isPlaylistFavorited ? '已收藏' : '收藏'}
              </button>
              <button 
                onClick={handleLikePlaylist}
                className={`px-5 py-2.5 rounded-full font-medium flex items-center gap-2 text-sm transition-all border border-white/30 hover:bg-white/10 ${isPlaylistLiked ? 'bg-white/20 text-white' : 'text-white'}`}
              >
                <ThumbsUp size={18} className={isPlaylistLiked ? "fill-current" : ""} /> {isPlaylistLiked ? '已点赞' : '点赞'}
              </button>
              <button 
                onClick={handleSharePlaylist}
                className="px-5 py-2.5 rounded-full font-medium flex items-center gap-2 text-sm transition-all border border-white/30 text-white hover:bg-white/10"
              >
                <Share2 size={18} /> 分享
              </button>
              <button 
                onClick={handleEdit}
                className={`px-5 py-2.5 rounded-full font-medium flex items-center gap-2 text-sm transition-all border border-white/30 hover:bg-white/10 ${isEditing ? 'bg-white/20 text-white' : 'text-white'}`}
              >
                <Edit2 size={18} /> 编辑
              </button>
              <button 
                onClick={handleDeletePlaylist}
                className="px-5 py-2.5 rounded-full font-medium flex items-center gap-2 text-sm transition-all border border-white/30 text-white hover:bg-red-500/20 hover:border-red-400"
              >
                <Trash2 size={18} /> 删除
              </button>
            </div>
          </div>
        </div>

        {/* Song List Section */}
        <div className="p-8 bg-white flex-1">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold text-gray-700 border-l-4 border-gray-400 pl-3">歌单曲目</h2>
            <button 
              onClick={() => setShowAddSongModal(true)}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs flex items-center gap-1 hover:bg-blue-100"
            >
              <Plus size={14} /> 添加歌曲
            </button>
          </div>
          
          <div className="w-full">
            <table className="w-full text-sm text-gray-600">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-500 font-normal">
                  <th className="py-3 pl-2 w-10 text-center font-normal">
                    <input 
                      type="checkbox" 
                      checked={playlistSongs.length > 0 && selectedSongs.size === playlistSongs.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  <th className="py-3 w-10 text-center font-normal">序号</th>
                  <th className="py-3 pl-2 text-left font-normal">歌曲标题</th>
                  <th className="py-3 pr-2 text-right font-normal">操作</th>
                </tr>
              </thead>
              <tbody>
              {playlistSongs.map((song, index) => (
                <tr key={song.id} className="hover:bg-gray-50 group border-b border-dashed border-gray-100 last:border-0">
                  <td className="py-3 pl-2 w-10 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedSongs.has(song.id)}
                      onChange={() => toggleSelect(song.id)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                  </td>
                  <td className="py-3 w-10 text-center font-mono text-gray-400 text-xs">
                    {(index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium truncate max-w-[200px]">{song.title}</span>
                      <span className="text-gray-300">-</span>
                      <span className="text-gray-400 truncate max-w-[100px] text-xs">{song.artist}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <div className="flex justify-end gap-1 opacity-100">
                      <button 
                        onClick={() => handlePlay(song)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-orange-500 border border-gray-200 rounded hover:border-orange-500 bg-white" 
                        title="播放"
                      >
                        <PlayCircle size={12} />
                      </button>
                      <button 
                        onClick={() => handleRemoveSong(song.id)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 border border-gray-200 rounded hover:border-red-500 bg-white" 
                        title="移除"
                      >
                        <Minus size={12} />
                      </button>
                      <button 
                        onClick={() => handleAddToPlaylist(song)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-orange-500 border border-gray-200 rounded hover:border-orange-500 bg-white" 
                        title="添加到列表"
                      >
                        <PlusSquare size={12} />
                      </button>
                      <button 
                        onClick={() => handleDownload(song)}
                        className={`w-6 h-6 flex items-center justify-center border border-gray-200 rounded bg-white ${song.files?.audio ? 'text-gray-400 hover:text-orange-500 hover:border-orange-500 cursor-pointer' : 'text-gray-300 bg-gray-50 cursor-not-allowed'}`}
                        title={song.files?.audio ? "下载" : "暂无下载"}
                        disabled={!song.files?.audio}
                      >
                        <Download size={12} />
                      </button>
                      <button 
                        onClick={() => handleShare(song)}
                        className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-orange-500 border border-gray-200 rounded hover:border-orange-500 bg-white" 
                        title="分享"
                      >
                        <Share2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleFavorite(song.id)}
                        className={`w-6 h-6 flex items-center justify-center border border-gray-200 rounded bg-white ${favoritedSongs.has(song.id) ? 'text-red-500 border-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-orange-500 hover:border-orange-500'}`}
                        title={favoritedSongs.has(song.id) ? "取消收藏" : "收藏"}
                      >
                        <Heart size={12} className={favoritedSongs.has(song.id) ? "fill-current" : ""} />
                      </button>
                      <button 
                        onClick={() => handleLike(song.id)}
                        className={`w-6 h-6 flex items-center justify-center border border-gray-200 rounded bg-white ${likedSongs.has(song.id) ? 'text-orange-500 border-orange-500 hover:bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:border-orange-500'}`}
                        title={likedSongs.has(song.id) ? "取消点赞" : "推荐"}
                      >
                        <ThumbsUp size={12} className={likedSongs.has(song.id) ? "fill-current" : ""} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Song Modal */}
      {showAddSongModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">添加歌曲</h2>
              <button onClick={() => setShowAddSongModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="relative mb-4">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-300 rounded pl-3 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-900"
                  placeholder="搜索歌曲..."
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-200 rounded">
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
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 last:border-0 ${songsToAdd.has(song.id) ? 'bg-blue-50' : ''}`}
                    >
                      <div>
                        <div className="font-medium text-sm text-gray-900">{song.title}</div>
                        <div className="text-xs text-gray-600">{song.artist}{song.album ? ` - ${song.album}` : ''}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${songsToAdd.has(song.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {songsToAdd.has(song.id) && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    没有找到相关歌曲
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button 
                onClick={() => setShowAddSongModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded"
              >
                取消
              </button>
              <button 
                onClick={handleAddSongs}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full h-full max-w-6xl max-h-[90vh]">
            <button 
              onClick={() => setShowPlayer(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={32} />
            </button>
            <iframe 
              src={playerUrl} 
              className="w-full h-full rounded-lg shadow-2xl bg-black"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </div>
  );
}