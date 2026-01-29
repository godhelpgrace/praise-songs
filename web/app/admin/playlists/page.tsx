'use client';

import { useState, useEffect } from 'react';
import { Search, Check, X, Eye, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

type Playlist = {
  id: string;
  title: string;
  description: string;
  status: 'public' | 'private' | 'pending';
  creatorId: string;
  creator?: {
    username: string;
  };
  songs: { id: string; title: string }[];
  createdAt: string;
};

export default function PlaylistReviewPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'public' | 'all'>('pending');

  useEffect(() => {
    fetchPlaylists();
  }, [activeTab]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      let url = '/api/playlist?admin_view=true';
      if (activeTab !== 'all') {
        url += `&status=${activeTab}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      } else {
        toast.error('Failed to load playlists');
      }
    } catch (e) {
      toast.error('Error loading playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'public' | 'private') => {
    try {
      const res = await fetch(`/api/playlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Playlist ${newStatus === 'public' ? 'approved' : 'rejected/hidden'}`);
        fetchPlaylists(); // Refresh list
      } else {
        const err = await res.json();
        toast.error(err.error || 'Operation failed');
      }
    } catch (e) {
      toast.error('Operation failed');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">歌单审核</h1>
        
        {/* Tabs */}
        <div className="flex bg-muted/30 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            待审核
          </button>
          <button 
            onClick={() => setActiveTab('public')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'public' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            已公开
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
          >
            全部
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-muted-foreground">
          <thead className="bg-muted/50 text-foreground font-medium">
            <tr>
              <th className="px-6 py-4">标题</th>
              <th className="px-6 py-4">创建者</th>
              <th className="px-6 py-4">歌曲数</th>
              <th className="px-6 py-4">状态</th>
              <th className="px-6 py-4">创建时间</th>
              <th className="px-6 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
               <tr><td colSpan={6} className="px-6 py-8 text-center">加载中...</td></tr>
            ) : playlists.length === 0 ? (
               <tr><td colSpan={6} className="px-6 py-8 text-center">暂无歌单</td></tr>
            ) : (
              playlists.map(playlist => (
                <tr key={playlist.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{playlist.title}</div>
                    {playlist.description && <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{playlist.description}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {playlist.creator?.username || '未知用户'}
                  </td>
                  <td className="px-6 py-4">
                    {playlist.songs?.length || 0} 首
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={playlist.status} />
                  </td>
                  <td className="px-6 py-4">
                    {new Date(playlist.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/playlist/${playlist.id}`} target="_blank">
                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="查看详情">
                          <ExternalLink size={16} />
                        </button>
                      </Link>
                      
                      {playlist.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleStatusChange(playlist.id, 'public')}
                            className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                            title="通过"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            onClick={() => handleStatusChange(playlist.id, 'private')}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="拒绝"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      
                      {playlist.status === 'public' && (
                        <button 
                          onClick={() => handleStatusChange(playlist.id, 'private')}
                          className="p-2 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 rounded-lg transition-colors"
                          title="隐藏/设为私有"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      
                      {playlist.status === 'private' && (
                        <button 
                          onClick={() => handleStatusChange(playlist.id, 'public')}
                          className="p-2 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 rounded-lg transition-colors"
                          title="设为公开"
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'public':
      return <span className="inline-flex items-center px-2 py-1 rounded bg-green-500/10 text-green-500 text-xs border border-green-500/20">已公开</span>;
    case 'pending':
      return <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs border border-yellow-500/20">待审核</span>;
    case 'private':
      return <span className="inline-flex items-center px-2 py-1 rounded bg-slate-500/10 text-slate-500 text-xs border border-slate-500/20">私有</span>;
    default:
      return <span className="text-slate-500">{status}</span>;
  }
}
