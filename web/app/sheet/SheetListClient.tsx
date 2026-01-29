'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Plus, Check, Eye, ArrowUp, PlayCircle, Edit2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePresentation } from '@/context/PresentationContext';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = ['和弦谱', '五线谱', '吉他谱', '贝斯谱', '鼓谱'];

const normalizeCategory = (cat: string | undefined) => {
    if (!cat) return '和弦谱';
    if (cat === '钢琴谱') return '五线谱';
    if (cat === '简谱' || cat === '官方谱') return '和弦谱';
    return cat;
};

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
    category?: string;
  };
  cover?: string;
};

const detectCategoryFromFilename = (fileName: string): string => {
    if (fileName.match(/五线|Staff/i)) return '五线谱';
    if (fileName.match(/吉他|Guitar/i)) return '吉他谱';
    if (fileName.match(/钢琴|Piano/i)) return '五线谱';
    if (fileName.match(/和弦|Chord/i)) return '和弦谱';
    if (fileName.match(/贝斯|Bass/i)) return '贝斯谱';
    if (fileName.match(/鼓|Drum/i)) return '鼓谱';
    if (fileName.match(/官方|Official/i)) return '和弦谱';
    return '';
};

const extractKeyFromFilename = (fileName: string): string => {
    const match = fileName.match(/\(([A-G][#b♭]?调)\)/);
    return match ? match[1] : '';
};

export default function SheetListClient({ initialSheets }: { initialSheets: Song[] }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('cat');
  
  const [sheets, setSheets] = useState<Song[]>(initialSheets);

  useEffect(() => {
    setSheets(initialSheets);
  }, [initialSheets]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  
  const router = useRouter();
  const { addItem, removeItem: removeFromList, isInList } = usePresentation();

  // Flatten sheets: if a song has multiple sheets, create individual entries for them
  const flattenedSheets = useMemo(() => {
    const flattened: Song[] = [];
    const seenIds = new Set<string>();
    
    sheets.forEach(song => {
      if (song.files.sheets && song.files.sheets.length > 1) {
        // Pre-scan for categories in this song's files to detect mixed content
        const fileCategories = song.files.sheets.map(path => {
            const decoded = decodeURIComponent(path);
            const name = decoded.split('/').pop() || '';
            const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
            return detectCategoryFromFilename(nameWithoutExt);
        });
        const hasExplicitCategory = fileCategories.some(c => c !== '');

        // Multiple sheets - create entry for each
        song.files.sheets.forEach((sheetPath, idx) => {
          // Clone the song but override title and sheet path
          // We use a composite ID to avoid duplicate keys in React list
          const compositeId = `${song.id}_${idx}`;
          if (seenIds.has(compositeId)) return;
          seenIds.add(compositeId);
          
          // Extract filename from path for title display
          const decodedPath = decodeURIComponent(sheetPath);
          const fileNameWithExt = decodedPath.split('/').pop() || '';
          const fileName = fileNameWithExt.replace(/\.[^/.]+$/, ""); // Remove extension

          // Logic to clean name and detect category
          let displayTitle = song.title;
          
          // Detect Category from Filename
          let detectedCategory = detectCategoryFromFilename(fileName);
          let detectedKey = extractKeyFromFilename(fileName);
          
          // If the song has an explicit category stored in files JSON (from upload), use it
          // Note: files.category might be set during upload
          const storedCategory = (song.files as any).category;
          
          // If the stored category is "简谱" (default) but the filename clearly indicates another type, trust the filename.
          // Otherwise, trust the stored category.
          let finalCategory = '';
          
          if (detectedCategory) {
              finalCategory = detectedCategory;
          } else {
              if (hasExplicitCategory) {
                  // If some files in this song have explicit categories, but this one doesn't,
                  // it's likely a simple/chord sheet in a mixed collection.
                  finalCategory = '和弦谱';
              } else {
                  // Uniform collection (e.g. multi-page staff), trust stored category
                  finalCategory = normalizeCategory(storedCategory);
              }
          }

          // Filter based on currentCat
          if (currentCat && currentCat !== '全部') {
             if (finalCategory !== currentCat) {
                 return;
             }
          }

          if (detectedCategory) {
             displayTitle += `(${detectedCategory})`;
          } else if (finalCategory !== '和弦谱' && finalCategory !== '全部') {
             // If category is from DB but not filename, maybe append it too?
             // Or keep it clean if user didn't put it in filename.
             // Let's append it to be clear why it's in this list.
             displayTitle += `(${finalCategory})`;
          }
          
          if (detectedKey) {
             displayTitle += ` ${detectedKey}`;
          }
          
          // Detect Page/Index Suffix (_1, _2, etc)
          // We look for _\d+ at the end. 
          // We also need to be careful not to mistake the timestamp for the index if the filename format changes.
          // But usually timestamp is long.
          // const indexMatch = fileName.match(/_(\d+)$/);
          // if (indexMatch) {
          //    // If the number is short (likely an index, not a timestamp)
          //    if (indexMatch[1].length < 5) {
          //        displayTitle += `_${indexMatch[1]}`;
          //    }
          // }

          // Check if this specific sheet part already exists in flattened array to prevent duplicates
          // This can happen if multiple files map to the same title/id logic or if React strict mode causes re-renders
          // But here we are building a new array.
          // The issue "Duplicate sheets" might be due to `sheets` having duplicate entries or `song.files.sheets` having duplicates.
          // Or the key generation `id: ${song.id}_${idx}` is fine, but maybe we have multiple songs with same content?
          // Let's ensure uniqueness by checking if we already added a song with this ID?
          // No, we are pushing to a local array.
          
          flattened.push({
            ...song,
            id: compositeId, // temporary ID for UI key
            // Use cleaned title
            title: displayTitle, 
            files: {
              ...song.files,
              sheet: sheetPath,
              sheets: undefined // Remove array to treat as single sheet
            }
          });
        });
      } else {
        // Single sheet - keep as is
        if (seenIds.has(song.id)) return;
        seenIds.add(song.id);

        // We still need to check category for filtering
        const sheetPath = song.files.sheet || '';
        const decodedPath = decodeURIComponent(sheetPath);
        const fileNameWithExt = decodedPath.split('/').pop() || '';
        const fileName = fileNameWithExt.replace(/\.[^/.]+$/, "");
        
        let detectedCategory = detectCategoryFromFilename(fileName);
        let detectedKey = extractKeyFromFilename(fileName);
        
        const storedCategory = (song.files as any).category;
        
        let finalCategory = normalizeCategory(storedCategory);
        
        if (detectedCategory && finalCategory === '和弦谱') {
            finalCategory = detectedCategory;
        }

        if (currentCat && currentCat !== '全部') {
            if (finalCategory !== currentCat) return;
        }

        // Also update title for display consistency
        let displayTitle = song.title;
        if (detectedCategory) {
            displayTitle += `(${detectedCategory})`;
        } else if (finalCategory !== '和弦谱' && finalCategory !== '全部') {
            displayTitle += `(${finalCategory})`;
        }

        if (detectedKey) {
            displayTitle += ` ${detectedKey}`;
        }
        
        // Flattened array expects a new object to avoid mutating original state if we modify title
        flattened.push({
            ...song,
            title: displayTitle
        });
      }
    });
    
    // Post-process for unique titles
    const titleCounts: {[key: string]: number} = {};
    const finalSheets = flattened.map(s => {
        let title = s.title;
        // Only append number if we've seen this title before
        // But we need to count first.
        // Actually, the first one shouldn't have a number, the second one " 1" or " 2"?
        // Usually "Title", "Title 2", "Title 3".
        // Or "Title 1", "Title 2".
        // User said "can add serial numbers".
        // Let's go with "Title", "Title 2", etc.
        
        if (titleCounts[title]) {
            titleCounts[title]++;
            title = `${title} ${titleCounts[title]}`;
        } else {
            titleCounts[title] = 1;
        }
        return { ...s, title };
    });
    
    return finalSheets;
  }, [sheets, currentCat]);

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
    
    const realId = id.includes('_') ? id.split('_')[0] : id;
    const isComposite = id.includes('_');
    const index = isComposite ? id.split('_')[1] : null;

    try {
      let url = `/api/song/${realId}`;
      if (index !== null) {
          url += `?sheetIndex=${index}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        
        if (data.updated) {
            // Song was updated (one sheet removed), refresh to get latest data
            router.refresh();
        } else {
            // Song was deleted
            setSheets(prev => prev.filter(s => s.id !== realId));
            removeFromList(realId);
            router.refresh();
        }
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
    // We need to find the original song from `sheets` state to get the clean title.
    const originalSong = sheets.find(s => s.id === realId);
    
    setEditingId(song.id); // We edit this specific list item UI
    if (originalSong) {
        setEditTitle(originalSong.title);
        setEditCategory(normalizeCategory(originalSong.files.category));
    } else {
        setEditTitle(song.title);
        setEditCategory('和弦谱');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    
    const realId = id.includes('_') ? id.split('_')[0] : id;

    try {
      const res = await fetch(`/api/song/${realId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, category: editCategory })
      });
      
      if (res.ok) {
        setSheets(prev => prev.map(s => {
            if (s.id === realId) {
                return { 
                    ...s, 
                    title: editTitle,
                    files: { ...s.files, category: editCategory }
                };
            }
            return s;
        }));
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
    setEditCategory('');
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
      {/* Letter Navigation */}
      {letters.length > 0 && (
        <div className="bg-card backdrop-blur-xl p-4 rounded-xl shadow-sm border border-border mb-4 sticky top-20 z-10">
          <div className="flex flex-wrap gap-2">
            {letters.map(letter => (
              <a 
                key={letter} 
                href={`#letter-${letter}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted hover:text-primary text-muted-foreground font-bold transition-all duration-200 bg-muted/30 border border-border text-sm"
              >
                {letter}
              </a>
            ))}
          </div>
        </div>
      )}
      
      {Object.keys(groupedSheets).length === 0 ? (
        <div className="text-center py-24 text-muted-foreground bg-card backdrop-blur-xl rounded-3xl shadow-sm border border-border">
          <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            <FileText size={48} />
          </div>
          <p className="text-xl font-medium mb-2 text-foreground">暂无歌谱</p>
          <p className="text-muted-foreground mb-8">开始分享您的第一份歌谱吧</p>
          <Link href="/upload" className="text-primary-foreground bg-primary px-8 py-3 rounded-full font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all inline-block">
            去上传
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedSheets).map(([letter, group]) => (
            <div key={letter} id={`letter-${letter}`} className="bg-card backdrop-blur-xl rounded-2xl border border-border p-6 shadow-xl scroll-mt-28">
              <h2 className="text-xl font-bold text-foreground border-b border-border pb-2 mb-2 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className="bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-primary/20 text-lg">
                    {letter}
                  </span>
                  <span className="text-muted-foreground text-sm font-normal">{group.length} 首歌曲</span>
                </div>
                <button 
                  onClick={scrollToTop}
                  className="p-2 text-muted-foreground hover:text-primary hover:bg-muted rounded-full transition-all"
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
                    <div key={song.id} className="flex items-center group p-3 border border-border hover:border-primary/30 hover:shadow-lg bg-muted/30 hover:bg-muted/50 rounded-xl transition-all duration-300 relative">
                      {/* Sequence Number */}
                      <span className="text-primary/40 text-xs font-mono font-bold shrink-0 mr-3 w-8 text-right">
                        {globalIndices[song.id].toString().padStart(3, '0')}
                      </span>

                      {/* Title & Content */}
                      <div className="flex-1 min-w-0 flex items-center justify-between mr-2">
                        {editingId === song.id ? (
                            <div className="flex items-center gap-2 flex-1 relative z-20">
                                <input 
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="border border-primary bg-background text-foreground rounded px-2 py-1 text-sm flex-1 outline-none focus:ring-2 focus:ring-primary/20 min-w-0"
                                    autoFocus
                                />
                                <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="border border-primary bg-background text-foreground rounded px-1 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 w-20 shrink-0"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <button onClick={() => handleSaveEdit(song.id)} className="text-emerald-500 hover:bg-emerald-500/10 p-1 rounded shrink-0 border border-emerald-500/30" title="保存">
                                    <Check size={16} />
                                </button>
                                <button onClick={handleCancelEdit} className="text-muted-foreground hover:bg-muted p-1 rounded shrink-0 border border-border" title="取消">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {song.files.sheet ? (
                                  <a 
                                    href={`/api/file${song.files.sheet}`} 
                                    target="_blank"
                                    className="text-foreground hover:text-primary font-bold text-sm leading-snug truncate transition-colors"
                                    title={song.title}
                                  >
                                    {song.title}
                                  </a>
                                ) : (
                                  <span className="text-foreground font-bold text-sm leading-snug truncate" title={song.title}>
                                    {song.title}
                                  </span>
                                )}
                                {song.files.sheets && song.files.sheets.length > 1 && (
                                   <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0 border border-primary/20">多页</span>
                                )}
                            </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {editingId !== song.id && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/90 backdrop-blur flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2 shadow-sm rounded-l-lg border-l border-border">
                          {/* Add Button */}
                          <button
                            onClick={(e) => { e.preventDefault(); togglePresentation(song); }}
                            title={isAdded ? "已加入演示列表" : "加入演示列表"}
                            className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-all duration-200 hover:scale-110 ${
                              isAdded 
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                                : 'bg-transparent text-muted-foreground border-border hover:border-primary hover:text-primary'
                            }`}
                          >
                            {isAdded ? <Check size={12} strokeWidth={3} /> : <Plus size={12} strokeWidth={3} />}
                          </button>

                          {song.files?.audio && (
                            <button 
                              onClick={() => handlePlay(song)}
                              className="text-muted-foreground hover:text-orange-500 w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-border hover:border-orange-500 hover:shadow-sm transition-all hover:scale-110"
                              title="播放"
                            >
                              <PlayCircle size={12} />
                            </button>
                          )}
                          
                          {song.files.sheets && song.files.sheets.length > 1 ? (
                              null 
                          ) : song.files.sheet ? (
                              <a 
                                href={`/api/file${song.files.sheet}`} 
                                target="_blank"
                                className="text-muted-foreground hover:text-primary w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-border hover:border-primary hover:shadow-sm transition-all hover:scale-110"
                                title="查看"
                              >
                                <Eye size={12} />
                              </a>
                          ) : null}

                          {user?.role === 'admin' && (
                            <>
                              <button 
                                onClick={() => handleEdit(song)}
                                className="text-muted-foreground hover:text-indigo-500 w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-border hover:border-indigo-500 hover:shadow-sm transition-all hover:scale-110"
                                title="编辑名称"
                              >
                                <Edit2 size={12} />
                              </button>

                              <button 
                                onClick={() => handleDelete(song.id)}
                                className="text-muted-foreground hover:text-destructive w-6 h-6 flex items-center justify-center bg-transparent rounded-lg border border-border hover:border-destructive hover:shadow-sm transition-all hover:scale-110"
                                title="删除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                      </div>
                      )}
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
