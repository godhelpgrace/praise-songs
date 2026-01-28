'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ListMusic, Disc, Plus, X, Search, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  cover?: string;
  songs: Song[];
  tags?: string[];
};

export default function PlaylistClient({ 
  initialPlaylists,
  allSongs 
}: { 
  initialPlaylists: Playlist[],
  allSongs: Song[] 
}) {
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('cat');

  const filteredPlaylists = useMemo(() => {
    if (!currentCat) return playlists;
    return playlists.filter(p => p.tags?.includes(currentCat));
  }, [playlists, currentCat]);

  const filteredSongs = allSongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSongSelection = (id: string) => {
    setSelectedSongIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) {
      alert('请输入歌单名称');
      return;
    }

    try {
      const selectedSongs = allSongs.filter(s => selectedSongIds.includes(s.id));
      
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPlaylistTitle,
          songs: selectedSongs,
          cover: selectedSongs.length > 0 && selectedSongs[0].files.image 
                 ? `/api/file${selectedSongs[0].files.image}` 
                 : '/images/default_cover.png' // Default cover
        })
      });

      if (res.ok) {
        const newPlaylist = await res.json();
        setPlaylists(prev => [...prev, newPlaylist]);
        setShowCreateModal(false);
        setNewPlaylistTitle('');
        setSelectedSongIds([]);
        router.refresh();
      } else {
        alert('创建失败');
      }
    } catch (e) {
      alert('创建出错');
    }
  };

  return (
    <>
      <div className="relative bg-gradient-to-r from-orange-300 to-pink-400 rounded-2xl p-6 mb-4 shadow-xl overflow-hidden text-white">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl font-bold mb-2 tracking-tight flex items-center gap-3">
            <ListMusic className="w-7 h-7" />
            精选歌单
          </h1>
          <p className="text-orange-50 text-sm mb-4 leading-relaxed">
            为您精心编排的音乐合辑，无论是敬拜赞美还是灵修默想，都能找到合适的旋律。
          </p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-white/90 text-orange-600 px-5 py-2 rounded-full font-bold hover:bg-white transition-colors shadow-lg flex items-center gap-2 backdrop-blur-sm text-sm"
          >
            <Plus size={18} />
            创建新歌单
          </button>
        </div>
        <div className="absolute right-0 top-0 w-1/3 h-full bg-white/10 skew-x-12 transform translate-x-12"></div>
      </div>
      
      {filteredPlaylists.length > 0 ? (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {filteredPlaylists.map((playlist) => (
            <Link href={`/playlist/${playlist.id}`} key={playlist.id} className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group block transform hover:-translate-y-1 border border-white/10 hover:bg-white/10">
              <div className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
                 {playlist.cover ? (
                   <Image 
                      src={playlist.cover} 
                      alt={playlist.title} 
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                   />
                 ) : playlist.songs?.[0]?.files?.image ? (
                   <Image 
                      src={`/api/file${playlist.songs[0].files.image}`} 
                      alt={playlist.title} 
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                   />
                 ) : (
                   <Image 
                      src="/images/default_cover.png" 
                      alt={playlist.title} 
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                   />
                 )}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                   <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white shadow-lg transform scale-50 group-hover:scale-100 transition-all duration-300 backdrop-blur-md border border-white/20">
                     <ListMusic size={24} />
                   </div>
                 </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-slate-200 truncate mb-1 text-lg group-hover:text-violet-400 transition-colors">{playlist.title}</h3>
                <p className="text-sm text-slate-400 flex items-center gap-1">
                  <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs text-slate-400 font-medium">{playlist.songs?.length || 0} 首</span>
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
            <ListMusic size={40} />
          </div>
          <p className="text-slate-400">暂无歌单，点击右上角创建吧！</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">新建歌单</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">歌单名称</label>
                <input 
                  type="text" 
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 focus:outline-none focus:border-violet-500 text-white"
                  placeholder="请输入歌单名称"
                />
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <label className="block text-sm font-medium text-slate-400 mb-2">选择歌曲 ({selectedSongIds.length})</label>
                
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-500 text-white"
                    placeholder="搜索歌曲..."
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-white/10 rounded bg-white/5">
                  {filteredSongs.length > 0 ? (
                    filteredSongs.map(song => (
                      <div 
                        key={song.id} 
                        onClick={() => toggleSongSelection(song.id)}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white/10 border-b border-white/5 last:border-0 ${selectedSongIds.includes(song.id) ? 'bg-violet-900/30' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-slate-200">{song.title}</div>
                          <div className="text-xs text-slate-400">- {song.artist}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedSongIds.includes(song.id) ? 'bg-violet-600 border-violet-600' : 'border-slate-500'}`}>
                          {selectedSongIds.includes(song.id) && <Check size={12} className="text-white" />}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      没有找到相关歌曲
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-black/20 rounded-b-lg">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-300 hover:bg-white/10 rounded"
              >
                取消
              </button>
              <button 
                onClick={handleCreatePlaylist}
                className="px-6 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!newPlaylistTitle.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
