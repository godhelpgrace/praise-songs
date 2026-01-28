'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check, ListMusic } from 'lucide-react';

type Song = {
  id: string;
  title: string;
  artist: string;
  files: {
    audio?: string;
    image?: string;
  };
};

type Playlist = {
  id: string;
  title: string;
  songs: Song[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
};

export default function AddToPlaylistModal({ isOpen, onClose, song }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      setSelectedPlaylistId('');
      setNewPlaylistName('');
      setIsCreating(false);
    }
  }, [isOpen]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/playlist');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (e) {
      console.error('Failed to fetch playlists', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlaylist = async () => {
    if (!song) return;
    
    try {
      // Find the playlist
      const playlist = playlists.find(p => p.id === selectedPlaylistId);
      if (!playlist) return;

      // Check if song already exists
      if (playlist.songs.some(s => s.id === song.id)) {
        alert('歌曲已在该歌单中');
        return;
      }

      const newSongs = [...playlist.songs, song];
      
      const res = await fetch(`/api/playlist/${selectedPlaylistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...playlist,
          songs: newSongs
        })
      });

      if (res.ok) {
        alert('添加成功');
        onClose();
      } else {
        alert('添加失败');
      }
    } catch (e) {
      console.error(e);
      alert('添加出错');
    }
  };

  const handleCreateAndAdd = async () => {
    if (!song || !newPlaylistName.trim()) return;

    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPlaylistName,
          songs: [song],
          cover: song.files.image ? `/api/file${song.files.image}` : '/images/default_cover.png'
        })
      });

      if (res.ok) {
        alert('创建并添加成功');
        onClose();
      } else {
        alert('创建失败');
      }
    } catch (e) {
      console.error(e);
      alert('创建出错');
    }
  };

  if (!isOpen || !song) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ListMusic className="text-indigo-500" size={20} />
            添加到歌单
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 bg-gray-50 p-3 rounded-lg flex items-center gap-3">
             <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
               {song.files.image ? (
                 <img src={`/api/file${song.files.image}`} alt={song.title} className="w-full h-full object-cover" />
               ) : (
                 <ListMusic className="text-gray-400" size={20} />
               )}
             </div>
             <div className="flex-1 min-w-0">
               <div className="font-medium text-gray-800 truncate">{song.title}</div>
               <div className="text-xs text-gray-500 truncate">{song.artist}</div>
             </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-600">选择歌单</label>
              <select 
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={isCreating ? 'new' : selectedPlaylistId}
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    setIsCreating(true);
                    setSelectedPlaylistId('');
                  } else {
                    setIsCreating(false);
                    setSelectedPlaylistId(e.target.value);
                  }
                }}
              >
                <option value="" disabled>请选择歌单</option>
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.songs?.length || 0}首)</option>
                ))}
                <option value="new" className="font-medium text-indigo-600">+ 新建歌单</option>
              </select>
            </div>

            {isCreating && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-medium text-gray-600">歌单名称</label>
                <input 
                  type="text" 
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="输入新歌单名称"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors"
          >
            取消
          </button>
          <button 
            onClick={isCreating ? handleCreateAndAdd : handleAddToPlaylist}
            disabled={(!isCreating && !selectedPlaylistId) || (isCreating && !newPlaylistName.trim())}
            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? <Plus size={16} /> : <Check size={16} />}
            {isCreating ? '创建并添加' : '添加到歌单'}
          </button>
        </div>
      </div>
    </div>
  );
}
