import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900/50 backdrop-blur-lg border-t border-white/10 mt-6 pt-6 pb-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-4">
          <div>
            <h3 className="font-bold text-white mb-2">赞美吧</h3>
            <ul className="space-y-1 text-sm text-gray-400">
              <li><Link href="/about" className="hover:text-blue-400 transition-colors">关于我们</Link></li>
              <li><Link href="/contact" className="hover:text-blue-400 transition-colors">联系我们</Link></li>
              <li><Link href="/upload" className="hover:text-blue-400 transition-colors">歌曲上架</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">歌库</h3>
            <ul className="space-y-1 text-sm text-gray-400">
              <li><Link href="/artist" className="hover:text-blue-400 transition-colors">音乐人</Link></li>
              <li><Link href="/album" className="hover:text-blue-400 transition-colors">专辑</Link></li>
              <li><Link href="/music" className="hover:text-blue-400 transition-colors">歌曲</Link></li>
              <li><Link href="/playlist" className="hover:text-blue-400 transition-colors">歌单</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">排行榜</h3>
            <ul className="space-y-1 text-sm text-gray-400">
              <li><Link href="/top/today" className="hover:text-blue-400 transition-colors">音乐人排行</Link></li>
              <li><Link href="/top/today" className="hover:text-blue-400 transition-colors">专辑排行</Link></li>
              <li><Link href="/top/today" className="hover:text-blue-400 transition-colors">歌曲排行</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-2">客户端</h3>
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-white/10 rounded border border-white/10 flex items-center justify-center text-xs text-gray-500">
                二维码
              </div>
              <div className="flex flex-col justify-center gap-1">
                <Link href="#" className="bg-emerald-600 text-white px-3 py-0.5 text-xs rounded hover:bg-emerald-500 text-center transition-colors">Android版</Link>
                <Link href="#" className="bg-white/10 text-white px-3 py-0.5 text-xs rounded hover:bg-white/20 text-center transition-colors">iOS版</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 text-center text-sm text-gray-500">
          <p>© 2025 zanmei.ai . All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
