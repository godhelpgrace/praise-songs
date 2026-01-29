import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-background/50 backdrop-blur-lg border-t border-border mt-6 pt-6 pb-4">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-4">
          <div>
            <h3 className="font-bold text-foreground mb-2">赞美吧</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">关于我们</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">联系我们</Link></li>
              <li><Link href="/upload" className="hover:text-primary transition-colors">歌曲上架</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-2">歌库</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><Link href="/artist" className="hover:text-primary transition-colors">音乐人</Link></li>
              <li><Link href="/album" className="hover:text-primary transition-colors">专辑</Link></li>
              <li><Link href="/music" className="hover:text-primary transition-colors">歌曲</Link></li>
              <li><Link href="/playlist" className="hover:text-primary transition-colors">歌单</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-2">帮助</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">常见问题</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">反馈建议</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-2">客户端</h3>
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-secondary rounded border border-border flex items-center justify-center text-xs text-muted-foreground">
                二维码
              </div>
              <div className="flex flex-col justify-center gap-1">
                <Link href="#" className="bg-primary text-primary-foreground px-3 py-0.5 text-xs rounded hover:bg-primary/90 text-center transition-colors">Android版</Link>
                <Link href="#" className="bg-secondary text-secondary-foreground px-3 py-0.5 text-xs rounded hover:bg-secondary/80 text-center transition-colors">iOS版</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
          <p>© 2025 zanmei.ai . All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
