'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Users, ListMusic, LayoutDashboard, Settings, Database } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Toaster } from 'react-hot-toast';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse">Loading Admin Panel...</div>
      </div>
    );
  }

  const navItems = [
    { name: '概览', href: '/admin', icon: LayoutDashboard },
    { name: '用户管理', href: '/admin/users', icon: Users },
    { name: '歌单审核', href: '/admin/playlists', icon: ListMusic },
    // { name: '系统设置', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster position="top-right" />
      <Header />
      <div className="flex-1 container mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-xl p-4 sticky top-24 shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-6 px-4">管理控制台</h2>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
              
              <a 
                href="http://127.0.0.1:5556"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Database size={18} />
                数据管理
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl p-6 min-h-[calc(100vh-200px)] shadow-sm">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
