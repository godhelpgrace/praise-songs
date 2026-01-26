import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TopPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">排行榜</h1>
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-lg shadow-sm text-center text-gray-500 border border-white/60">
          排行榜功能开发中...
        </div>
      </main>
      <Footer />
    </div>
  );
}
