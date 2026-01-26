import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pinyin from 'tiny-pinyin';

// Helper to get current date path parts
const getDatePath = () => {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return { year, month, day };
};

// Mock DB Path
const DB_PATH = path.join(process.cwd(), '..', 'db.json');

// Initialize DB if not exists
async function initDB() {
  try {
    await readFile(DB_PATH);
  } catch (error) {
    await writeFile(DB_PATH, JSON.stringify({ songs: [], albums: [], artists: [] }, null, 2));
  }
}

// Generate ID from name
function generateId(name: string) {
    if (pinyin.isSupported()) {
        const py = pinyin.convertToPinyin(name, '', true); // true for no tone, separator ''
        return py.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    // Fallback if pinyin not supported or English
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function POST(request: NextRequest) {
  await initDB();
  
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const artistName = formData.get('artist') as string;
    const albumName = formData.get('album') as string;
    const releaseDate = formData.get('releaseDate') as string;
    const description = formData.get('description') as string;
    const genre = formData.get('genre') as string;
    const language = formData.get('language') as string;
    
    const audioFile = formData.get('audioFile') as File;
    const imageFile = formData.get('imageFile') as File;
    const lrcFiles = formData.getAll('lrcFile') as File[];
    const sheetFiles = formData.getAll('sheetFile') as File[];

    if (!title || !artistName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dbContent = JSON.parse(await readFile(DB_PATH, 'utf-8'));
    if (!dbContent.artists) dbContent.artists = [];
    if (!dbContent.albums) dbContent.albums = [];
    if (!dbContent.songs) dbContent.songs = [];
    
    // 1. Handle Artist
    let artistId = '';
    let artistEntry = dbContent.artists.find((a: any) => a.name === artistName);
    if (!artistEntry) {
        // Create new artist
        let baseId = generateId(artistName);
        if (!baseId) baseId = uuidv4().substring(0, 8);
        
        // Ensure unique ID
        let uniqueId = baseId;
        let counter = 1;
        while (dbContent.artists.find((a: any) => a.id === uniqueId)) {
            uniqueId = `${baseId}_${counter++}`;
        }
        artistId = uniqueId;

        const firstChar = artistName.charAt(0);
        let index = '#';
        if (pinyin.isSupported()) {
             const py = pinyin.convertToPinyin(firstChar, '', true);
             const firstLetter = py.charAt(0).toUpperCase();
             if (/^[A-Z]$/.test(firstLetter)) index = firstLetter;
        }

        artistEntry = {
            id: artistId,
            name: artistName,
            index: index
        };
        dbContent.artists.push(artistEntry);
    } else {
        artistId = artistEntry.id;
    }

    // 2. Handle Album
    let albumId = '';
    if (albumName) {
        let albumEntry = dbContent.albums.find((a: any) => a.name === albumName && a.artist_id === artistId);
        if (!albumEntry) {
             // Create new album
            const uuid = uuidv4().replace(/-/g, '').substring(0, 24);
            albumEntry = {
                id: Date.now().toString(),
                uuid,
                name: albumName,
                artist: artistName,
                artist_id: artistId,
                release_date: releaseDate || new Date().toISOString().split('T')[0],
                description: description || '',
                genre: genre || '',
                language: language || '',
                cover: '/images/default_cover.png', // Default cover
                songs: [], // Will store song IDs
                created_at: new Date().toISOString()
            };
            dbContent.albums.push(albumEntry);
        } else {
            // Update existing album metadata if provided
            if (description) albumEntry.description = description;
            if (genre) albumEntry.genre = genre;
            if (language) albumEntry.language = language;
            if (releaseDate) albumEntry.release_date = releaseDate;
        }
        albumId = albumEntry.id;
    }

    // Prepare storage paths
    const storageRoot = path.join(process.cwd(), '..', 'storage');
    
    const songId = Date.now().toString(); 
    const uuid = uuidv4().replace(/-/g, '').substring(0, 24); 
    
    const savedFiles: Record<string, any> = {};

    // Helper to save file
    const saveFile = async (file: File, type: 'audio' | 'images' | 'lrc' | 'sheets') => {
      if (!file || file.size === 0) return null;
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const dir = path.join(storageRoot, type);
      await mkdir(dir, { recursive: true });
      
      const fileName = file.name;
      const filePath = path.join(dir, fileName);
      
      await writeFile(filePath, buffer);
      return `/${type}/${fileName}`;
    };

    // Save all files
    if (audioFile) savedFiles.audio = await saveFile(audioFile, 'audio');
    if (imageFile) savedFiles.image = await saveFile(imageFile, 'images');
    
    // Save multiple LRCs
    if (lrcFiles && lrcFiles.length > 0) {
        const savedLrcs = [];
        for (const f of lrcFiles) {
             if (f instanceof File) {
                const path = await saveFile(f, 'lrc');
                if (path) savedLrcs.push(path);
             }
        }
        if (savedLrcs.length > 0) {
            savedFiles.lrcs = savedLrcs;
            savedFiles.lrc = savedLrcs[0];
        }
    }

    // Save multiple Sheets
    if (sheetFiles && sheetFiles.length > 0) {
        const savedSheets = [];
        for (const f of sheetFiles) {
             if (f instanceof File) {
                const path = await saveFile(f, 'sheets');
                if (path) savedSheets.push(path);
             }
        }
        if (savedSheets.length > 0) {
            savedFiles.sheets = savedSheets;
            savedFiles.sheet = savedSheets[0];
        }
    }

    // If album has no cover but we uploaded an image, update album cover
    if (albumId && savedFiles.image) {
         const albumEntry = dbContent.albums.find((a: any) => a.id === albumId);
         if (albumEntry && (!albumEntry.cover || albumEntry.cover.includes('default_cover'))) {
             albumEntry.cover = savedFiles.image;
         }
    }

    // Check for existing song (Title + Artist + Album)
    let existingSongIndex = -1;
    dbContent.songs.some((song: any, index: number) => {
      const metaMatch = song.title === title && 
                       song.artist === artistName && 
                       (song.album || '') === (albumName || '');
      if (metaMatch) existingSongIndex = index;
      return metaMatch;
    });

    // Update or Create Song
    let resultSong;
    if (existingSongIndex !== -1) {
        // Update existing song
        const existingSong = dbContent.songs[existingSongIndex];
        
        // Merge files
        if (!existingSong.files) existingSong.files = {};
        if (savedFiles.audio) existingSong.files.audio = savedFiles.audio;
        if (savedFiles.image) existingSong.files.image = savedFiles.image;
        
        if (savedFiles.lrcs) {
            existingSong.files.lrcs = savedFiles.lrcs;
            existingSong.files.lrc = savedFiles.lrc;
        }
        
        if (savedFiles.sheets) {
            existingSong.files.sheets = savedFiles.sheets;
            existingSong.files.sheet = savedFiles.sheet;
        }
        
        // Update metadata links
        existingSong.artist_id = artistId;
        if (albumId) existingSong.album_id = albumId;

        existingSong.updated_at = new Date().toISOString();
        
        dbContent.songs[existingSongIndex] = existingSong;
        resultSong = existingSong;
    } else {
        // Create new song
        const newSong = {
          id: songId,
          uuid,
          title,
          artist: artistName,
          artist_id: artistId,
          album: albumName,
          album_id: albumId || null,
          created_at: new Date().toISOString(),
          files: savedFiles
        };
        dbContent.songs.push(newSong);
        resultSong = newSong;
    }

    // Link Song to Album
    if (albumId && resultSong) {
        const albumEntry = dbContent.albums.find((a: any) => a.id === albumId);
        if (albumEntry && !albumEntry.songs.includes(resultSong.id)) {
            albumEntry.songs.push(resultSong.id);
        }
    }
    
    await writeFile(DB_PATH, JSON.stringify(dbContent, null, 2));

    return NextResponse.json({ success: true, data: resultSong });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
