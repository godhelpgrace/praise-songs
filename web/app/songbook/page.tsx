import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SongbookPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-foreground">诗歌本</h1>
        <div className="bg-card backdrop-blur-xl p-8 rounded-2xl shadow-sm text-center text-muted-foreground border border-border">
          诗歌本列表开发中...
        </div>
      </main>
      <Footer />
    </div>
  );
}
