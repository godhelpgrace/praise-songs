'use client';

import { Disc, PlayCircle, ArrowLeft, Edit2, Trash2, Share2, Heart, Check, X, Camera } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MusicListClient from '@/components/MusicListClient';

const DEFAULT_COVER = '/images/default_cover.png';

type Album = {
    name: string;
    artist: string;
    cover?: string;
    songs: any[];
    songsCount?: number;
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
        const isActive = localStorage.getItem('music_player_active') === 'true' && (Date.now() - lastHeartbeat < 5000);

        const playerSongs = album.songs.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artistName || s.artist || 'Unknown',
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
        if (!confirm(`确定要删除专辑 "${album.name}" 吗？\n这将删除专辑内所有歌曲及其文件，且不可恢复。`)) return;

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
                <Link href="/album" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary mb-6 text-sm transition-colors">
                    <ArrowLeft size={16} />
                    返回专辑列表
                </Link>

                {/* Album Info Header */}
                <div className="bg-card backdrop-blur-xl p-6 rounded-lg shadow-xl mb-6 flex flex-col md:flex-row gap-8 border border-border">
                    <div 
                        className="w-64 h-64 bg-muted rounded-md flex-shrink-0 overflow-hidden shadow-lg flex items-center justify-center border border-border relative group cursor-pointer"
                        onClick={handleCoverClick}
                        title="点击更换封面"
                    >
                        <img 
                            src={album.cover ? `/api/file${album.cover}` : DEFAULT_COVER} 
                            alt={album.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src !== window.location.origin + DEFAULT_COVER) {
                                    target.src = DEFAULT_COVER;
                                }
                            }}
                        />
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center flex-col gap-2 text-white backdrop-blur-[2px]">
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
                        <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/20 to-transparent pointer-events-none"></div>
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 group/title">
                            <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded shadow-lg shadow-primary/20">专辑</span>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={newName} 
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="bg-muted border border-border text-foreground rounded px-2 py-1 text-2xl font-bold focus:outline-none focus:border-primary"
                                        autoFocus
                                    />
                                    <button onClick={handleRename} className="text-green-500 hover:bg-green-500/10 p-1 rounded"><Check size={20} /></button>
                                    <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:bg-muted p-1 rounded"><X size={20} /></button>
                                </div>
                            ) : (
                                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                                    {album.name}
                                    <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted-foreground hover:text-primary p-1">
                                        <Edit2 size={16} />
                                    </button>
                                </h1>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm mb-4 italic">/ 一句话描述这张专辑的特色...</p>

                        <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground mb-6 max-w-md">
                             <div className="flex gap-2">
                                <span className="text-muted-foreground">音乐人：</span>
                                <span className="text-primary hover:underline cursor-pointer">{album.artist}</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-muted-foreground">歌曲数量：</span>
                                <span>{album.songsCount || 0} 首</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-muted-foreground">专辑类型：</span>
                                <span>全长专辑</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-muted-foreground">发行日期：</span>
                                <span>2023-01-01</span>
                             </div>
                             <div className="flex gap-2">
                                <span className="text-muted-foreground">专辑语言：</span>
                                <span>国语</span>
                             </div>
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">专辑流派：</span>
                                <span>现代流行</span>
                             </div>
                        </div>

                        <div className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                            专辑简介：这是一张非常优秀的赞美诗专辑，收录了多首感人至深的敬拜歌曲，带领人进入神的同在...
                        </div>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={handlePlayAll}
                                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 font-bold"
                            >
                                <PlayCircle size={18} />
                                播放全部
                            </button>
                            <button className="border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                                <Heart size={16} /> 收藏
                            </button>
                            <button className="border border-border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                                <Share2 size={16} /> 分享
                            </button>
                            <button onClick={handleDelete} className="border border-border bg-muted/50 hover:bg-destructive/20 text-muted-foreground hover:text-destructive hover:border-destructive/30 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ml-auto">
                                <Trash2 size={16} /> 删除专辑
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content: Songs */}
                    <div className="lg:col-span-2 space-y-6">
                         <div className="bg-card backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-border">
                             <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                                <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">专辑曲目</h2>
                             </div>
                             <MusicListClient initialSongs={album.songs} hideArtist={true} hideAlbum={true} />
                        </div>
                    </div>

                    {/* Sidebar: Other Albums */}
                    <div className="space-y-6">
                         <div className="bg-card backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden p-4 border border-border">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">音乐人其他专辑</h2>
                                <Link href="#" className="text-xs text-muted-foreground hover:text-primary">更多 &raquo;</Link>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                               {album.otherAlbums.map((a: any) => (
                                    <Link href={`/album/${encodeURIComponent(a.name)}`} key={a.name} className="group">
                                       <div className="aspect-square bg-muted rounded-xl overflow-hidden mb-2 relative shadow-lg border border-border">
                                            <img 
                                                src={a.cover ? `/api/file${a.cover}` : DEFAULT_COVER} 
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== window.location.origin + DEFAULT_COVER) {
                                                        target.src = DEFAULT_COVER;
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{a.name}</div>
                                    </Link>
                                ))}
                                {album.otherAlbums.length === 0 && <div className="text-xs text-muted-foreground col-span-2 text-center py-4">暂无其他专辑</div>}
                             </div>
                         </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
