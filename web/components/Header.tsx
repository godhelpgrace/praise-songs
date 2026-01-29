'use client';

import Link from 'next/link';
import { Search, User, Music, LayoutDashboard } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    const activeClass = "text-foreground font-semibold relative after:content-[''] after:absolute after:-bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-gradient-to-r after:from-indigo-500 after:to-purple-500 after:shadow-[0_0_10px_rgba(99,102,241,0.5)]";
    const inactiveClass = "text-muted-foreground hover:text-foreground transition-colors relative after:content-[''] after:absolute after:-bottom-3 after:left-1/2 after:right-1/2 after:h-0.5 after:bg-foreground/0 after:transition-all hover:after:left-0 hover:after:right-0 hover:after:bg-foreground/20";
    return isActive(path) ? activeClass : inactiveClass;
  };

  return (
    <header className="w-full bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-40 transition-all duration-300">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
              <Music className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground tracking-wide">赞美吧</span>
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
                className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-full pl-5 pr-32 focus:outline-none focus:bg-secondary focus:border-indigo-500/30 text-foreground placeholder-muted-foreground transition-all duration-300"
              />
              <div className="absolute right-1 flex items-center">
                <select className="h-7 bg-transparent text-xs text-muted-foreground focus:outline-none hover:text-foreground transition-colors border-r border-border pr-2 mr-2 cursor-pointer">
                  <option value="all" className="bg-background text-foreground">全部</option>
                  <option value="song" className="bg-background text-foreground">歌曲</option>
                  <option value="artist" className="bg-background text-foreground">音乐人</option>
                  <option value="album" className="bg-background text-foreground">专辑</option>
                  <option value="sheet" className="bg-background text-foreground">歌谱</option>
                  <option value="playlist" className="bg-background text-foreground">歌单</option>
                </select>
                <button 
                  onClick={handleSearch}
                  className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-muted-foreground hover:bg-indigo-500 hover:text-white transition-all duration-300"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/upload" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </span>
              <span>上传</span>
            </Link>
            <div className="h-4 w-px bg-border"></div>
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    {user.username}
                  </span>
                  {user.role === 'admin' && (
                    <Link href="/admin" className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-md shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-500">
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      管理后台
                    </Link>
                  )}
                  <button 
                    onClick={() => logout()}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    退出
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login">
                    <button className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
                      登录
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-1.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95">
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
          <Link href="/artist" className={getLinkClass('/artist')}>音乐人</Link>
          <Link href="/album" className={getLinkClass('/album')}>专辑</Link>
          <Link href="/playlist" className={getLinkClass('/playlist')}>歌单</Link>
          <Link href="/sheet" className={getLinkClass('/sheet')}>歌谱</Link>
        </nav>
      </div>
      
      {/* Secondary Navigation (Only for Sheet) */}
      {pathname.startsWith('/sheet') && (
        <div className="bg-secondary/30 backdrop-blur-md border-t border-border py-2.5 w-full">
          <div className="container mx-auto px-4 flex items-center gap-8 text-sm text-muted-foreground font-medium">
             <>
               <Link href="/sheet" className={`hover:text-foreground transition-colors ${pathname === '/sheet' && !currentCat ? 'text-foreground' : ''}`}>全部</Link>
               {['五线谱', '和弦谱', '吉他谱', '贝斯谱', '鼓谱'].map(cat => (
                  <Link key={cat} href={`/sheet?cat=${cat}`} className={`hover:text-foreground transition-colors ${currentCat === cat ? 'text-primary' : ''}`}>{cat}</Link>
               ))}
             </>
          </div>
        </div>
      )}
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<header className="w-full bg-background/50 backdrop-blur-md border-b border-border h-[112px] sticky top-0 z-40" />}>
      <HeaderContent />
    </Suspense>
  );
}
