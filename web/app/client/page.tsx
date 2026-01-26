import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ClientPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">客户端下载</h1>
        <p className="text-gray-500">敬请期待</p>
      </main>
      <Footer />
    </div>
  );
}
