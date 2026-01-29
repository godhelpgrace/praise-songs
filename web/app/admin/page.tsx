'use client';

import Link from 'next/link';
import { Users, ListMusic } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">概览</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/users" className="block group">
          <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">用户管理</h3>
            <p className="text-muted-foreground text-sm">管理用户角色、权限分配</p>
          </div>
        </Link>

        <Link href="/admin/playlists" className="block group">
          <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <ListMusic size={24} />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">歌单审核</h3>
            <p className="text-muted-foreground text-sm">审批用户提交的推荐歌单</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
