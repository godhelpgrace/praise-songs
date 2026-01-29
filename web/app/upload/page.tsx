'use client';

import { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import { Upload, FileMusic, Image as ImageIcon, FileText, X, CheckCircle, AlertCircle, Trash2, Edit2, Save, FileVideo, SkipForward } from 'lucide-react';
import * as mm from 'music-metadata-browser';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error' | 'conflict' | 'skipped';

interface SongGroup {
  id: string; // unique key based on filename
  title: string;
  artist: string;
  album: string;
  category: string; // Default: 简谱
  status: UploadStatus;
  message?: string;
  conflictDetails?: {
      conflicts: string[];
      uploadedTypes: string[];
  };
  files: {
    audio?: File;
    sheet?: File[];
    lrc?: File[];
    image?: File;
    video?: File;
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
  const [singleFiles, setSingleFiles] = useState<{audio?: File, sheet?: File[], lrc?: File[], image?: File, video?: File}>({});

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
  const [conflictStrategy, setConflictStrategy] = useState<'ask' | 'skip' | 'overwrite'>('skip');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset groups when tab changes
  useEffect(() => {
    setSongGroups([]);
    setSelectedGroupIds(new Set());
    setGlobalMessage(null);
  }, [activeTab]);

  // Helper to detect category from filename
  const detectCategory = (filename: string) => {
    if (filename.includes('五线')) return '五线谱';
    if (filename.includes('吉他')) return '吉他谱';
    if (filename.includes('钢琴')) return '钢琴谱';
    if (filename.includes('和弦')) return '和弦谱';
    if (filename.includes('鼓')) return '鼓谱';
    if (filename.includes('贝斯')) return '贝斯谱';
    return '简谱'; // Default
  };

  // Helper to fix mojibake (GBK misinterpreted as ISO-8859-1)
  const fixEncoding = (str: string | undefined): string | undefined => {
    if (!str) return str;
    
    // Check if string contains characters in the range 0x80-0xFF (Latin-1 Supplement)
    // and NO characters > 0xFF. This strongly suggests single-byte interpretation of multibyte charset.
    let hasHighByte = false;
    let hasMultiByte = false;
    
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code > 0xff) {
            hasMultiByte = true;
            break;
        }
        if (code >= 0x80 && code <= 0xff) {
            hasHighByte = true;
        }
    }

    if (hasHighByte && !hasMultiByte) {
        try {
            const bytes = new Uint8Array(str.length);
            for (let i = 0; i < str.length; i++) {
                bytes[i] = str.charCodeAt(i);
            }
            const decoder = new TextDecoder('gbk');
            return decoder.decode(bytes);
        } catch (e) {
            console.warn('Failed to decode GBK:', e);
            return str;
        }
    }
    
    return str;
  };

  const extractMetadata = async (file: File) => {
    try {
      const metadata = await mm.parseBlob(file);
      return {
        title: fixEncoding(metadata.common.title),
        artist: fixEncoding(metadata.common.artist),
        album: fixEncoding(metadata.common.album),
        year: metadata.common.year,
        picture: metadata.common.picture?.[0]
      };
    } catch (e) {
      console.error('Error parsing metadata:', e);
      return null;
    }
  };

  const readTextFile = (file: File, encoding = 'utf-8'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file, encoding);
    });
  };

  const parseLrcMetadata = async (file: File) => {
    try {
      // First try UTF-8
      let text = await readTextFile(file, 'utf-8');
      
      let artistMatch = text.match(/\[ar:\s*(.*?)\s*\]/i);
      let titleMatch = text.match(/\[ti:\s*(.*?)\s*\]/i);
      let albumMatch = text.match(/\[al:\s*(.*?)\s*\]/i);

      // Check for replacement character \uFFFD which indicates UTF-8 decoding error
      const hasMojibake = text.includes('\uFFFD');

      // If no tags found OR looks like mojibake, try GBK
      if ((!artistMatch && !albumMatch && !titleMatch) || hasMojibake) {
          try {
            // Try GBK (common for old Chinese LRC files)
            const gbkText = await readTextFile(file, 'gbk');
            const gbkArtist = gbkText.match(/\[ar:\s*(.*?)\s*\]/i);
            const gbkTitle = gbkText.match(/\[ti:\s*(.*?)\s*\]/i);
            const gbkAlbum = gbkText.match(/\[al:\s*(.*?)\s*\]/i);
            
            // If GBK produced matches, use them
            if (gbkArtist || gbkTitle || gbkAlbum) {
                artistMatch = gbkArtist;
                titleMatch = gbkTitle;
                albumMatch = gbkAlbum;
            }
          } catch (gbkError) {
             console.warn('GBK decode failed, falling back to UTF-8 result');
          }
      }
      
      return {
        artist: artistMatch ? artistMatch[1].trim() : null,
        title: titleMatch ? titleMatch[1].trim() : null,
        album: albumMatch ? albumMatch[1].trim() : null
      };
    } catch (e) {
      console.error('Error parsing lrc:', e);
      return null;
    }
  };

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
          category: detectCategory(file.name), // Initial detection
          status: 'pending',
          files: {
            sheet: [],
            lrc: []
          }
        };
      }

      const group = groups[groupKey];

      // Update category if current file provides better hint (e.g. sheet file vs audio file)
      // If current category is default '简谱', and this file suggests something else, update it.
      if (group.category === '简谱') {
          const detected = detectCategory(file.name);
          if (detected !== '简谱') {
              group.category = detected;
          }
      }

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
      } else if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext) || file.type.startsWith('video/')) {
        group.files.video = file;
      }
    });

    return Object.values(groups).filter(g => g.files.audio || (g.files.sheet && g.files.sheet.length > 0) || (g.files.lrc && g.files.lrc.length > 0) || g.files.video);
  };

  // Helper to extract album name from cover filename
  const extractAlbumNameFromCover = (file: File): string | null => {
      const lastDotIndex = file.name.lastIndexOf('.');
      const nameWithoutExt = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
      let extractedName = null;
      
      // Handle _封面, -封面, or just 封面 suffix
      if (nameWithoutExt.endsWith('_封面')) {
          extractedName = nameWithoutExt.substring(0, nameWithoutExt.length - 3);
      } else if (nameWithoutExt.endsWith('-封面')) {
          extractedName = nameWithoutExt.substring(0, nameWithoutExt.length - 3);
      } else if (nameWithoutExt.endsWith('封面')) {
           if (nameWithoutExt !== '封面') {
               extractedName = nameWithoutExt.substring(0, nameWithoutExt.length - 2);
           }
      }
      
      if (extractedName) {
          return extractedName.replace(/[-_]$/, '').trim();
      }
      return null;
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
          // Find cover file
          const coverFile = mediaFiles.find(f => {
              const name = f.name.toLowerCase().trim();
              return (name.includes('cover') || name.includes('folder') || name.includes('_封面') || name.includes('-封面') || name.includes('封面')) && 
                     ['jpg', 'jpeg', 'png', 'webp'].some(ext => name.endsWith(ext));
          });
          
          if (coverFile) {
              if (!albumCover) {
                  setAlbumCover(coverFile);
              }

              // Extract album name from filename if it matches pattern "AlbumName_封面.ext"
              if (!currentAlbum) {
                  const extracted = extractAlbumNameFromCover(coverFile);
                  if (extracted) {
                      setAlbumName(extracted);
                      currentAlbum = extracted;
                  }
              }

              // Always remove cover from media files so it's not added as a song,
              // regardless of whether we used it to fill albumCover or not.
              mediaFiles = mediaFiles.filter(f => f !== coverFile);
          }
      }

      // Try to extract Album Name from folder name (webkitRelativePath) if available and not set
      if (activeTab === 'album' && !currentAlbum && mediaFiles.length > 0) {
           const firstFile = mediaFiles[0] as any;
           if (firstFile.webkitRelativePath) {
               const parts = firstFile.webkitRelativePath.split('/');
               if (parts.length > 1) {
                   const folderName = parts[0];
                   setAlbumName(folderName);
                   currentAlbum = folderName;
               }
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

      // Try to extract Artist from LRC files if not set
      if (activeTab === 'album' && !currentArtist) {
          const lrcFiles = mediaFiles.filter(f => f.name.toLowerCase().endsWith('.lrc'));
          if (lrcFiles.length > 0) {
              // Try ALL LRC files until we find an artist (limit to first 10 to save time)
              for (const lrcFile of lrcFiles.slice(0, 10)) {
                  const lrcMeta = await parseLrcMetadata(lrcFile);
                  if (lrcMeta?.artist) {
                      setAlbumArtist(lrcMeta.artist);
                      currentArtist = lrcMeta.artist;
                      break; 
                  }
              }
          }
      }

      const newGroups = groupFiles(mediaFiles, currentArtist, currentAlbum);
      
      setSongGroups(prev => {
        const combined = [...prev, ...newGroups];
        
        // In Album Mode, if we detected global info, apply it to ALL groups
        // This ensures that even if we detected it late (e.g. from the last file), it applies to the first file
        if (activeTab === 'album') {
            return combined.map(g => ({
                ...g,
                // Only overwrite if we have a value and the group doesn't (or we want to enforce album uniformity)
                album: currentAlbum || g.album,
                artist: (currentArtist && (!g.artist || g.artist === '未分类歌手')) ? currentArtist : g.artist
            }));
        }
        return combined;
      });

      // Extract metadata for audio files
      newGroups.forEach(group => {
        if (group.files.audio) {
          extractMetadata(group.files.audio).then(metadata => {
            if (metadata) {
              setSongGroups(prev => prev.map(g => {
                if (g.id === group.id) {
                  return {
                    ...g,
                    title: metadata.title || g.title,
                    artist: (metadata.artist && (!g.artist || g.artist === '未分类歌手')) ? metadata.artist : g.artist,
                    album: (metadata.album && !g.album) ? metadata.album : g.album
                  };
                }
                return g;
              }));

              // Auto-fill Global Album Info if in Album mode
              // Only if we don't have it yet
              if (activeTab === 'album') {
                  if (metadata.album && !albumName) {
                      setAlbumName(metadata.album);
                      // Also update all groups that don't have album set
                      setSongGroups(prev => prev.map(g => !g.album ? { ...g, album: metadata.album! } : g));
                  }
                  if (metadata.artist && !albumArtist) {
                      setAlbumArtist(metadata.artist);
                      setSongGroups(prev => prev.map(g => (!g.artist || g.artist === '未分类歌手') ? { ...g, artist: metadata.artist! } : g));
                  }
              }
            }
          });
        }
      });
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
        
        // If merging a non-default category into a default one, prefer the specific one
        if (newGroup.category === '简谱' && g.category !== '简谱') {
            newGroup.category = g.category;
        }

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

  const updateGroupMetadata = (id: string, field: 'title' | 'artist' | 'album' | 'category', value: string) => {
    setSongGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const uploadGroup = async (group: SongGroup, globalAlbumCover?: File, force = false) => {
    const formData = new FormData();
    if (force) formData.append('force', 'true');
    formData.append('title', group.title);
    formData.append('artist', group.artist);
    formData.append('album', group.album);
    formData.append('category', group.category || '简谱');
    
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

    let songId: string | null = null;

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        songId = data.data?.id;
      } else if (res.status === 409) {
        return { success: false, status: 'conflict', details: data, message: '发现重复歌曲' };
      } else {
        return { success: false, message: data.error || '上传失败' };
      }

      // Upload Video if exists
      if (group.files.video) {
          const videoFormData = new FormData();
          videoFormData.append('title', group.title);
          videoFormData.append('artist', group.artist);
          if (songId) videoFormData.append('songId', songId);
          if (force) videoFormData.append('force', 'true');
          
          videoFormData.append('videoFile', group.files.video);
          
          // Use group image or album cover as video cover
          if (globalAlbumCover) {
              videoFormData.append('coverFile', globalAlbumCover);
          } else if (group.files.image) {
              videoFormData.append('coverFile', group.files.image);
          }

          const videoRes = await fetch('/api/video/upload', {
              method: 'POST',
              body: videoFormData
          });
          
          if (!videoRes.ok) {
              const videoData = await videoRes.json();
              return { success: false, message: '视频上传失败: ' + (videoData.error || 'Unknown') };
          }
      }

      return { success: true };
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
    let skipCount = 0;

    for (let i = 0; i < newGroups.length; i++) {
      if (newGroups[i].status === 'success' || newGroups[i].status === 'skipped') {
          if (newGroups[i].status === 'success') successCount++;
          if (newGroups[i].status === 'skipped') skipCount++;
          continue; 
      }

      newGroups[i].status = 'uploading';
      setSongGroups([...newGroups]); // Force re-render

      let force = false;
      if (conflictStrategy === 'overwrite') {
          force = true;
      }

      const result = await uploadGroup(newGroups[i], activeTab === 'album' ? albumCover : undefined, force);
      
      if (result.success) {
        newGroups[i].status = 'success';
        successCount++;
      } else if (result.status === 'conflict') {
        if (conflictStrategy === 'skip') {
            newGroups[i].status = 'skipped';
            newGroups[i].message = '已跳过重复文件';
            skipCount++;
        } else {
            newGroups[i].status = 'conflict';
            newGroups[i].message = result.message;
            newGroups[i].conflictDetails = result.details;
            failCount++; // Count conflict as incomplete/fail for now
        }
      } else {
        newGroups[i].status = 'error';
        newGroups[i].message = result.message;
        failCount++;
      }
      setSongGroups([...newGroups]);
    }

    setUploading(false);
    if (failCount === 0) {
        setGlobalMessage({ type: 'success', text: `全部完成！${successCount} 成功，${skipCount} 跳过。` });
    } else {
        setGlobalMessage({ type: 'error', text: `上传完成：${successCount} 成功，${skipCount} 跳过，${failCount} 待处理。` });
    }
  };

  const handleConfirmUpload = async (group: SongGroup) => {
      setSongGroups(prev => prev.map(g => g.id === group.id ? { ...g, status: 'uploading' } : g));
      
      const result = await uploadGroup(group, activeTab === 'album' ? albumCover : undefined, true);
      
      setSongGroups(prev => prev.map(g => {
          if (g.id !== group.id) return g;
          
          if (result.success) {
              return { ...g, status: 'success', message: undefined, conflictDetails: undefined };
          } else {
              return { ...g, status: 'error', message: result.message };
          }
      }));
  };

  const handleSingleBatchFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newFiles = { ...singleFiles }; 
      
      let nextTitle = singleTitle;
      let nextArtist = singleArtist;
      let nextAlbum = singleAlbum;
      let nextDate = singleDate;

      for (const file of files) {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          
          if (['mp3', 'm4a', 'wav', 'flac', 'aac'].includes(ext) || file.type.startsWith('audio/')) {
              newFiles.audio = file;
              // Extract metadata
              const metadata = await extractMetadata(file);
              if (metadata) {
                 nextTitle = metadata.title || nextTitle;
                 nextArtist = metadata.artist || nextArtist;
                 nextAlbum = metadata.album || nextAlbum;
                 if (metadata.year) nextDate = metadata.year.toString();
              }
              // Fallback title
              if (!nextTitle) {
                 nextTitle = file.name.replace(/\.[^/.]+$/, "");
              }
          } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext) || file.type.startsWith('image/')) {
              const lowerName = file.name.toLowerCase();
               if (lowerName.includes('cover') || lowerName.includes('folder') || lowerName.includes('_封面') || lowerName.includes('-封面') || lowerName.includes('封面')) {
                   newFiles.image = file;
               } else {
                   // Append to sheets
                   // Check if already exists to avoid duplicates? 
                   // Simple check by name
                   const exists = newFiles.sheet?.some(f => f.name === file.name && f.size === file.size);
                   if (!exists) {
                       newFiles.sheet = [...(newFiles.sheet || []), file];
                   }
               }
          } else if (['lrc', 'txt'].includes(ext)) {
               const exists = newFiles.lrc?.some(f => f.name === file.name && f.size === file.size);
               if (!exists) {
                   newFiles.lrc = [...(newFiles.lrc || []), file];
               }
               
               // Always extract metadata from LRC (even if file existed or was just added)
               const lrcMeta = await parseLrcMetadata(file);
               if (lrcMeta) {
                  nextTitle = lrcMeta.title || nextTitle;
                  nextArtist = lrcMeta.artist || nextArtist;
                  nextAlbum = lrcMeta.album || nextAlbum;
               }
               
               // Fallback to filename if no title yet
               if (!nextTitle) {
                   nextTitle = file.name.replace(/\.[^/.]+$/, "");
               }
          } else if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext) || file.type.startsWith('video/')) {
               newFiles.video = file;
               if (!nextTitle) {
                   nextTitle = file.name.replace(/\.[^/.]+$/, "");
               }
          }
      }
      setSingleFiles(newFiles);
      setSingleTitle(nextTitle);
      setSingleArtist(nextArtist);
      setSingleAlbum(nextAlbum);
      setSingleDate(nextDate);
      
      e.target.value = ''; 
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
        
        let songId = null;
        if (res.ok) {
            songId = data.data?.id;
        }

        if (res.ok) {
            if (singleFiles.video) {
                 const videoFormData = new FormData();
                 videoFormData.append('title', singleTitle);
                 videoFormData.append('artist', singleArtist);
                 if (songId) videoFormData.append('songId', songId);
                 videoFormData.append('videoFile', singleFiles.video);
                 if (singleFiles.image) videoFormData.append('coverFile', singleFiles.image);

                 const videoRes = await fetch('/api/video/upload', { method: 'POST', body: videoFormData });
                 if (!videoRes.ok) {
                     const videoData = await videoRes.json();
                     setGlobalMessage({ type: 'error', text: '视频上传失败: ' + (videoData.error || 'Unknown') });
                     return;
                 }
            }

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-5xl pb-24">
          <div className="bg-card/50 backdrop-blur-xl rounded-3xl shadow-xl p-8 min-h-[600px] border border-border">
            {/* Tabs */}
            <div className="flex border-b border-border mb-8">
              {(['single', 'album', 'batch'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-4 text-sm font-bold transition-all relative capitalize rounded-t-lg ${
                    activeTab === tab 
                        ? 'text-primary bg-muted' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                    {{single: '单曲上传', album: '专辑上传', batch: '批量上传'}[tab]}
                    {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    )}
                </button>
              ))}
            </div>

            {globalMessage && (
              <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${globalMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                {globalMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <p>{globalMessage.text}</p>
              </div>
            )}

            {/* Single Upload Form */}
            {activeTab === 'single' && (
              <form onSubmit={handleSingleSubmit} className="space-y-6 max-w-3xl">
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-muted-foreground">歌名 *</label>
                        <input 
                        required
                        value={singleTitle}
                        onChange={(e) => setSingleTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-input/50 border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder-muted-foreground transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-muted-foreground">音乐人</label>
                        <input 
                        value={singleArtist}
                        onChange={(e) => setSingleArtist(e.target.value)}
                        className="w-full px-4 py-2.5 bg-input/50 border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder-muted-foreground transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-muted-foreground">所属专辑</label>
                        <input 
                        value={singleAlbum}
                        onChange={(e) => setSingleAlbum(e.target.value)}
                        className="w-full px-4 py-2.5 bg-input/50 border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder-muted-foreground transition-all"
                        />
                    </div>
                  </div>

                  <div>
                    <div className="border-2 border-dashed border-border rounded-2xl p-8 hover:bg-muted/30 transition-all text-center cursor-pointer group">
                        <label className="cursor-pointer flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:text-primary/80 transition-colors">
                                <FileMusic className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground text-lg">点击选择文件 (支持多选)</p>
                                <p className="text-sm text-muted-foreground mt-2">系统将自动识别音频、视频、歌谱、歌词、封面</p>
                            </div>
                            <input 
                                type="file" 
                                multiple 
                                accept="audio/*,image/*,.lrc,.txt,.json,video/*,.mp4,.mov,.webm,.mkv,.avi"
                                className="hidden" 
                                onChange={handleSingleBatchFilesChange} 
                            />
                        </label>
                    </div>
                  </div>
                </div>

                {/* Display Selected Files List */}
                <div className="space-y-2 pt-4">
                    {/* Audio File */}
                    {singleFiles.audio && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileMusic className="text-primary w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium">{singleFiles.audio.name}</p>
                                    <p className="text-xs text-muted-foreground">音频文件 (MP3/WAV...)</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSingleFiles(prev => ({ ...prev, audio: undefined }))}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}

                    {/* Video File */}
                    {singleFiles.video && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileVideo className="text-indigo-500 w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium">{singleFiles.video.name}</p>
                                    <p className="text-xs text-muted-foreground">视频文件 (MP4...)</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSingleFiles(prev => ({ ...prev, video: undefined }))}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}

                    {/* Image/Sheet Files */}
                    {singleFiles.sheet && singleFiles.sheet.map((file, idx) => (
                        <div key={`sheet-${idx}`} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                                <ImageIcon className="text-green-500 w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">歌谱图片</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSingleFiles(prev => ({ ...prev, sheet: prev.sheet?.filter((_, i) => i !== idx) }))}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {/* LRC Files */}
                    {singleFiles.lrc && singleFiles.lrc.map((file, idx) => (
                        <div key={`lrc-${idx}`} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                                <FileText className="text-orange-500 w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">LRC 歌词</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSingleFiles(prev => ({ ...prev, lrc: prev.lrc?.filter((_, i) => i !== idx) }))}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    {/* Cover Image */}
                    {singleFiles.image && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-lg">
                            <div className="flex items-center gap-3">
                                <ImageIcon className="text-pink-500 w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium">{singleFiles.image.name}</p>
                                    <p className="text-xs text-muted-foreground">封面图片</p>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setSingleFiles(prev => ({ ...prev, image: undefined }))}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="pt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={uploading}
                    className="bg-primary text-primary-foreground px-8 py-2.5 rounded-full hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
                  >
                    {uploading ? '上传中...' : '确认上传'}
                  </button>
                </div>
              </form>
            )}

            {/* Album & Batch Upload Interface */}
            {(activeTab === 'album' || activeTab === 'batch') && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-6 bg-muted/30 backdrop-blur-sm border border-border p-6 rounded-2xl mb-6">
                    {activeTab === 'album' && (
                        <div className="col-span-1 space-y-2">
                            <label className="block text-sm font-medium text-muted-foreground">专辑名称 *</label>
                            <input 
                                required
                                value={albumName}
                                onChange={(e) => {
                                    setAlbumName(e.target.value);
                                    setSongGroups(prev => prev.map(g => ({ ...g, album: e.target.value })));
                                }}
                                className="w-full px-4 py-2 bg-input/50 border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder-muted-foreground transition-all"
                                placeholder="专辑名"
                            />
                        </div>
                    )}
                    <div className="col-span-1 space-y-2">
                        <label className="block text-sm font-medium text-muted-foreground">艺术家 {activeTab === 'batch' && '(默认)'}</label>
                        <input 
                            required={activeTab === 'album'}
                            value={albumArtist}
                            onChange={(e) => {
                                setAlbumArtist(e.target.value);
                                setSongGroups(prev => prev.map(g => ({ ...g, artist: e.target.value || '未分类歌手' })));
                            }}
                            className="w-full px-4 py-2 bg-input/50 border border-border rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none text-foreground placeholder-muted-foreground transition-all"
                            placeholder="艺术家"
                        />
                    </div>
                    {activeTab === 'album' && (
                        <div className="col-span-1 space-y-2">
                             <label className="block text-sm font-medium text-muted-foreground">专辑封面</label>
                             <label className="flex items-center gap-2 cursor-pointer border border-border rounded-xl px-4 py-2 bg-input/50 hover:bg-muted/50 transition-colors">
                                <ImageIcon size={16} className="text-muted-foreground" />
                                <span className="text-sm text-muted-foreground truncate">{albumCover?.name || '选择封面'}</span>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setAlbumCover(file);
                                            // Auto-fill Album Name if possible
                                            if (!albumName) {
                                                const extracted = extractAlbumNameFromCover(file);
                                                if (extracted) {
                                                    setAlbumName(extracted);
                                                    // Sync to groups if any
                                                    setSongGroups(prev => prev.map(g => ({ ...g, album: extracted })));
                                                }
                                            }
                                        }
                                    }} 
                                />
                             </label>
                        </div>
                    )}
                </div>

                {/* File Drop / Selection Area */}
                <div className="border-2 border-dashed border-border rounded-2xl p-12 hover:bg-muted/30 transition-all text-center cursor-pointer group">
                    <label className="cursor-pointer flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:text-primary/80 transition-colors">
                            <FileMusic className="w-10 h-10" />
                        </div>
                        <div>
                            <p className="font-bold text-foreground text-lg">点击选择文件 (支持多选)</p>
                            <p className="text-sm text-muted-foreground mt-2">系统将自动根据文件名分组 (音频+视频+歌谱+歌词)</p>
                        </div>
                        <input 
                            type="file" 
                            multiple 
                            accept="audio/*,image/*,.lrc,.txt,.json,video/*,.mp4,.mov,.webm,.mkv,.avi"
                            className="hidden" 
                            onChange={handleBatchFilesChange} 
                        />
                    </label>
                </div>

                {/* Groups List */}
                {songGroups.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-foreground">待上传列表 ({songGroups.length})</h3>
                            <div className="flex items-center gap-3">
                                <select
                                    value={conflictStrategy}
                                    onChange={(e) => setConflictStrategy(e.target.value as any)}
                                    className="text-sm bg-input/50 border border-border rounded-lg px-3 py-1.5 text-muted-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                >
                                    <option value="skip" className="bg-popover text-popover-foreground">重复处理: 跳过现有 (默认)</option>
                                    <option value="ask" className="bg-popover text-popover-foreground">重复处理: 询问</option>
                                    <option value="overwrite" className="bg-popover text-popover-foreground">重复处理: 覆盖/更新</option>
                                </select>
                                {selectedGroupIds.size > 1 && (
                                    <button 
                                        onClick={mergeSelectedGroups}
                                        className="text-sm bg-primary/20 text-primary px-4 py-1.5 rounded-lg hover:bg-primary/30 transition-colors border border-primary/20"
                                    >
                                        合并选中 ({selectedGroupIds.size})
                                    </button>
                                )}
                                <button onClick={() => setSongGroups([])} className="text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors px-2">清空列表</button>
                            </div>
                        </div>
                        
                        <div className="grid gap-4">
                            {songGroups.map(group => (
                                <div key={group.id} className={`bg-muted/30 border rounded-xl p-4 flex flex-col gap-2 transition-all ${group.status === 'error' ? 'border-rose-500/30 bg-rose-500/5' : group.status === 'success' ? 'border-green-500/30 bg-green-500/5' : group.status === 'conflict' ? 'border-orange-500/30 bg-orange-500/5' : 'border-border'}`}>
                                    <div className="flex items-center gap-4 w-full">
                                        {/* Selection Checkbox */}
                                        <div className="shrink-0">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedGroupIds.has(group.id)} 
                                                onChange={() => toggleGroupSelection(group.id)}
                                                className="w-4 h-4 text-primary rounded border-input bg-input focus:ring-primary cursor-pointer"
                                            />
                                        </div>

                                        {/* Status Icon */}
                                        <div className="shrink-0">
                                            {group.status === 'pending' && <div className="w-3 h-3 rounded-full bg-muted-foreground" />}
                                            {group.status === 'uploading' && <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                                            {group.status === 'success' && <CheckCircle className="text-green-500" size={20} />}
                                            {group.status === 'skipped' && <SkipForward className="text-muted-foreground" size={20} />}
                                            {group.status === 'error' && <AlertCircle className="text-rose-500" size={20} />}
                                            {group.status === 'conflict' && <AlertCircle className="text-orange-500" size={20} />}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                                            {/* Metadata Inputs */}
                                            <div className="col-span-4 space-y-1">
                                                <input 
                                                    value={group.title} 
                                                    onChange={(e) => updateGroupMetadata(group.id, 'title', e.target.value)}
                                                    className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none text-foreground placeholder-muted-foreground"
                                                    placeholder="标题"
                                                />
                                                <div className="flex gap-2">
                                                    <input 
                                                        value={group.artist} 
                                                        onChange={(e) => updateGroupMetadata(group.id, 'artist', e.target.value)}
                                                        className="w-1/3 text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none placeholder-muted-foreground"
                                                        placeholder="艺术家"
                                                    />
                                                    <input 
                                                        value={group.album} 
                                                        onChange={(e) => updateGroupMetadata(group.id, 'album', e.target.value)}
                                                        className="w-1/3 text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none placeholder-muted-foreground"
                                                        placeholder="专辑"
                                                    />
                                                    <select
                                                        value={group.category}
                                                        onChange={(e) => updateGroupMetadata(group.id, 'category', e.target.value)}
                                                        className="w-1/3 text-xs text-muted-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none cursor-pointer appearance-none"
                                                    >
                                                        <option value="简谱" className="bg-popover text-popover-foreground">简谱</option>
                                                        <option value="五线谱" className="bg-popover text-popover-foreground">五线谱</option>
                                                        <option value="吉他谱" className="bg-popover text-popover-foreground">吉他谱</option>
                                                        <option value="钢琴谱" className="bg-popover text-popover-foreground">钢琴谱</option>
                                                        <option value="和弦谱" className="bg-popover text-popover-foreground">和弦谱</option>
                                                        <option value="贝斯谱" className="bg-popover text-popover-foreground">贝斯谱</option>
                                                        <option value="鼓谱" className="bg-popover text-popover-foreground">鼓谱</option>
                                                        <option value="其他" className="bg-popover text-popover-foreground">其他</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* File Indicators */}
                                            <div className="col-span-6 flex gap-3 text-xs text-muted-foreground">
                                                {group.files.audio && <span className="flex items-center gap-1 text-primary"><FileMusic size={14}/> {group.files.audio.name}</span>}
                                                {group.files.video && <span className="flex items-center gap-1 text-rose-500"><FileVideo size={14}/> {group.files.video.name}</span>}
                                                {group.files.sheet && group.files.sheet.length > 0 && <span className="flex items-center gap-1 text-violet-500"><ImageIcon size={14}/> 歌谱({group.files.sheet.length})</span>}
                                                {group.files.lrc && group.files.lrc.length > 0 && <span className="flex items-center gap-1 text-orange-500"><FileText size={14}/> 歌词({group.files.lrc.length})</span>}
                                            </div>

                                            {/* Error Msg */}
                                            {group.message && !group.status.includes('conflict') && <div className="col-span-2 text-xs text-rose-500 truncate" title={group.message}>{group.message}</div>}
                                        </div>

                                        {/* Actions */}
                                        <button onClick={() => removeGroup(group.id)} className="text-muted-foreground hover:text-rose-500 transition-colors">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    
                                    {/* Conflict Resolution UI */}
                                    {group.status === 'conflict' && (
                                        <div className="pl-12 pr-12 flex items-center gap-2 text-sm bg-orange-500/10 p-2 rounded-lg mx-2 border border-orange-500/20">
                                            <AlertCircle className="text-orange-500 shrink-0" size={16} />
                                            <span className="text-orange-400 font-bold">发现重复:</span>
                                            <span className="text-orange-300 flex-1">
                                                现有内容: <span className="font-medium">{group.conflictDetails?.conflicts.map(c => 
                                                    c === 'audio' ? '音频' : c === 'sheet' ? '歌谱' : c === 'lrc' ? '歌词' : c
                                                ).join(', ') || '歌曲条目'}</span> 
                                                <span className="mx-2">|</span>
                                                本次上传: <span className="font-medium">{group.conflictDetails?.uploadedTypes.map(c => 
                                                    c === 'audio' ? '音频' : c === 'sheet' ? '歌谱' : c === 'lrc' ? '歌词' : c
                                                ).join(', ')}</span>
                                            </span>
                                            <div className="flex gap-2 shrink-0">
                                                <button 
                                                    onClick={() => handleConfirmUpload(group)}
                                                    className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-500 text-xs shadow-sm transition-colors"
                                                >
                                                    确认覆盖
                                                </button>
                                                <button 
                                                    onClick={() => removeGroup(group.id)}
                                                    className="px-3 py-1 bg-secondary border border-border text-muted-foreground rounded-md hover:bg-muted text-xs shadow-sm transition-colors"
                                                >
                                                    取消上传
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                onClick={handleBatchUpload}
                                disabled={uploading || songGroups.length === 0}
                                className="bg-primary text-primary-foreground px-8 py-2.5 rounded-full hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-105"
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