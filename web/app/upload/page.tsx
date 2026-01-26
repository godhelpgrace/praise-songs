'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import { Upload, FileMusic, Image as ImageIcon, FileText, X, CheckCircle, AlertCircle, Trash2, Edit2, Save } from 'lucide-react';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface SongGroup {
  id: string; // unique key based on filename
  title: string;
  artist: string;
  album: string;
  status: UploadStatus;
  message?: string;
  files: {
    audio?: File;
    sheet?: File[];
    lrc?: File[];
    image?: File;
  }
}

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'album' | 'batch'>('single');
  const [uploading, setUploading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Single Upload State
  const [singleTitle, setSingleTitle] = useState('');
  const [singleArtist, setSingleArtist] = useState('');
  const [singleAlbum, setSingleAlbum] = useState('');
  const [singleDate, setSingleDate] = useState('');
  const [singleFiles, setSingleFiles] = useState<{audio?: File, sheet?: File[], lrc?: File[], image?: File}>({});

  // Album Upload State
  const [albumName, setAlbumName] = useState('');
  const [albumArtist, setAlbumArtist] = useState('');
  const [albumDate, setAlbumDate] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumGenre, setAlbumGenre] = useState('');
  const [albumLanguage, setAlbumLanguage] = useState('');
  const [albumCover, setAlbumCover] = useState<File | undefined>(undefined);
  
  // Batch/Album Groups
  const [songGroups, setSongGroups] = useState<SongGroup[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset groups when tab changes
  useEffect(() => {
    setSongGroups([]);
    setSelectedGroupIds(new Set());
    setGlobalMessage(null);
  }, [activeTab]);

  // Helper to group files
  const groupFiles = (files: File[], defaultArtist = '', defaultAlbum = '') => {
    const groups: Record<string, SongGroup> = {};

    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      
      // Smart grouping: Strip numeric suffixes for sheets/lyrics to group them
      // e.g. "Song_1.jpg", "Song-2.jpg", "Song (1).jpg" -> "Song"
      let groupKey = nameWithoutExt;
      
      // Handle special cover suffix explicitly requested by user
      if (groupKey.endsWith('_封面')) {
          groupKey = groupKey.replace('_封面', '');
      } else if (groupKey.endsWith('-封面')) {
          groupKey = groupKey.replace('-封面', '');
      }

      // Only apply loose grouping for sheets and lrcs usually, but for batch upload consistency,
      // we try to group everything under the common base name.
      // Regex matches: _1, -1, (1), space 1, etc. at the end of string
      // Also matches tonality info like (C调), (D调) and resource types like (官方和弦五线谱), (简谱), (五线谱)
      const suffixRegex = /[-_\s]*(\(\d+\)|（\d+）|\d+|p\d+|page\d+|[（(]([A-G][b#]?\s*调|官方|和弦|五线|简谱|曲谱|歌谱|钢琴|吉他|贝斯|鼓|伴奏|原版|高清|PDF|JPG|Official|Chord|Sheet|Staff|Tab|Bass|Drum|Inst|Backing).*?[)）])$/i;
      
      // If it looks like a sequence part or tonality, strip it to find the base name
      if (suffixRegex.test(groupKey)) {
         groupKey = groupKey.replace(suffixRegex, '');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey + '_' + Date.now(),
          title: groupKey,
          artist: defaultArtist || '未分类歌手',
          album: defaultAlbum || '',
          status: 'pending',
          files: {
            sheet: [],
            lrc: []
          }
        };
      }

      const group = groups[groupKey];

      if (['mp3', 'm4a', 'wav', 'flac', 'aac'].includes(ext) || file.type.startsWith('audio/')) {
        // If multiple audios match the same group, we might be overwriting or should warn. 
        // For now, let's assume the first one or last one wins, or we prioritize the one *without* suffix if it exists?
        // Simple logic: Just assign.
        group.files.audio = file;
        // If the audio file has a cleaner name, maybe use that as title? 
        // But groupKey is already stripped.
      } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || file.type.startsWith('image/')) {
        // Check if it's likely a cover or a sheet
        const lowerName = file.name.toLowerCase();
        if (lowerName.includes('cover') || lowerName.includes('folder') || lowerName.includes('_封面') || lowerName.includes('-封面')) {
             group.files.image = file;
        } else {
             // Assume sheet
             group.files.sheet?.push(file);
        }
      } else if (['lrc', 'txt'].includes(ext)) {
        group.files.lrc?.push(file);
      }
    });

    return Object.values(groups).filter(g => g.files.audio || (g.files.sheet && g.files.sheet.length > 0) || (g.files.lrc && g.files.lrc.length > 0));
  };

  const handleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
      let mediaFiles = files.filter(f => !f.name.toLowerCase().endsWith('.json'));
      
      let currentArtist = activeTab === 'album' ? albumArtist : '';
      let currentAlbum = activeTab === 'album' ? albumName : '';

      // Try to find album cover if in Album mode
      if (activeTab === 'album') {
          const coverFile = mediaFiles.find(f => {
              const name = f.name.toLowerCase();
              return (name.includes('cover') || name.includes('folder') || name.includes('_封面') || name.includes('-封面')) && 
                     ['jpg', 'jpeg', 'png', 'webp'].some(ext => name.endsWith(ext));
          });
          
          if (coverFile) {
              if (!albumCover) {
                  setAlbumCover(coverFile);
              }
              // Always remove cover from media files so it's not added as a song,
              // regardless of whether we used it to fill albumCover or not.
              // This addresses the user requirement "Cover image, do not recognize to pending upload list"
              mediaFiles = mediaFiles.filter(f => f !== coverFile);
          }
      }

      if (jsonFiles.length > 0) {
          try {
              const text = await jsonFiles[0].text();
              const json = JSON.parse(text);
              if (json.title) {
                  setAlbumName(json.title);
                  currentAlbum = json.title;
              }
              if (json.artist) {
                  setAlbumArtist(json.artist);
                  currentArtist = json.artist;
              }
              if (json.release_date) setAlbumDate(json.release_date);
              if (json.description) setAlbumDescription(json.description);
              if (json.genre) setAlbumGenre(json.genre);
              if (json.language) setAlbumLanguage(json.language);
              
              setGlobalMessage({ type: 'success', text: '专辑信息解析成功！' });
          } catch (e) {
              setGlobalMessage({ type: 'error', text: '解析 JSON 失败' });
          }
      }

      const newGroups = groupFiles(mediaFiles, currentArtist, currentAlbum);
      setSongGroups(prev => [...prev, ...newGroups]);
    }
    e.target.value = '';
  };

  const removeGroup = (id: string) => {
    setSongGroups(prev => prev.filter(g => g.id !== id));
    if (selectedGroupIds.has(id)) {
        const newSet = new Set(selectedGroupIds);
        newSet.delete(id);
        setSelectedGroupIds(newSet);
    }
  };

  const toggleGroupSelection = (id: string) => {
    const newSet = new Set(selectedGroupIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedGroupIds(newSet);
  };

  const mergeSelectedGroups = () => {
    if (selectedGroupIds.size < 2) return;
    
    // Find selected groups in order
    const selectedGroups = songGroups.filter(g => selectedGroupIds.has(g.id));
    if (selectedGroups.length === 0) return;

    // Base the new group on the first one, or the one with audio
    const primaryGroup = selectedGroups.find(g => g.files.audio) || selectedGroups[0];
    
    const newGroup: SongGroup = {
        ...primaryGroup,
        id: `merged_${Date.now()}`,
        files: { ...primaryGroup.files } // Clone files
    };

    // Merge files from other groups
    selectedGroups.forEach(g => {
        if (g.id === primaryGroup.id) return;
        
        // Merge Audio (Only if primary doesn't have one, or maybe warn? We stick to primary)
        if (!newGroup.files.audio && g.files.audio) {
            newGroup.files.audio = g.files.audio;
            // Also update title/artist if we are switching primary source logic effectively
            // But we keep primaryGroup's metadata for now unless empty
        }

        // Merge Sheets
        if (g.files.sheet && g.files.sheet.length > 0) {
            newGroup.files.sheet = [...(newGroup.files.sheet || []), ...g.files.sheet];
        }

        // Merge LRCs
        if (g.files.lrc && g.files.lrc.length > 0) {
            newGroup.files.lrc = [...(newGroup.files.lrc || []), ...g.files.lrc];
        }

        // Merge Image (If primary doesn't have one)
        if (!newGroup.files.image && g.files.image) {
            newGroup.files.image = g.files.image;
        }
    });

    // Remove selected groups and insert new group at the position of the first selected group
    const firstIndex = songGroups.findIndex(g => selectedGroupIds.has(g.id));
    const newSongGroups = [...songGroups];
    
    // Filter out all selected
    const remaining = newSongGroups.filter(g => !selectedGroupIds.has(g.id));
    
    // Insert new group at firstIndex (readjusted)
    // Actually simpler: just filter out selected, then splice in? 
    // But index shifts. 
    // Let's just create a new array.
    
    // We want to preserve order of non-selected items.
    // And place the merged item where the FIRST selected item was.
    const finalGroups: SongGroup[] = [];
    let inserted = false;
    
    songGroups.forEach((g, index) => {
        if (selectedGroupIds.has(g.id)) {
            if (!inserted) {
                finalGroups.push(newGroup);
                inserted = true;
            }
        } else {
            finalGroups.push(g);
        }
    });

    setSongGroups(finalGroups);
    setSelectedGroupIds(new Set());
    setGlobalMessage({ type: 'success', text: `已合并 ${selectedGroups.length} 个分组` });
  };

  const updateGroupMetadata = (id: string, field: 'title' | 'artist' | 'album', value: string) => {
    setSongGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const uploadGroup = async (group: SongGroup, globalAlbumCover?: File) => {
    const formData = new FormData();
    formData.append('title', group.title);
    formData.append('artist', group.artist);
    formData.append('album', group.album);
    
    if (activeTab === 'album') {
        if (albumDate) formData.append('releaseDate', albumDate);
        if (albumDescription) formData.append('description', albumDescription);
        if (albumGenre) formData.append('genre', albumGenre);
        if (albumLanguage) formData.append('language', albumLanguage);
    }
    
    if (group.files.audio) formData.append('audioFile', group.files.audio);
    
    // Append multiple sheets
    if (group.files.sheet && group.files.sheet.length > 0) {
        group.files.sheet.forEach(f => formData.append('sheetFile', f));
    }
    
    // Append multiple lrcs
    if (group.files.lrc && group.files.lrc.length > 0) {
        group.files.lrc.forEach(f => formData.append('lrcFile', f));
    }
    
    // Send album cover only if available
    if (globalAlbumCover) {
        formData.append('imageFile', globalAlbumCover);
    } else if (group.files.image) {
        formData.append('imageFile', group.files.image);
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      } else {
        return { success: false, message: data.error || '上传失败' };
      }
    } catch (e) {
      return { success: false, message: '网络错误' };
    }
  };



  const handleBatchUpload = async () => {
    if (songGroups.length === 0) return;
    setUploading(true);
    setGlobalMessage(null);
    
    const newGroups = [...songGroups];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < newGroups.length; i++) {
      if (newGroups[i].status === 'success') {
          successCount++;
          continue; 
      }

      newGroups[i].status = 'uploading';
      setSongGroups([...newGroups]); // Force re-render

      const result = await uploadGroup(newGroups[i], activeTab === 'album' ? albumCover : undefined);
      
      if (result.success) {
        newGroups[i].status = 'success';
        successCount++;
      } else {
        newGroups[i].status = 'error';
        newGroups[i].message = result.message;
        failCount++;
      }
      setSongGroups([...newGroups]);
    }

    setUploading(false);
    if (failCount === 0) {
        setGlobalMessage({ type: 'success', text: `全部 ${successCount} 首歌曲上传成功！` });
    } else {
        setGlobalMessage({ type: 'error', text: `上传完成：${successCount} 成功，${failCount} 失败。` });
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setGlobalMessage(null);
    
    const formData = new FormData();
    formData.append('title', singleTitle);
    formData.append('artist', singleArtist);
    formData.append('album', singleAlbum);
    formData.append('releaseDate', singleDate);
    
    if (singleFiles.audio) formData.append('audioFile', singleFiles.audio);
    
    if (singleFiles.sheet && singleFiles.sheet.length > 0) {
        singleFiles.sheet.forEach(f => formData.append('sheetFile', f));
    }
    
    if (singleFiles.lrc && singleFiles.lrc.length > 0) {
        singleFiles.lrc.forEach(f => formData.append('lrcFile', f));
    }
    
    if (singleFiles.image) formData.append('imageFile', singleFiles.image);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
            setGlobalMessage({ type: 'success', text: '上传成功！' });
            // Reset
            setSingleTitle('');
            setSingleFiles({});
            // Keep Artist/Album for convenience? Maybe not.
        } else {
            setGlobalMessage({ type: 'error', text: data.error || '上传失败' });
        }
    } catch (e) {
        setGlobalMessage({ type: 'error', text: '网络错误' });
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-10 mb-8 shadow-xl overflow-hidden text-white">
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-4xl font-bold mb-4 tracking-tight flex items-center gap-3">
                <Upload className="w-10 h-10" />
                资源上传中心
              </h1>
              <p className="text-blue-50 text-lg leading-relaxed">
                支持音频、歌谱、歌词关联上传与元数据管理，共同建设丰富的赞美诗资料库。
              </p>
            </div>
            <div className="absolute right-0 top-0 w-1/3 h-full bg-white/10 skew-x-12 transform translate-x-12"></div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm p-8 min-h-[600px] border border-gray-100">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
              {(['single', 'album', 'batch'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-4 text-sm font-bold transition-all relative capitalize rounded-t-lg ${
                    activeTab === tab 
                        ? 'text-blue-600 bg-blue-50/50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {{single: '单曲上传', album: '专辑上传', batch: '批量上传'}[tab]}
                    {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />
                    )}
                </button>
              ))}
            </div>

            {globalMessage && (
              <div className={`p-4 rounded mb-6 flex items-center gap-2 ${globalMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {globalMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <p>{globalMessage.text}</p>
              </div>
            )}

            {/* Single Upload Form */}
            {activeTab === 'single' && (
              <form onSubmit={handleSingleSubmit} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">歌曲标题 *</label>
                    <input 
                      required
                      value={singleTitle}
                      onChange={(e) => setSingleTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">歌手/音乐人 *</label>
                    <input 
                      required
                      value={singleArtist}
                      onChange={(e) => setSingleArtist(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">所属专辑</label>
                    <input 
                      value={singleAlbum}
                      onChange={(e) => setSingleAlbum(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">发行日期</label>
                    <input 
                      type="date"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                    {[
                        { key: 'audio', label: '音频文件 (MP3)', icon: FileMusic, accept: 'audio/*' },
                        { key: 'sheet', label: '歌谱图片', icon: ImageIcon, accept: 'image/*' },
                        { key: 'lrc', label: 'LRC 歌词', icon: FileText, accept: '.lrc,.txt' },
                        { key: 'image', label: '封面图片', icon: ImageIcon, accept: 'image/*' },
                    ].map(item => (
                        <div key={item.key} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <label className="cursor-pointer flex flex-col items-center gap-2">
                                <item.icon className={`w-6 h-6 ${
                                    (Array.isArray(singleFiles[item.key as keyof typeof singleFiles]) 
                                        ? (singleFiles[item.key as keyof typeof singleFiles] as File[]).length > 0 
                                        : singleFiles[item.key as keyof typeof singleFiles])
                                    ? 'text-blue-500' : 'text-gray-400'
                                }`} />
                                <span className="text-sm font-medium text-gray-600 truncate max-w-full">
                                    {Array.isArray(singleFiles[item.key as keyof typeof singleFiles]) 
                                        ? ((singleFiles[item.key as keyof typeof singleFiles] as File[]).length > 0 
                                            ? `${(singleFiles[item.key as keyof typeof singleFiles] as File[]).length} 个文件` 
                                            : item.label)
                                        : ((singleFiles[item.key as keyof typeof singleFiles] as File)?.name || item.label)
                                    }
                                </span>
                                <input 
                                    type="file" 
                                    accept={item.accept} 
                                    multiple={item.key === 'sheet' || item.key === 'lrc'}
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            if (item.key === 'sheet' || item.key === 'lrc') {
                                                setSingleFiles(prev => ({ ...prev, [item.key]: Array.from(e.target.files!) }));
                                            } else {
                                                const file = e.target.files[0];
                                                setSingleFiles(prev => ({ ...prev, [item.key]: file }));
                                                if (item.key === 'audio' && !singleTitle) {
                                                    setSingleTitle(file.name.replace(/\.[^/.]+$/, ""));
                                                }
                                            }
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    ))}
                </div>

                <div className="pt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {uploading ? '上传中...' : '确认上传'}
                  </button>
                </div>
              </form>
            )}

            {/* Album & Batch Upload Interface */}
            {(activeTab === 'album' || activeTab === 'batch') && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-6 bg-white/40 backdrop-blur-sm border border-white/40 p-6 rounded-lg mb-6">
                    {activeTab === 'album' && (
                        <div className="col-span-1 space-y-2">
                            <label className="block text-sm font-medium text-gray-700">专辑名称 *</label>
                            <input 
                                required
                                value={albumName}
                                onChange={(e) => {
                                    setAlbumName(e.target.value);
                                    setSongGroups(prev => prev.map(g => ({ ...g, album: e.target.value })));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                                placeholder="专辑名"
                            />
                        </div>
                    )}
                    <div className="col-span-1 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">艺术家 {activeTab === 'batch' && '(默认)'}</label>
                        <input 
                            required={activeTab === 'album'}
                            value={albumArtist}
                            onChange={(e) => {
                                setAlbumArtist(e.target.value);
                                setSongGroups(prev => prev.map(g => ({ ...g, artist: e.target.value || '未分类歌手' })));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                            placeholder="艺术家"
                        />
                    </div>
                    {activeTab === 'album' && (
                        <div className="col-span-1 space-y-2">
                             <label className="block text-sm font-medium text-gray-700">专辑封面</label>
                             <label className="flex items-center gap-2 cursor-pointer border border-gray-300 rounded-md px-3 py-2 bg-white hover:bg-gray-50">
                                <ImageIcon size={16} className="text-gray-500" />
                                <span className="text-sm text-gray-600 truncate">{albumCover?.name || '选择封面'}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => setAlbumCover(e.target.files?.[0])} />
                             </label>
                        </div>
                    )}
                </div>

                {/* File Drop / Selection Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:bg-gray-50 transition-colors text-center">
                    <label className="cursor-pointer flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                            <FileMusic className="w-8 h-8" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-800">点击选择文件 (支持多选)</p>
                            <p className="text-sm text-gray-500 mt-1">系统将自动根据文件名分组 (音频+歌谱+歌词)</p>
                        </div>
                        <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            onChange={handleBatchFilesChange} 
                        />
                    </label>
                </div>

                {/* Groups List */}
                {songGroups.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">待上传列表 ({songGroups.length})</h3>
                            <div className="flex items-center gap-2">
                                {selectedGroupIds.size > 1 && (
                                    <button 
                                        onClick={mergeSelectedGroups}
                                        className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                                    >
                                        合并选中 ({selectedGroupIds.size})
                                    </button>
                                )}
                                <button onClick={() => setSongGroups([])} className="text-sm text-red-500 hover:text-red-700">清空列表</button>
                            </div>
                        </div>
                        
                        <div className="grid gap-4">
                            {songGroups.map(group => (
                                <div key={group.id} className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${group.status === 'error' ? 'border-red-300 bg-red-50' : group.status === 'success' ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                                    {/* Selection Checkbox */}
                                    <div className="shrink-0">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedGroupIds.has(group.id)} 
                                            onChange={() => toggleGroupSelection(group.id)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>

                                    {/* Status Icon */}
                                    <div className="shrink-0">
                                        {group.status === 'pending' && <div className="w-3 h-3 rounded-full bg-gray-300" />}
                                        {group.status === 'uploading' && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                                        {group.status === 'success' && <CheckCircle className="text-green-500" size={20} />}
                                        {group.status === 'error' && <AlertCircle className="text-red-500" size={20} />}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                                        {/* Metadata Inputs */}
                                        <div className="col-span-4 space-y-1">
                                            <input 
                                                value={group.title} 
                                                onChange={(e) => updateGroupMetadata(group.id, 'title', e.target.value)}
                                                className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none text-gray-900"
                                                placeholder="标题"
                                            />
                                            <div className="flex gap-2">
                                                <input 
                                                    value={group.artist} 
                                                    onChange={(e) => updateGroupMetadata(group.id, 'artist', e.target.value)}
                                                    className="w-1/2 text-xs text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
                                                    placeholder="艺术家"
                                                />
                                                <input 
                                                    value={group.album} 
                                                    onChange={(e) => updateGroupMetadata(group.id, 'album', e.target.value)}
                                                    className="w-1/2 text-xs text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
                                                    placeholder="专辑"
                                                />
                                            </div>
                                        </div>

                                        {/* File Indicators */}
                                        <div className="col-span-6 flex gap-3 text-xs text-gray-500">
                                            {group.files.audio && <span className="flex items-center gap-1 text-blue-600"><FileMusic size={14}/> {group.files.audio.name}</span>}
                                            {group.files.sheet && group.files.sheet.length > 0 && <span className="flex items-center gap-1 text-purple-600"><ImageIcon size={14}/> 歌谱({group.files.sheet.length})</span>}
                                            {group.files.lrc && group.files.lrc.length > 0 && <span className="flex items-center gap-1 text-orange-600"><FileText size={14}/> 歌词({group.files.lrc.length})</span>}
                                        </div>

                                        {/* Error Msg */}
                                        {group.message && <div className="col-span-2 text-xs text-red-500 truncate" title={group.message}>{group.message}</div>}
                                    </div>

                                    {/* Actions */}
                                    <button onClick={() => removeGroup(group.id)} className="text-gray-400 hover:text-red-500">
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleBatchUpload}
                                disabled={uploading || songGroups.length === 0}
                                className="bg-blue-600 text-white px-8 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {uploading ? '上传中...' : '开始上传全部'}
                            </button>
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
