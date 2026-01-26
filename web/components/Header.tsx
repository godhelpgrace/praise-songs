'use client';

import Link from 'next/link';
import { Search, User, Music } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

import { useAuth } from '@/context/AuthContext';

function HeaderContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const currentCat = searchParams.get('cat');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const getLinkClass = (path: string) => {
    const activeClass = "text-white font-semibold relative after:content-[''] after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-500 after:to-purple-500 after:shadow-[0_0_10px_rgba(99,102,241,0.5)]";
    const inactiveClass = "text-slate-400 hover:text-white transition-colors relative after:content-[''] after:absolute after:-bottom-3 after:left-1/2 after:right-1/2 after:h-0.5 after:bg-white/0 after:transition-all hover:after:left-0 hover:after:right-0 hover:after:bg-white/20";
    return isActive(path) ? activeClass : inactiveClass;
  };

  return (
    <header className="w-full bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 transition-all duration-300">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Music className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-wide">赞美吧</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative flex items-center group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入关键字搜索..." 
                className="w-full px-4 py-2 bg-white/5 border border-white/5 rounded-full pl-5 pr-32 focus:outline-none focus:bg-white/10 focus:border-indigo-500/30 text-white placeholder-slate-500 transition-all duration-300"
              />
              <div className="absolute right-1 flex items-center">
                <select className="h-7 bg-transparent text-xs text-slate-400 focus:outline-none hover:text-white transition-colors border-r border-white/10 pr-2 mr-2 cursor-pointer">
                  <option value="all" className="bg-slate-900">全部</option>
                  <option value="song" className="bg-slate-900">歌曲</option>
                  <option value="artist" className="bg-slate-900">音乐人</option>
                  <option value="album" className="bg-slate-900">专辑</option>
                  <option value="sheet" className="bg-slate-900">歌谱</option>
                  <option value="playlist" className="bg-slate-900">歌单</option>
                </select>
                <button 
                  onClick={handleSearch}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-slate-300 hover:bg-indigo-500 hover:text-white transition-all duration-300"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-6">
            <Link href="/upload" className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </span>
              <span>上传</span>
            </Link>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm font-medium">
                    {user.username}
                    {user.role === 'admin' && <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/20">ADMIN</span>}
                  </span>
                  <button 
                    onClick={() => logout()}
                    className="text-slate-500 hover:text-white text-sm transition-colors"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <button className="text-slate-300 hover:text-white text-sm font-medium transition-colors">
                      登录
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="bg-white text-black px-5 py-1.5 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      注册
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-8 py-1 font-medium relative">
          <div className="relative group">
            <Link href="/" className={getLinkClass('/')}>乐库</Link>
          </div>
          <Link href="/playlist" className={getLinkClass('/playlist')}>歌单</Link>
          <Link href="/sheet" className={getLinkClass('/sheet')}>歌谱</Link>
          <Link href="/client" className={getLinkClass('/client')}>客户端</Link>
        </nav>
      </div>
      
      {/* Secondary Navigation (Always visible) */}
      <div className="bg-[#0f172a]/60 backdrop-blur-md border-t border-white/5 py-2.5 w-full">
        <div className="container mx-auto px-4 flex items-center gap-8 text-sm text-slate-300 font-medium">
          {pathname.startsWith('/playlist') ? (
             <>
                <Link href="/playlist" className={`hover:text-white transition-colors ${pathname === '/playlist' && !currentCat ? 'text-white' : ''}`}>全部</Link>
                {['敬拜赞美', '福音布道', '个人灵修', '节日庆典', '现代流行'].map(cat => (
                   <Link key={cat} href={`/playlist?cat=${cat}`} className={`hover:text-white transition-colors ${currentCat === cat ? 'text-indigo-400' : ''}`}>{cat}</Link>
                ))}
             </>
          ) : pathname.startsWith('/sheet') ? (
             <>
               <Link href="/sheet" className={`hover:text-white transition-colors ${pathname === '/sheet' && !currentCat ? 'text-white' : ''}`}>全部</Link>
               {['五线谱', '简谱', '和弦谱', '吉他谱', '钢琴谱'].map(cat => (
                  <Link key={cat} href={`/sheet?cat=${cat}`} className={`hover:text-white transition-colors ${currentCat === cat ? 'text-indigo-400' : ''}`}>{cat}</Link>
               ))}
             </>
          ) : (
             <>
                <Link href="/" className={`hover:text-white transition-colors ${pathname === '/' ? 'text-white' : ''}`}>歌库</Link>
                <Link href="/artist" className={`hover:text-white transition-colors ${pathname.startsWith('/artist') ? 'text-indigo-400' : ''}`}>音乐人</Link>
                <Link href="/album" className={`hover:text-white transition-colors ${pathname.startsWith('/album') ? 'text-indigo-400' : ''}`}>专辑</Link>
                <Link href="/video" className={`hover:text-white transition-colors ${pathname.startsWith('/video') ? 'text-indigo-400' : ''}`}>视频</Link>
                <Link href="/top/today" className={`hover:text-white transition-colors ${pathname.startsWith('/top') ? 'text-indigo-400' : ''}`}>排行榜</Link>
             </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<header className="w-full bg-slate-900/50 backdrop-blur-md border-b border-white/10 h-[112px] sticky top-0 z-40" />}>
      <HeaderContent />
    </Suspense>
  );
}
