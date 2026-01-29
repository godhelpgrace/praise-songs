'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ListMusic, Disc, Plus, X, Search, Check, Trash2, Camera } from 'lucide-react';
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
  description?: string;
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
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('cat');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile) return null;
    const formData = new FormData();
    formData.append('file', coverFile);
    try {
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.path;
      }
    } catch (error) {
      console.error('Upload failed', error);
    }
    return null;
  };

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
      let coverPath = null;
      if (coverFile) {
        coverPath = await uploadCover();
      }

      const selectedSongs = allSongs.filter(s => selectedSongIds.includes(s.id));
      
      // Determine cover: Uploaded > First Song > Default
      const finalCover = coverPath 
        ? `/api/file${coverPath}` 
        : undefined;

      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPlaylistTitle,
          description,
          tags,
          songs: selectedSongs,
          cover: finalCover
        })
      });

      if (res.ok) {
        const newPlaylistRaw = await res.json();
        const newPlaylist = {
             ...newPlaylistRaw,
             tags: newPlaylistRaw.tags ? newPlaylistRaw.tags.split(',') : []
        };
        setPlaylists(prev => [...prev, newPlaylist]);
        setShowCreateModal(false);
        
        // Reset form
        setNewPlaylistTitle('');
        setDescription('');
        setTags('');
        setCoverFile(null);
        setCoverPreview(null);
        setSelectedSongIds([]);
        
        router.refresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`创建失败: ${errorData.error || '未知错误'}\n详情: ${errorData.details || '无'}`);
      }
    } catch (e) {
      console.error(e);
      alert('创建出错: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to Link
    if (!confirm('确定要删除这个歌单吗？')) return;

    try {
      const res = await fetch(`/api/playlist/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== id));
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || '删除失败');
      }
    } catch (e) {
      alert('删除出错');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-border">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
           <ListMusic className="w-6 h-6 text-indigo-500" />
           精选歌单
        </h2>
        <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium rounded-full transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
        >
            <Plus size={16} />
            创建歌单
        </button>
      </div>
      
      {filteredPlaylists.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredPlaylists.map((playlist) => (
            <Link href={`/playlist/${playlist.id}`} key={playlist.id} className="group block">
              <div className="relative aspect-square mb-3 overflow-hidden rounded-lg shadow-lg shadow-black/5 dark:shadow-black/20 group-hover:shadow-primary/20 transition-all">
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
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                    <ListMusic className="text-white w-10 h-10 drop-shadow-lg transform scale-90 group-hover:scale-100 transition-transform" />
                    <button 
                      onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-white"
                      title="删除歌单"
                    >
                      <Trash2 size={20} />
                    </button>
                 </div>
              </div>
              <h3 className="text-sm font-bold text-foreground truncate mb-1 group-hover:text-primary transition-colors" title={playlist.title}>
                  {playlist.title}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                  {playlist.songs?.length || 0} 首
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <ListMusic size={40} />
          </div>
          <p className="text-muted-foreground">暂无歌单，点击右上角创建吧！</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-popover border border-border rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">新建歌单</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-hidden flex flex-col">
              <div className="flex flex-col md:flex-row gap-4 mb-3">
                <div className="flex-shrink-0">
                  <label className="block text-xs font-medium text-muted-foreground mb-1">封面</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors relative overflow-hidden group"
                  >
                    {coverPreview ? (
                      <Image 
                        src={coverPreview} 
                        alt="Cover preview" 
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Camera className="text-muted-foreground mb-1" size={20} />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white">更换封面</p>
                    </div>
                  </div>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">歌单名称 <span className="text-destructive">*</span></label>
                    <input 
                      type="text" 
                      value={newPlaylistTitle}
                      onChange={(e) => setNewPlaylistTitle(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary text-foreground"
                      placeholder="请输入歌单名称"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">简介</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary text-foreground h-14 resize-none"
                      placeholder="请输入歌单简介"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">分类标签</label>
                    <input 
                      type="text" 
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary text-foreground"
                      placeholder="例如：主日敬拜, 团契 (用逗号分隔)"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 border-t border-border pt-3">
                <label className="block text-sm font-medium text-muted-foreground mb-2">选择歌曲 ({selectedSongIds.length})</label>
                
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary text-foreground"
                    placeholder="搜索歌曲..."
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-border rounded bg-muted/30">
                  {filteredSongs.length > 0 ? (
                    filteredSongs.map(song => (
                      <div 
                        key={song.id} 
                        onClick={() => toggleSongSelection(song.id)}
                        className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 border-b border-border last:border-0 ${selectedSongIds.includes(song.id) ? 'bg-primary/20' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-foreground">{song.title}</div>
                          <div className="text-xs text-muted-foreground">- {song.artist}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSongIds.includes(song.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                          {selectedSongIds.includes(song.id) && <Check size={10} className="text-primary-foreground" />}
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
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20 rounded-b-lg">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-1.5 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleCreatePlaylist}
                className="px-6 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
