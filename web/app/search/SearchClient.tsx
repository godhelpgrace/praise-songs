'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PlayCircle, FileText, ListMusic, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  return (
    <div className="bg-card/50 backdrop-blur-xl min-h-[600px] rounded-2xl border border-border p-6 shadow-xl">
      {/* Header Title */}
      <div className="border-b border-border pb-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          "{query}" 的搜索结果
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-muted/50 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-indigo-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }
            `}
          >
            {tab.label}
            <span className={`ml-1 text-xs ${activeTab === tab.id ? 'text-primary-foreground/80' : 'text-muted-foreground/80'}`}>
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'song' && (
          <div>
            {results.songs.length > 0 ? (
              <table className="w-full text-sm text-muted-foreground">
                 <tbody>
                   {results.songs.map((song, index) => (
                     <tr key={song.id} className="hover:bg-accent/50 border-b border-border group transition-colors duration-200">
                       <td className="py-4 pl-4 w-12">
                         <input type="checkbox" className="rounded border-input bg-background text-primary focus:ring-primary" />
                       </td>
                       <td className="py-4 w-12 text-muted-foreground font-mono">
                         {(index + 1).toString().padStart(2, '0')}
                       </td>
                       <td className="py-4">
                         <div className="flex items-center gap-3">
                            <div className="font-medium text-foreground">
                               <span className="text-primary mr-1">{query}</span>
                               {song.title.replace(query, '')}
                               <span className="text-muted-foreground mx-2">-</span>
                               <span className="text-muted-foreground">《{song.title}》</span>
                               <span className="text-muted-foreground mx-2">-</span>
                               <span className="text-muted-foreground">{song.artist}</span>
                            </div>
                         </div>
                         <div className="text-xs text-muted-foreground mt-1">
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
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>没有找到相关歌曲</p>
              </div>
            )}
            
            {results.songs.length > 0 && (
              <div className="flex items-center justify-between mt-8 py-4 border-t border-border">
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 border border-border text-muted-foreground rounded text-sm hover:bg-accent transition-colors">全选</button>
                  <button className="px-3 py-1.5 border border-border text-muted-foreground rounded text-sm hover:bg-accent transition-colors">取消</button>
                  <button className="px-3 py-1.5 border border-primary/30 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20 flex items-center gap-1 transition-colors">
                    <ListMusic size={14} /> 列表
                  </button>
                  <button className="px-3 py-1.5 border border-primary/30 bg-primary/10 text-primary rounded text-sm hover:bg-primary/20 flex items-center gap-1 transition-colors">
                    <PlayCircle size={14} /> 播放
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <button className="px-2 py-1 border border-border rounded hover:bg-accent text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent" disabled>
                    <ChevronLeft size={16} />
                  </button>
                  <button className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center shadow-lg shadow-indigo-500/20">1</button>
                  <button className="px-2 py-1 border border-border rounded hover:bg-accent text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent" disabled>
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
                   <div key={song.id} className="border border-border bg-card/50 rounded-xl p-4 hover:bg-accent/50 transition-all duration-200 group">
                     <div className="h-32 bg-muted/50 rounded-lg mb-3 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                       <FileText size={32} />
                     </div>
                     <h3 className="font-bold text-foreground truncate">{song.title}</h3>
                     <p className="text-xs text-muted-foreground">{song.artist}</p>
                     {song.files.sheet && (
                       <a href={`/api/file${song.files.sheet}`} target="_blank" className="text-primary text-xs mt-2 inline-block hover:text-primary/80 hover:underline">查看歌谱</a>
                     )}
                   </div>
                 ))}
               </div>
             ) : (
               <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                 <FileText className="w-12 h-12 mb-4 opacity-20" />
                 <p>没有找到相关歌谱</p>
               </div>
             )}
          </div>
        )}

        {['artist', 'album', 'mv', 'lyric', 'playlist'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-2xl bg-muted/20">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">暂无相关内容</p>
            <p className="text-sm opacity-60 mt-2">该分类下还没有搜索结果</p>
          </div>
        )}
      </div>
    </div>
  );
}