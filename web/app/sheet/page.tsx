import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SheetListClient from './SheetListClient';
import TinyPinyin from 'tiny-pinyin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getSheets() {
  try {
    // Find songs that likely have a sheet file
    // Since files is a JSON string, we can search for the key "sheet"
    const songs = await prisma.song.findMany({
      where: {
        files: {
          contains: 'sheet'
        }
      },
      include: {
        artist: true,
        album: true
      }
    });
    
    // Filter and map
    return songs
        .filter(s => {
            try {
                const files = JSON.parse(s.files);
                return files.sheet || (files.sheets && files.sheets.length > 0);
            } catch (e) {
                return false;
            }
        })
        .map((s: any) => {
            const firstChar = (s.title || '').trim().charAt(0);
            let index = '#';
            
            if (/[a-zA-Z]/.test(firstChar)) {
                index = firstChar.toUpperCase();
            } else if (/[\u4e00-\u9fa5]/.test(firstChar)) {
                const pinyin = TinyPinyin.convertToPinyin(firstChar);
                if (pinyin && /^[A-Za-z]/.test(pinyin)) {
                    index = pinyin.charAt(0).toUpperCase();
                }
            }

            let files = {};
            try {
                files = JSON.parse(s.files);
            } catch (e) {}
            
            return { ...s, index, files };
        });
  } catch (e) {
    console.error("Error fetching sheets:", e);
    return [];
  }
}

export default async function SheetPage() {
  const sheets = await getSheets();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <SheetListClient initialSheets={sheets} />
      </main>
      <Footer />
    </div>
  );
}
