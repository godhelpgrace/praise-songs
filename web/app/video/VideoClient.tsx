'use client';

import { useMemo, useState } from 'react';
import { PlayCircle, Video, Trash2, Download, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

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

export default function VideoClient({ initialVideos }: { initialVideos: VideoItem[] }) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [q, setQ] = useState('');

  const filteredVideos = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return videos;
    return videos.filter((v) => {
      const hay = `${v.title} ${v.artistName || ''} ${v.songTitle || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }, [videos, q]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm('确定要删除这个视频吗？')) return;

      try {
          const res = await fetch(`/api/video/${id}`, { method: 'DELETE' });
          if (res.ok) {
              setVideos(prev => prev.filter(v => v.id !== id));
              router.refresh();
          } else {
              alert('删除失败');
          }
      } catch (e) {
          alert('删除出错');
      }
  };

  const handleDownload = (e: React.MouseEvent, v: VideoItem) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = v.src.startsWith('/') ? `/api/file${v.src}` : v.src;
    link.download = `${v.title}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <Video size={24} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-100">视频列表</div>
              <p className="text-sm text-slate-400">共 {filteredVideos.length} 个视频</p>
            </div>
          </div>
          
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-black/20 border border-white/10 text-white text-sm rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-72 placeholder-slate-500"
              placeholder="搜索标题/音乐人..."
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {filteredVideos.map((v) => (
              <div
                key={v.id}
                className="group cursor-pointer relative"
                onClick={() => window.open(v.src.startsWith('/') ? `/api/file${v.src}` : v.src, '_blank')}
              >
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden mb-3 relative shadow-lg border border-white/5 group-hover:border-indigo-500/30 transition-all duration-300">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all z-10 backdrop-blur-[2px]">
                    <PlayCircle size={40} className="text-white drop-shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300" />
                  </div>
                  {v.cover ? (
                    <img
                      src={v.cover.startsWith('/') ? `/api/file${v.cover}` : v.cover}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                      <Video size={32} />
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                        onClick={(e) => handleDownload(e, v)}
                        className="p-1.5 bg-black/60 text-white/80 hover:text-white rounded-lg hover:bg-indigo-600 shadow-sm backdrop-blur-md transition-all"
                        title="下载视频"
                      >
                          <Download size={14} />
                      </button>
                    {isAdmin && (
                        <button 
                          onClick={(e) => handleDelete(e, v.id)}
                          className="p-1.5 bg-black/60 text-white/80 hover:text-white rounded-lg hover:bg-red-600 shadow-sm backdrop-blur-md transition-all"
                          title="删除视频"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                  </div>
                </div>
                <div className="px-1">
                    <div className="text-sm text-slate-200 font-medium truncate leading-tight mb-1 group-hover:text-indigo-400 transition-colors" title={v.title}>{v.title}</div>
                    <div className="text-xs text-slate-500 truncate" title={v.artistName}>{v.artistName || '未知艺术家'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Video className="w-8 h-8 opacity-20" />
            </div>
            <p>暂无视频</p>
          </div>
        )}
      </div>
    </div>
  );
}