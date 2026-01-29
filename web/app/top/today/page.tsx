import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TopPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-white">排行榜</h1>
        <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl shadow-sm text-center text-slate-400 border border-white/10">
          排行榜功能开发中...
        </div>
      </main>
      <Footer />
    </div>
  );
}
