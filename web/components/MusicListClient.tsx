'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlayCircle, User, Disc, Trash2, Edit2, Music, Plus, Play, Video, Presentation, X, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePresentation } from '@/context/PresentationContext';
import { detectCategoryFromFilename } from '@/utils/sheetUtils';

import SongActionButtons from './SongActionButtons';

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
    sheets?: string[];
  };
};

type Artist = {
  id: string;
  name: string;
  avatar?: string;
};

type Album = {
  id: string;
  name: string;
  cover?: string;
  artist?: string;
};

type VideoItem = {
  id: string;
  uuid?: string | null;
  title: string;
  artistId?: string | null;
  artistName?: string;
  songId?: string | null;
  songTitle?: string | null;
  src: string;
  cover?: string | null;
  createdAt?: string | null;
};

export default function MusicListClient({ 
  initialSongs, 
  initialVideos = [],
  artists: _artists = [], 
  albums: _albums = [],
  hideArtist = false,
  hideAlbum = false
}: { 
  initialSongs: Song[], 
  initialVideos?: VideoItem[],
  artists?: Artist[], 
  albums?: Album[],
  hideArtist?: boolean,
  hideAlbum?: boolean
}) {
  const { user } = useAuth();
  const { addItem } = usePresentation();
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [videos] = useState<VideoItem[]>(initialVideos);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', album: '' });
  const [artistSearch, setArtistSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'song' | 'video'>('song');
  const [sheetSelector, setSheetSelector] = useState<{ song: Song, candidates: { path: string, title: string }[] } | null>(null);
  const [previewSheetPath, setPreviewSheetPath] = useState<string | null>(null);
  const router = useRouter();

  const filteredSongs = songs.filter(song => {
    if (!artistSearch) return true;
    const searchLower = artistSearch.toLowerCase();
    return (
      song.title.toLowerCase().includes(searchLower) ||
      song.artist.toLowerCase().includes(searchLower) ||
      song.album.toLowerCase().includes(searchLower)
    );
  });

  const filteredVideos = videos.filter((v) => {
    if (!artistSearch) return true;
    const searchLower = artistSearch.toLowerCase();
    return (
      v.title.toLowerCase().includes(searchLower) ||
      (v.artistName || '').toLowerCase().includes(searchLower) ||
      (v.songTitle || '').toLowerCase().includes(searchLower)
    );
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredSongs.length && filteredSongs.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredSongs.map(s => s.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (user?.role !== 'admin') return;
    if (selectedIds.size === 0) return;
    
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 首歌曲吗？此操作不可恢复。`)) return;

    try {
        const res = await fetch('/api/song/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds) })
        });

        if (res.ok) {
            setSongs(prev => prev.filter(s => !selectedIds.has(s.id)));
            setSelectedIds(new Set());
            router.refresh();
        } else {
            const data = await res.json().catch(() => null);
            alert(data?.error || '批量删除失败');
        }
    } catch (e) {
        alert('批量删除出错');
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'admin') {
      alert('只有管理员可以删除歌曲');
      return;
    }
    if (!confirm('确定要删除这首歌曲吗？此操作不可恢复。')) return;

    try {
      const res = await fetch(`/api/song/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== id));
        router.refresh();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || '删除失败');
      }
    } catch (e) {
      alert('删除出错');
    }
  };

  const startEdit = (song: Song) => {
    if (user?.role !== 'admin') {
      alert('只有管理员可以编辑歌曲');
      return;
    }
    setEditingId(song.id);
    setEditForm({
      title: song.title,
      artist: song.artist === '未分类歌手' ? '' : song.artist,
      album: song.album === '-' || !song.album ? '' : song.album
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/song/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (res.ok) {
        setSongs(prev => prev.map(s => s.id === id ? { ...s, ...editForm } : s));
        setEditingId(null);
        router.refresh();
      } else {
        alert('保存失败');
      }
    } catch (e) {
      alert('保存出错');
    }
  };

  const handleProject = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Collect all sheet paths
    const rawSheets: string[] = [];
    if (song.files.sheet) rawSheets.push(song.files.sheet);
    if (song.files.sheets) rawSheets.push(...song.files.sheets);

    const allSheets = Array.from(new Set(rawSheets));

    if (allSheets.length === 0) {
        alert('该歌曲暂无歌谱');
        return;
    }

    // 2. Filter for Chord Sheets (和弦谱)
    const candidates = allSheets.map(path => {
        const decodedPath = decodeURIComponent(path);
        const fileName = decodedPath.split('/').pop()?.replace(/\.[^/.]+$/, "") || '';
        const category = detectCategoryFromFilename(fileName);
        // If category is empty, default to Chord Sheet (assuming simple filenames are chord sheets)
        // If explicitly Staff/Guitar/Bass/Drum, ignore
        return {
            path,
            title: fileName,
            category: category || '和弦谱',
            isChord: !category || category === '和弦谱'
        };
    }).filter(c => c.isChord);

    if (candidates.length === 0) {
        alert('该歌曲暂无和弦谱');
        return;
    }

    // 3. Logic for selection
    if (candidates.length === 1) {
        addItem({
            id: song.id,
            title: song.title,
            sheetUrl: candidates[0].path
        });
        // Feedback? Maybe not needed as panel opens automatically
    } else {
        // Multiple candidates
        // Check preference
        const prefKey = `sheet_pref_${song.id}`;
        const preferredPath = localStorage.getItem(prefKey);
        
        const match = candidates.find(c => c.path === preferredPath);
        
        if (match) {
             addItem({
                id: song.id,
                title: song.title,
                sheetUrl: match.path
            });
        } else {
            // Show Selector
            setSheetSelector({
                song,
                candidates: candidates.map(c => ({ path: c.path, title: c.title }))
            });
        }
    }
  };

  const handlePlay = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    
    // Check if player window is active via localStorage heartbeat
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

    if (!isActive) {
      // Case 1: New Window - Open directly with URL to preserve user gesture for Autoplay
      const playerWin = window.open(
        `/song/${song.id}`, 
        'music_player_window'
      );
      
      if (!playerWin) {
        alert('请允许本站弹出窗口以播放音乐');
      }
    } else {
      // Case 2: Existing Window - Focus and send message (don't reload/interrupt)
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

  const handleSelectSheet = (path: string) => {
    if (!sheetSelector) return;
    const { song } = sheetSelector;
    
    // Save preference
    localStorage.setItem(`sheet_pref_${song.id}`, path);
    
    addItem({
        id: song.id,
        title: song.title,
        sheetUrl: path
    });
    
    setSheetSelector(null);
  };

  return (
    <div className="bg-card/50 backdrop-blur-xl rounded-3xl shadow-2xl min-h-[600px] border border-border overflow-hidden">
      <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-xl">
            {activeTab === 'song' ? (
              <Music className="w-6 h-6 text-primary" />
            ) : (
              <Video className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">乐库</h2>
              <div className="flex bg-muted border border-transparent rounded-full p-1">
                <button
                  onClick={() => setActiveTab('song')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeTab === 'song' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  歌曲
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    activeTab === 'video' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  视频
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {activeTab === 'song' ? `共 ${filteredSongs.filter(s => s.files?.audio).length} 首歌曲` : `共 ${filteredVideos.length} 个视频`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <input
              type="text"
              placeholder={activeTab === 'song' ? '搜索歌曲...' : '搜索视频...'}
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              className="bg-muted/50 border border-border text-foreground text-sm rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-primary/50 w-64 placeholder-muted-foreground"
            />
            <svg className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {user?.role === 'admin' && selectedIds.size > 0 && (
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-2 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium rounded-full transition-colors shadow-lg shadow-destructive/20"
            >
              <Trash2 className="w-4 h-4" />
              批量删除 ({selectedIds.size})
            </button>
          )}
          {activeTab === 'song' ? (
            <Link 
              href="/upload" 
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              上传歌曲
            </Link>
          ) : (
            <Link 
              href="/video" 
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-full transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              上传视频
            </Link>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {activeTab === 'video' ? (
          <div className="p-6">
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filteredVideos.map((v) => (
                  <div
                    key={v.id}
                    className="group cursor-pointer"
                    onClick={() => window.open(v.src.startsWith('/') ? `/api/file${v.src}` : v.src, '_blank')}
                  >
                    <div className="aspect-video bg-muted rounded-xl overflow-hidden mb-2 relative">
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-all">
                        <PlayCircle size={36} className="text-white" />
                      </div>
                      {v.cover ? (
                        <img
                          src={v.cover.startsWith('/') ? `/api/file${v.cover}` : v.cover}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                          <Video size={32} />
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-foreground font-medium truncate">{v.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{v.artistName || ''}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                    <Video className="w-8 h-8 opacity-20" />
                  </div>
                  <p>没有找到相关视频</p>
                </div>
              </div>
            )}
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-sm">
              <th className="p-4 font-medium pl-8 w-16">
                  {user?.role === 'admin' ? (
                      <input 
                          type="checkbox" 
                          checked={filteredSongs.length > 0 && selectedIds.size === filteredSongs.length}
                          onChange={toggleAll}
                          className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                      />
                  ) : '#'}
              </th>
              <th className="p-4 font-medium">歌曲标题</th>
              {!hideArtist && <th className="p-4 font-medium">歌手</th>}
              {!hideAlbum && <th className="p-4 font-medium">专辑</th>}
              <th className="p-4 font-medium text-right pr-8">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSongs.map((song, index) => (
              <tr key={song.id} className="group hover:bg-accent/50 transition-colors">
                <td className="p-2 pl-8 text-muted-foreground text-xs font-mono">
                  {user?.role === 'admin' ? (
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(song.id)}
                      onChange={() => toggleSelection(song.id)}
                      className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                  ) : (
                    index + 1
                  )}
                </td>
                <td className="p-2">
                  {editingId === song.id ? (
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className="bg-muted border border-primary/50 rounded px-2 py-1 text-foreground w-full focus:outline-none text-xs"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => handleProject(e, song)}
                        className="w-6 h-6 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 hover:scale-110"
                        title="演示"
                      >
                        <Presentation className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => handlePlay(e, song)}
                        className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 hover:scale-110"
                        title="播放"
                      >
                        <Play className="w-3 h-3 ml-0.5" />
                      </button>
                      <Link href={`/song/${song.id}`} className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 text-sm">
                        {song.title}
                      </Link>
                    </div>
                  )}
                </td>
                {!hideArtist && (
                  <td className="p-2 text-muted-foreground text-xs">
                    {editingId === song.id ? (
                      <input
                        type="text"
                        value={editForm.artist}
                        onChange={e => setEditForm({...editForm, artist: e.target.value})}
                        className="bg-muted border border-primary/50 rounded px-2 py-1 text-foreground w-full focus:outline-none text-xs"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                         <User className="w-3 h-3 opacity-50" />
                         <span>{song.artist}</span>
                      </div>
                    )}
                  </td>
                )}
                {!hideAlbum && (
                  <td className="p-2 text-muted-foreground text-xs">
                    {editingId === song.id ? (
                      <input
                        type="text"
                        value={editForm.album}
                        onChange={e => setEditForm({...editForm, album: e.target.value})}
                        className="bg-muted border border-primary/50 rounded px-2 py-1 text-foreground w-full focus:outline-none text-xs"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Disc className="w-3 h-3 opacity-50" />
                        <span>{song.album}</span>
                      </div>
                    )}
                  </td>
                )}
                <td className="p-2 text-right pr-8">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user?.role === 'admin' && editingId === song.id ? (
                        <>
                          <button onClick={() => saveEdit(song.id)} className="p-2 text-green-400 hover:bg-green-400/10 rounded-full transition-colors">
                            <span className="text-xs font-bold">保存</span>
                          </button>
                          <button onClick={cancelEdit} className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors">
                            <span className="text-xs">取消</span>
                          </button>
                        </>
                    ) : (
                      <>
                        <SongActionButtons song={song} />
                        {user?.role === 'admin' && (
                          <>
                            <div className="w-px h-4 bg-border mx-1"></div>
                            <button onClick={() => startEdit(song)} className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-full transition-colors" title="编辑">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(song.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-full transition-colors" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSongs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                      <Music className="w-8 h-8 opacity-20" />
                    </div>
                    <p>没有找到相关歌曲</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>
      {sheetSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setSheetSelector(null)}>
            <div className="bg-popover rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
                    <h3 className="font-bold text-foreground">选择歌谱版本</h3>
                    <button onClick={() => setSheetSelector(null)} className="text-muted-foreground hover:text-foreground">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-muted-foreground mb-4 px-2">
                        "{sheetSelector.song.title}" 有多个和弦谱版本，请选择要演示的版本：
                        <br/>
                        <span className="text-xs text-muted-foreground/80">(您的选择将被记住，下次自动使用)</span>
                    </p>
                    <div className="space-y-2">
                        {sheetSelector.candidates.map((c, idx) => (
                            <div
                                key={idx}
                                className="w-full text-left px-4 py-3 rounded-xl hover:bg-primary/20 hover:text-primary text-foreground transition-colors flex items-center justify-between group border border-border hover:border-primary/30 cursor-pointer"
                                onClick={() => handleSelectSheet(c.path)}
                            >
                                <span className="font-medium truncate flex-1 mr-4" title={c.title}>{c.title}</span>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewSheetPath(c.path);
                                        }}
                                        className="p-1.5 hover:bg-background/50 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                                        title="预览"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button 
                                        className="p-1.5 hover:bg-background/50 rounded-lg text-primary transition-colors"
                                        title="演示"
                                    >
                                        <Presentation size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Sheet Preview Modal */}
      {previewSheetPath && (
        <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewSheetPath(null)}
        >
            <div className="relative max-w-5xl max-h-full w-full h-full flex flex-col items-center justify-center">
                <button 
                    onClick={() => setPreviewSheetPath(null)}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 bg-black/20 rounded-full"
                >
                    <X size={24} />
                </button>
                <img 
                    src={`/api/file${previewSheetPath}`} 
                    alt="Preview" 
                    className="max-w-full max-h-full object-contain rounded shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute bottom-8 bg-black/50 backdrop-blur text-white px-4 py-2 rounded-full text-sm">
                    点击任意处关闭
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
