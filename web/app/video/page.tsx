import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function VideoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">视频</h1>
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
          视频列表开发中...
        </div>
      </main>
      <Footer />
    </div>
  );
}
