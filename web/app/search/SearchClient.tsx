'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlayCircle, FileText, User, Disc, Mic2, Video, ListMusic, Search, ChevronLeft, ChevronRight, Heart, Download, Share2, PlusSquare } from 'lucide-react';

import SongActionButtons from '@/components/SongActionButtons';

type Song = {
  id: string;
  title: string;
  artist: string;
  album: string;
  files: {
    audio?: string;
    sheet?: string;
    lrc?: string;
    image?: string;
  };
};

type Props = {
  songs: Song[];
};

export default function SearchClient({ songs }: Props) {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('song');

  // Filter results
  const results = useMemo(() => {
    if (!query) return { songs: [], sheets: [] };
    const lowerQuery = query.toLowerCase();
    
    const matchedSongs = songs.filter(s => 
      s.title.toLowerCase().includes(lowerQuery) || 
      s.artist.toLowerCase().includes(lowerQuery) ||
      (s.album && s.album.toLowerCase().includes(lowerQuery))
    );

    return {
      songs: matchedSongs.filter(s => s.files.audio),
      sheets: matchedSongs.filter(s => s.files.sheet),
      artists: [] as any[], 
      albums: [] as any[], 
      mvs: [] as any[], 
      lyrics: matchedSongs.filter(s => s.files.lrc), 
      playlists: [] as any[]
    };
  }, [songs, query]);

  const tabs = [
    { id: 'song', label: '歌曲', count: results?.songs?.length || 0 },
    { id: 'artist', label: '音乐人', count: results?.artists?.length || 0 },
    { id: 'album', label: '专辑', count: results?.albums?.length || 0 },
    { id: 'mv', label: 'MV', count: results?.mvs?.length || 0 },
    { id: 'lyric', label: '歌词', count: results?.lyrics?.length || 0 },
    { id: 'sheet', label: '歌谱', count: results?.sheets?.length || 0 },
    { id: 'playlist', label: '歌单', count: results?.playlists?.length || 0 },
  ];

  const handlePlay = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    
    // Check if player window is active via localStorage heartbeat
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    if (!isActive) {
      // Case 1: New Window - Open directly with URL
      const width = 1200;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
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

  return (
    <div className="bg-white/80 backdrop-blur-md min-h-[600px] rounded-lg shadow-sm border border-white/60 p-6">
      {/* Header Title */}
      <div className="border-b border-gray-100/50 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          "{query}" 的搜索结果
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id 
                ? 'text-gray-800 font-bold' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-gray-400">({tab.count})</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-800"></div>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'song' && (
          <div>
            {results.songs.length > 0 ? (
              <table className="w-full text-sm text-gray-600">
                 <tbody>
                   {results.songs.map((song, index) => (
                     <tr key={song.id} className="hover:bg-gray-50 border-b border-gray-100 group">
                       <td className="py-4 pl-4 w-12">
                         <input type="checkbox" className="rounded border-gray-300" />
                       </td>
                       <td className="py-4 w-12 text-gray-400 font-mono">
                         {(index + 1).toString().padStart(2, '0')}
                       </td>
                       <td className="py-4">
                         <div className="flex items-center gap-3">
                            <div className="font-medium text-gray-800">
                               <span className="text-red-500 mr-1">{query}</span>
                               {song.title.replace(query, '')}
                               <span className="text-gray-400 mx-2">-</span>
                               <span className="text-gray-500">《{song.title}》</span>
                               <span className="text-gray-400 mx-2">-</span>
                               <span className="text-gray-500">{song.artist}</span>
                            </div>
                         </div>
                         <div className="text-xs text-gray-400 mt-1">
                           词：{song.artist} 曲：{song.artist} 编曲、后期：陈勇 出品：{song.artist}
                         </div>
                       </td>
                       <td className="py-4 text-right pr-4">
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <SongActionButtons song={song} />
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            ) : (
              <div className="text-center py-20 text-gray-400">没有找到相关歌曲</div>
            )}
            
            {results.songs.length > 0 && (
              <div className="flex items-center justify-between mt-8 py-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">全选</button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50">取消</button>
                  <button className="px-3 py-1.5 border border-orange-200 bg-orange-50 text-orange-600 rounded text-sm hover:bg-orange-100 flex items-center gap-1">
                    <ListMusic size={14} /> 列表
                  </button>
                  <button className="px-3 py-1.5 border border-orange-200 bg-orange-50 text-orange-600 rounded text-sm hover:bg-orange-100 flex items-center gap-1">
                    <PlayCircle size={14} /> 播放
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <button className="px-2 py-1 border rounded hover:bg-gray-50 text-gray-500 disabled:opacity-50" disabled>
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 bg-orange-500 text-white rounded flex items-center justify-center">1</button>
                  <button className="px-2 py-1 border rounded hover:bg-gray-50 text-gray-500 disabled:opacity-50" disabled>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sheet' && (
          <div>
             {results.sheets.length > 0 ? (
               <div className="grid grid-cols-4 gap-6">
                 {results.sheets.map(song => (
                   <div key={song.id} className="border border-gray-200 rounded p-4 hover:shadow-md transition-shadow">
                     <div className="h-32 bg-gray-100 mb-3 flex items-center justify-center text-gray-400">
                       <FileText size={32} />
                     </div>
                     <h3 className="font-bold text-gray-800 truncate">{song.title}</h3>
                     <p className="text-xs text-gray-500">{song.artist}</p>
                     <a href={`/api/file${song.files.sheet}`} target="_blank" className="text-blue-600 text-xs mt-2 inline-block hover:underline">查看歌谱</a>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="text-center py-20 text-gray-400">没有找到相关歌谱</div>
             )}
          </div>
        )}

        {['artist', 'album', 'mv', 'lyric', 'playlist'].includes(activeTab) && (
          <div className="text-center py-20 text-gray-400">
            功能开发中...
          </div>
        )}
      </div>
    </div>
  );
}