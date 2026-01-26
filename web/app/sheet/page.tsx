import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { promises as fs } from 'fs';
import path from 'path';
import SheetListClient from './SheetListClient';
import TinyPinyin from 'tiny-pinyin';

// Define project root explicitly
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const DB_PATH = path.join(PROJECT_ROOT, 'db.json');

async function getSheets() {
  try {
    try {
      await fs.access(DB_PATH);
    } catch {
      return [];
    }
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    // Filter songs that have a sheet file AND belong to a valid album (if required by business logic, 
    // or simply rely on existing songs. If album is deleted, song.album is empty string).
    // If the requirement is "When album is deleted, sheets should not show up", it implies 
    // sheets should only be shown if they belong to a valid album? 
    // Or maybe the user means "Deleting album didn't delete the songs"?
    // User input: "专辑删除时，歌谱页面没有相应删除" -> "When album is deleted, sheet page didn't update accordingly"
    // This likely means the songs (and thus sheets) still exist after album deletion.
    // If the intention of "Deleting Album" was to also delete the songs, then we need to update the delete logic.
    // BUT, the previous instruction was "Deleting album only clears the album field of songs".
    // So the songs still exist, just with empty album.
    // If the user wants sheets to disappear when album is deleted, maybe we should filter out songs with empty album here?
    
    // Let's filter out songs with empty album for now, assuming "Sheet Library" should only show organized content?
    // Or maybe the user expects the SONGS themselves to be deleted when album is deleted?
    // User's previous request: "删除专辑时，只删除了所有歌曲，但没有在专辑页面删除" (Wait, this was "Deleted all songs but didn't delete album page").
    // Actually, looking at the previous turn, the user said "Deleting album ... only deleted songs ...".
    // Re-reading: "删除专辑时，只删除了所有歌曲，但没有在专辑页面删除" -> "When deleting album, it ONLY deleted all songs (from album view), but didn't delete the album (entry) itself".
    // And I fixed it by deleting the album entry.
    
    // Current request: "专辑删除时，歌谱页面没有相应删除" -> "When album is deleted, sheet page didn't update accordingly".
    // This implies the user sees sheets for songs that belonged to the deleted album.
    // Since I only cleared the `album` field of songs, the songs still exist.
    // If the user wants them gone from Sheet page, they probably want the songs DELETED when album is deleted?
    // OR, they just want the sheet page to reflect that these songs no longer belong to that album (but sheet page lists ALL sheets).
    
    // If the user implies "I deleted the album, why are the sheets still there?", they probably expect the songs to be deleted too?
    // Let's look at the confirmation message I added: "这将清除所有相关歌曲的专辑信息，但不会删除歌曲文件。"
    // (This will clear album info for all related songs, but WON'T delete song files).
    
    // If the user is reporting this as a "bug" ("歌谱页面没有相应删除"), they probably want the sheets to be removed.
    // Which means they want the SONGS to be deleted when Album is deleted.
    
    // However, usually deleting an album shouldn't delete songs unless explicitly asked.
    // But if the user insists, maybe I should change the delete logic to delete songs too?
    // OR, maybe the Sheet Page is grouping by Album and showing "Unknown Album"?
    
    // Let's look at the Sheet Page screenshot. It groups by Initial Letter (A, L, Q...).
    // It lists songs. "领我到磐石之上", "全地都要大声欢呼".
    // These are the songs from the album "爱是Amazing" (or similar) that was deleted?
    
    // If the user wants them gone, I should update the Album Delete API to also delete the songs.
    // Let's verify this interpretation. "专辑删除时，歌谱页面没有相应删除" -> "When album deleted, sheet page didn't delete corresponding [sheets]".
    // Yes, strong implication that songs/sheets should be deleted.
    
    // So I will update the DELETE /api/album/[name] route to delete the songs as well.
    
    const songs = db.songs.filter((s: any) => s.files && s.files.sheet);
    
    // Pre-calculate index
    return songs.map((s: any) => {
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
        
        return { ...s, index };
    });
  } catch (e) {
    console.error("Error fetching sheets:", e);
    return [];
  }
}

export default async function SheetPage() {
  const sheets = await getSheets();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <SheetListClient initialSheets={sheets} />
      </main>
      <Footer />
    </div>
  );
}
