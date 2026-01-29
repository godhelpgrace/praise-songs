import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { User } from 'lucide-react';
import { prisma } from '@/lib/db';

async function getArtists() {
  try {
    const artists = await prisma.artist.findMany({
      orderBy: { name: 'asc' }
    });
    return artists.map(a => ({
      ...a,
      index: a.index || '#'
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function ArtistPage() {
  const artists = await getArtists();

  // Group artists by index
  const groupedArtists = artists.reduce((acc: any, artist: any) => {
    const index = artist.index;
    if (!acc[index]) {
      acc[index] = [];
    }
    acc[index].push(artist);
    return acc;
  }, {});

  // Get sorted indexes
  const indexes = Object.keys(groupedArtists).sort();
  const allIndexes = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  allIndexes.push('其他');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-border">
           <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <User className="w-6 h-6 text-rose-500" />
              赞美诗音乐人
           </h2>
        </div>

        {/* Index Navigation */}
        <div className="bg-card/90 p-6 rounded-2xl shadow-sm border border-border mb-8 sticky top-28 z-10 backdrop-blur-xl">
          <div className="flex flex-wrap gap-3">
            {allIndexes.map((index) => (
              <a 
                key={index} 
                href={`#index-${index}`}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary hover:text-primary-foreground text-foreground font-bold transition-all duration-200 bg-muted hover:shadow-md text-sm border border-border"
              >
                {index}
              </a>
            ))}
          </div>
        </div>

        {/* Artist List */}
        <div className="bg-card/90 backdrop-blur-lg p-8 rounded-3xl shadow-sm min-h-[500px] border border-border">
          <div className="flex justify-end mb-4">
             <Link href="/" className="text-sm text-foreground hover:text-primary flex items-center gap-1 transition-colors font-medium">
                返回首页
             </Link>
          </div>
          
          <div className="space-y-12">
            {indexes.map(index => (
              <div key={index} id={`index-${index}`} className="scroll-mt-48">
                <h3 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3">
                   <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg shadow-lg shadow-primary/30">
                     {index}
                   </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {groupedArtists[index].map((artist: any) => (
                    <Link 
                      href={`/artist/${artist.id}`} 
                      key={artist.id}
                      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted hover:shadow-md transition-all duration-300 border border-transparent hover:border-border"
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <User size={20} />
                      </div>
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {artist.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
