'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Plus, Check, Eye, ArrowUp, PlayCircle, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePresentation } from '@/context/PresentationContext';
import { useAuth } from '@/context/AuthContext';

type Song = {
  id: string;
  title: string;
  artist: string;
  index?: string; // Pre-calculated index from server
  files: {
    sheet?: string;
    sheets?: string[];
    audio?: string;
    image?: string;
    lrc?: string;
  };
  cover?: string;
};

export default function SheetListClient({ initialSheets }: { initialSheets: Song[] }) {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<Song[]>(initialSheets);

  useEffect(() => {
    setSheets(initialSheets);
  }, [initialSheets]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  const router = useRouter();
  const { addItem, removeItem: removeFromList, isInList } = usePresentation();

  // Flatten sheets: if a song has multiple sheets, create individual entries for them
  const flattenedSheets = useMemo(() => {
    const flattened: Song[] = [];
    
    sheets.forEach(song => {
      if (song.files.sheets && song.files.sheets.length > 1) {
        // Multiple sheets - create entry for each
        song.files.sheets.forEach((sheetPath, idx) => {
          // Clone the song but override title and sheet path
          // We use a composite ID to avoid duplicate keys in React list
          
          // Extract filename from path for title display
          const decodedPath = decodeURIComponent(sheetPath);
          const fileNameWithExt = decodedPath.split('/').pop() || '';
          const fileName = fileNameWithExt.replace(/\.[^/.]+$/, ""); // Remove extension

          flattened.push({
            ...song,
            id: `${song.id}_${idx}`, // temporary ID for UI key
            // Use filename as title as requested
            title: fileName, 
            files: {
              ...song.files,
              sheet: sheetPath,
              sheets: undefined // Remove array to treat as single sheet
            }
          });
        });
      } else {
        // Single sheet - keep as is
        flattened.push(song);
      }
    });
    
    return flattened;
  }, [sheets]);

  // Calculate global indices for sorted sheets
  const globalIndices = useMemo(() => {
    const sorted = [...flattenedSheets].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
    const indices: { [key: string]: number } = {};
    sorted.forEach((song, index) => {
      indices[song.id] = index + 1;
    });
    return indices;
  }, [flattenedSheets]);

  // Group sheets by pre-calculated index
  const groupedSheets = useMemo(() => {
    const groups: { [key: string]: Song[] } = {};
    // We must use the same sort order as above to ensure grouping makes sense with indices
    const sortedSheets = [...flattenedSheets].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));

    sortedSheets.forEach(song => {
      const key = song.index || '#';

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(song);
    });

    // Sort keys (A-Z, then #)
    return Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    }).reduce((obj, key) => {
      obj[key] = groups[key];
      return obj;
    }, {} as { [key: string]: Song[] });
  }, [flattenedSheets]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这张歌谱吗？此操作不可恢复。')) return;
    
    // Check if it's a "flattened" part (has underscore suffix)
    // If so, we probably still want to delete the whole song? 
    // Or just that specific file?
    // The current backend API deletes the whole song by ID.
    // If we passed `${song.id}_${idx}`, backend won't find it.
    // We should probably extract the real ID.
    const realId = id.includes('_') ? id.split('_')[0] : id;

    try {
      const res = await fetch(`/api/song/${realId}`, { method: 'DELETE' });
      if (res.ok) {
        setSheets(prev => prev.filter(s => s.id !== realId));
        // Also remove from presentation list if present
        removeFromList(realId);
        router.refresh();
      } else {
        alert('删除失败');
      }
    } catch (e) {
      alert('删除出错');
    }
  };

  const togglePresentation = (song: Song) => {
    // For flattened songs, we want to add that specific sheet.
    // The ID might be composite, but for presentation list we usually use real ID?
    // If we use real ID, adding Part 2 will overwrite Part 1 if we only track by ID.
    // PresentationContext might need to support unique IDs for playlist items distinct from Song IDs.
    // But for now, let's assume we use the composite ID for the playlist item to allow multiple parts.
    
    if (isInList(song.id)) {
      removeFromList(song.id);
    } else {
      if (song.files.sheet) {
        addItem({
          id: song.id,
          title: song.title,
          sheetUrl: `/api/file${song.files.sheet}`
        });
      }
    }
  };

  const handleEdit = (song: Song) => {
    // For flattened items, we edit the "real" song title.
    // But since they are displayed split, editing one would update all parts upon save/refresh.
    const realId = song.id.includes('_') ? song.id.split('_')[0] : song.id;
    // We need to find the original title without the " (1)" suffix if it was added by flattening
    // Actually, `song.title` here has the suffix.
    // We should find the original song from `sheets` state to get the clean title.
    const originalSong = sheets.find(s => s.id === realId);
    
    setEditingId(song.id); // We edit this specific list item UI
    setEditTitle(originalSong ? originalSong.title : song.title);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    
    const realId = id.includes('_') ? id.split('_')[0] : id;

    try {
      const res = await fetch(`/api/song/${realId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle })
      });
      
      if (res.ok) {
        setSheets(prev => prev.map(s => s.id === realId ? { ...s, title: editTitle } : s));
        setEditingId(null);
        router.refresh();
      } else {
        alert('更新失败');
      }
    } catch (e) {
      alert('更新出错');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlay = (song: Song) => {
    if (!song.files?.audio) return;

    // Check if player window is active via localStorage heartbeat
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    if (!isActive) {
      // Case 1: New Window - Open directly with URL
      const width = 1200;
      const height = 800;
      const left = (window.screen.availWidth - width) / 2;
      const top = (window.screen.availHeight - height) / 2;
      
      const playerWin = window.open(
        `/song/${song.id}`, 
        'music_player_window', 
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
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
          cover: song.cover || (song.files?.image ? `/api/file${song.files.image}` : undefined),
          src: song.files?.audio ? `/api/file${song.files.audio}` : undefined,
          lrc: lrc
        };

        const channel = new BroadcastChannel('music_player_channel');
        channel.postMessage({ type: 'PLAY_SONG', song: playerSong });
        channel.close();
      })();
    }
  };

  const letters = Object.keys(groupedSheets);

  return (
    <>
      <div className="relative bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl p-6 mb-8 shadow-xl overflow-hidden text-white">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl font-bold mb-2 tracking-tight flex items-center gap-3">
            <FileText className="w-7 h-7" />
            歌谱资料库
          </h1>
          <p className="text-cyan-50 text-sm mb-4 leading-relaxed">
            收录最全的赞美诗歌谱，支持在线预览与下载，方便教会与团契使用。
          </p>
          <div className="flex gap-4">
             <Link href="/upload" className="bg-white text-blue-600 px-5 py-2 rounded-full font-bold hover:bg-blue-50 transition-colors shadow-lg flex items-center gap-2 text-sm">
               <Plus size={18} />
               上传新歌谱
             </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-1/3 h-full bg-white/10 skew-x-12 transform translate-x-12"></div>
      </div>
      
      {/* Letter Navigation */}
      {letters.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 sticky top-20 z-10">
          <div className="flex flex-wrap gap-2">
            {letters.map(letter => (
              <a 
                key={letter} 
                href={`#letter-${letter}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 hover:text-indigo-600 text-gray-700 font-bold transition-all duration-200 bg-white border border-gray-200 text-sm"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>
      )}
      
      {Object.keys(groupedSheets).length === 0 ? (
        <div className="text-center py-24 text-gray-400 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
            <FileText size={48} />
          </div>
          <p className="text-xl font-medium mb-2 text-gray-800">暂无歌谱</p>
          <p className="text-gray-500 mb-8">开始分享您的第一份歌谱吧</p>
          <Link href="/upload" className="text-white bg-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-700 shadow-lg transition-all inline-block">
            去上传
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSheets).map(([letter, group]) => (
            <div key={letter} id={`letter-${letter}`} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm scroll-mt-28">
              <h2 className="text-xl font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="bg-indigo-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-indigo-500/20 text-lg">
                    {letter}
                  </span>
                  <span className="text-gray-500 text-sm font-normal">{group.length} 首歌曲</span>
                </div>
                <button 
                  onClick={scrollToTop}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-full transition-all"
                  title="返回顶部"
                >
                  <ArrowUp size={20} />
                </button>
              </h2>
              
              {/* Updated grid columns to show 5 items per row on large screens (xl) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {group.map((song) => {
                  const isAdded = isInList(song.id);
                  return (
                    <div key={song.id} className="flex items-center group p-3 border border-gray-100 hover:border-indigo-200 hover:shadow-md bg-white hover:bg-gray-50/50 rounded-xl transition-all duration-300 relative">
                      {/* Sequence Number */}
                      <span className="text-indigo-600/40 text-xs font-mono font-bold shrink-0 mr-3 w-8 text-right">
                        {globalIndices[song.id].toString().padStart(3, '0')}
                      </span>

                      {/* Title & Content */}
                      <div className="flex-1 min-w-0 flex items-center justify-between mr-2">
                        {editingId === song.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input 
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="border border-indigo-500 bg-white text-gray-800 rounded px-2 py-1 text-sm flex-1 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    autoFocus
                                />
                                <button onClick={() => handleSaveEdit(song.id)} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded hover:bg-emerald-100 shrink-0 border border-emerald-200">保存</button>
                                <button onClick={handleCancelEdit} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded hover:bg-gray-100 shrink-0 border border-gray-200">取消</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <a 
                                  href={`/api/file${song.files.sheet}`} 
                                  target="_blank"
                                  className="text-gray-700 hover:text-indigo-600 font-bold text-sm leading-snug truncate"
                                  title={song.title}
                                >
                                  {song.title}
                                </a>
                                {song.files.sheets && song.files.sheets.length > 1 && (
                                   <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded shrink-0 border border-indigo-100">多页</span>
                                )}
                            </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 shadow-sm rounded-l-lg border-l border-gray-100">
                          {/* Add Button */}
                          <button
                            onClick={(e) => { e.preventDefault(); togglePresentation(song); }}
                            title={isAdded ? "已加入演示列表" : "加入演示列表"}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-all duration-200 hover:scale-110 ${
                              isAdded 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                : 'bg-transparent text-gray-400 border-gray-200 hover:border-indigo-500 hover:text-indigo-500'
                            }`}
                          >
                            {isAdded ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                          </button>

                          {song.files?.audio && (
                            <button 
                              onClick={() => handlePlay(song)}
                              className="text-gray-400 hover:text-orange-500 w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-gray-200 hover:border-orange-500 hover:shadow-sm transition-all hover:scale-110"
                              title="播放"
                            >
                              <PlayCircle size={12} />
                            </button>
                          )}
                          
                          {song.files.sheets && song.files.sheets.length > 1 ? (
                              null 
                          ) : (
                              <a 
                                href={`/api/file${song.files.sheet}`} 
                                target="_blank"
                                className="text-gray-400 hover:text-indigo-500 w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-gray-200 hover:border-indigo-500 hover:shadow-sm transition-all hover:scale-110"
                                title="查看"
                              >
                                <Eye size={12} />
                              </a>
                          )}

                          {user?.role === 'admin' && (
                            <>
                              <button 
                                onClick={() => handleEdit(song)}
                                className="text-gray-400 hover:text-indigo-500 w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-gray-200 hover:border-indigo-500 hover:shadow-sm transition-all hover:scale-110"
                                title="编辑名称"
                              >
                                <Edit2 size={12} />
                              </button>

                              <button 
                                onClick={() => handleDelete(song.id)}
                                className="text-gray-400 hover:text-rose-500 w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-gray-200 hover:border-rose-500 hover:shadow-sm transition-all hover:scale-110"
                                title="删除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Presentation Panel - Removed as it's global now */}
    </>
  );
}
