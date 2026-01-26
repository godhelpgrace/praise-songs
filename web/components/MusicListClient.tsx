'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlayCircle, Clock, User, Disc, Trash2, Edit2, MoreHorizontal, Music, Plus, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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

export default function MusicListClient({ 
  initialSongs, 
  artists = [], 
  albums = [],
  hideArtist = false,
  hideAlbum = false
}: { 
  initialSongs: Song[], 
  artists?: Artist[], 
  albums?: Album[],
  hideArtist?: boolean,
  hideAlbum?: boolean
}) {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', artist: '', album: '' });
  const [artistSearch, setArtistSearch] = useState('');
  const router = useRouter();

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
        alert('删除失败');
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

  const handlePlay = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    
    // Check if player window is active via localStorage heartbeat
    const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
    const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

    if (!isActive) {
      // Case 1: New Window - Open directly with URL to preserve user gesture for Autoplay
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

  const filteredSongs = songs.filter(song => {
    if (!artistSearch) return true;
    const searchLower = artistSearch.toLowerCase();
    return (
      song.title.toLowerCase().includes(searchLower) ||
      song.artist.toLowerCase().includes(searchLower) ||
      song.album.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl min-h-[600px] border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <Music className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">音乐库</h2>
            <p className="text-sm text-slate-400">共 {songs.length} 首歌曲</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <input
              type="text"
              placeholder="搜索歌曲..."
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              className="bg-black/20 border border-white/10 text-white text-sm rounded-full px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64 placeholder-slate-500"
            />
            <svg className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Link 
            href="/upload" 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-full transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            上传歌曲
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-slate-400 text-sm">
              <th className="p-4 font-medium pl-8 w-16">#</th>
              <th className="p-4 font-medium">歌曲标题</th>
              {!hideArtist && <th className="p-4 font-medium">歌手</th>}
              {!hideAlbum && <th className="p-4 font-medium">专辑</th>}
              {user?.role === 'admin' && <th className="p-4 font-medium text-right pr-8">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSongs.map((song, index) => (
              <tr key={song.id} className="group hover:bg-white/5 transition-colors">
                <td className="p-4 pl-8 text-slate-500 text-sm font-mono">{index + 1}</td>
                <td className="p-4">
                  {editingId === song.id ? (
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className="bg-black/20 border border-indigo-500/50 rounded px-2 py-1 text-white w-full focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => handlePlay(e, song)}
                        className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 hover:scale-110"
                        title="播放"
                      >
                        <Play className="w-4 h-4 ml-0.5" />
                      </button>
                      <Link href={`/song/${song.id}`} className="font-bold text-black hover:text-indigo-400 transition-colors line-clamp-1 text-base">
                        {song.title}
                      </Link>
                    </div>
                  )}
                </td>
                {!hideArtist && (
                  <td className="p-4 text-slate-400">
                    {editingId === song.id ? (
                      <input
                        type="text"
                        value={editForm.artist}
                        onChange={e => setEditForm({...editForm, artist: e.target.value})}
                        className="bg-black/20 border border-indigo-500/50 rounded px-2 py-1 text-white w-full focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                         <User className="w-4 h-4 opacity-50" />
                         <span>{song.artist}</span>
                      </div>
                    )}
                  </td>
                )}
                {!hideAlbum && (
                  <td className="p-4 text-slate-400">
                    {editingId === song.id ? (
                      <input
                        type="text"
                        value={editForm.album}
                        onChange={e => setEditForm({...editForm, album: e.target.value})}
                        className="bg-black/20 border border-indigo-500/50 rounded px-2 py-1 text-white w-full focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Disc className="w-4 h-4 opacity-50" />
                        <span>{song.album}</span>
                      </div>
                    )}
                  </td>
                )}
                {user?.role === 'admin' && (
                  <td className="p-4 text-right pr-8">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === song.id ? (
                        <>
                          <button onClick={() => saveEdit(song.id)} className="p-2 text-green-400 hover:bg-green-400/10 rounded-full transition-colors">
                            <span className="text-xs font-bold">保存</span>
                          </button>
                          <button onClick={cancelEdit} className="p-2 text-slate-400 hover:bg-white/10 rounded-full transition-colors">
                            <span className="text-xs">取消</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(song)} className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-full transition-colors" title="编辑">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(song.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-full transition-colors" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <Link href={`/song/${song.id}`} className="p-2 text-slate-400 hover:bg-white/10 rounded-full transition-colors" title="详情">
                            <MoreHorizontal className="w-4 h-4" />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredSongs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                      <Music className="w-8 h-8 opacity-20" />
                    </div>
                    <p>没有找到相关歌曲</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
