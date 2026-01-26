'use client';

import { Disc, PlayCircle, ArrowLeft, Edit2, Trash2, Share2, Heart, Check, X, Camera } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MusicListClient from '@/app/music/MusicListClient';

type Album = {
    name: string;
    artist: string;
    cover?: string;
    songs: any[];
    otherAlbums: any[];
};

export default function AlbumDetailClient({ album }: { album: Album }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(album.name);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCoverClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/album/${encodeURIComponent(album.name)}/cover`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert('封面上传失败');
            }
        } catch (e) {
            alert('上传出错');
        }
    };

    const handleRename = async () => {
        if (!newName.trim() || newName === album.name) {
            setIsEditing(false);
            return;
        }

        try {
            const res = await fetch(`/api/album/${encodeURIComponent(album.name)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newName })
            });

            if (res.ok) {
                router.push(`/album/${encodeURIComponent(newName)}`);
            } else {
                alert('重命名失败');
            }
        } catch (e) {
            alert('重命名出错');
        }
    };

    const handlePlayAll = () => {
        if (album.songs.length === 0) return;
        
        const firstSong = album.songs[0];
        const width = 1200;
        const height = 800;
        const left = (window.screen.availWidth - width) / 2;
        const top = (window.screen.availHeight - height) / 2;
        
        const lastHeartbeat = parseInt(localStorage.getItem('music_player_heartbeat') || '0');
        const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 2000);

        const playerSongs = album.songs.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            cover: s.files?.image ? `/api/file${s.files.image}` : undefined,
            src: s.files?.audio ? `/api/file${s.files.audio}` : undefined,
            lrcPath: s.files?.lrc ? `/api/file${s.files.lrc}` : undefined
        }));

        if (!isActive) {
            const playerWin = window.open(
                `/song/${firstSong.id}`, 
                'music_player_window', 
                `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
            );
            
            if (!playerWin) {
                alert('请允许本站弹出窗口以播放音乐');
                return;
            }
        } else {
            const playerWin = window.open('', 'music_player_window');
            if (playerWin) playerWin.focus();
        }
        
        setTimeout(() => {
            const channel = new BroadcastChannel('music_player_channel');
            channel.postMessage({ type: 'REPLACE_PLAYLIST', songs: playerSongs });
            channel.close();
        }, isActive ? 100 : 2000);
    };

    const handleDelete = async () => {
        if (!confirm(`确定要删除专辑 "${album.name}" 吗？\n这将清除所有相关歌曲的专辑信息，但不会删除歌曲文件。`)) return;

        try {
            const res = await fetch(`/api/album/${encodeURIComponent(album.name)}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                router.push('/album');
            } else {
                alert('删除失败');
            }
        } catch (e) {
            alert('删除出错');
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1 container mx-auto px-4 py-8">
                <Link href="/album" className="inline-flex items-center gap-1 text-gray-500 hover:text-blue-600 mb-6 text-sm">
                    <ArrowLeft size={16} />
                    返回专辑列表
                </Link>

                {/* Album Info Header */}
                <div className="bg-white/80 backdrop-blur-md p-6 rounded-lg shadow-sm mb-6 flex flex-col md:flex-row gap-8 border border-white/60">
                    <div 
                        className="w-64 h-64 bg-gray-100/50 rounded-md flex-shrink-0 overflow-hidden shadow-md flex items-center justify-center border border-gray-200 relative group cursor-pointer"
                        onClick={handleCoverClick}
                        title="点击更换封面"
                    >
                        {album.cover ? (
                            <img 
                                src={`/api/file${album.cover}`} 
                                alt={album.name} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-gray-300">
                                <Disc size={80} />
                            </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-2 text-white">
                            <Camera size={32} />
                            <span className="text-sm font-medium">更换封面</span>
                        </div>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept="image/*"
                        />

                        {/* CD Effect */}
                        <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/10 to-transparent pointer-events-none"></div>
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 group/title">
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded">专辑</span>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={newName} 
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="border border-gray-300 rounded px-2 py-1 text-2xl font-bold"
                                        autoFocus
                                    />
                                    <button onClick={handleRename} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={20} /></button>
                                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:bg-gray-100 p-1 rounded"><X size={20} /></button>
                                </div>
                            ) : (
                                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                                    {album.name}
                                    <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-400 hover:text-orange-500 p-1">
                                        <Edit2 size={16} />
                                    </button>
                                </h1>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mb-4 italic">/ 一句话描述这张专辑的特色...</p>

                        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-6 max-w-md">
                             <div className="flex gap-2">
                                <span className="text-gray-400">音乐人：</span>
                                <span className="text-blue-600 hover:underline cursor-pointer">{album.artist}</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-gray-400">歌曲数量：</span>
                                <span>{album.songs.length} 首</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-gray-400">专辑类型：</span>
                                <span>全长专辑</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-gray-400">发行日期：</span>
                                <span>2023-01-01</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-gray-400">专辑语言：</span>
                                <span>国语</span>
                             </div>
                              <div className="flex gap-2">
                                <span className="text-gray-400">专辑流派：</span>
                                <span>现代流行</span>
                             </div>
                        </div>

                        <div className="text-sm text-gray-600 leading-relaxed mb-6 line-clamp-3">
                            专辑简介：这是一张非常优秀的赞美诗专辑，收录了多首感人至深的敬拜歌曲，带领人进入神的同在...
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={handlePlayAll}
                                className="bg-blue-600 text-white px-6 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
                            >
                                <PlayCircle size={18} />
                                播放全部
                            </button>
                            <button className="border border-gray-300 text-gray-600 px-6 py-2 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                                <Heart size={16} /> 收藏
                            </button>
                            <button className="border border-gray-300 text-gray-600 px-6 py-2 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-2">
                                <Share2 size={16} /> 分享
                            </button>
                            <button onClick={handleDelete} className="border border-gray-200 text-red-500 px-6 py-2 rounded text-sm hover:bg-red-50 transition-colors flex items-center gap-2 ml-auto">
                                <Trash2 size={16} /> 删除专辑
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content: Songs */}
                    <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white/80 backdrop-blur-md rounded-lg shadow-sm overflow-hidden border border-white/60">
                             <div className="px-6 py-3 border-b border-gray-100/50 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3">专辑曲目</h2>
                             </div>
                             <MusicListClient initialSongs={album.songs} hideArtist={true} hideAlbum={true} />
                        </div>
                    </div>

                    {/* Sidebar: Other Albums */}
                    <div className="space-y-6">
                         <div className="bg-white/80 backdrop-blur-md rounded-lg shadow-sm overflow-hidden p-4 border border-white/60">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3">音乐人其他专辑</h2>
                                <Link href="#" className="text-xs text-gray-400 hover:text-blue-600">更多 &raquo;</Link>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                {album.otherAlbums.map((a: any) => (
                                     <Link href={`/album/${encodeURIComponent(a.name)}`} key={a.name} className="group">
                                        <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-2 relative">
                                            {a.cover ? (
                                                <img src={`/api/file${a.cover}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-gray-300"><Disc size={24}/></div>
                                            )}
                                        </div>
                                        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600">{a.name}</div>
                                    </Link>
                                ))}
                                {album.otherAlbums.length === 0 && <div className="text-xs text-gray-400 col-span-2 text-center py-4">暂无其他专辑</div>}
                             </div>
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
