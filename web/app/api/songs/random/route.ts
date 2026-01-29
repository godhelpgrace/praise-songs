import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch all songs
    // For larger datasets, this should be optimized (e.g. random skip or raw query)
    const songs = await prisma.song.findMany({
        include: {
            artist: true,
            album: true
        }
    });

    // Shuffle array (Fisher-Yates)
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [songs[i], songs[j]] = [songs[j], songs[i]];
    }

    // Slice to limit
    const randomSongs = songs.slice(0, limit);

    // Transform to match expected format if needed (or just return Prisma objects)
    // The frontend likely expects: id, title, artist (name), album (name), files...
    // Prisma objects have: id, title, artistName, albumName, files (string), artist (relation), album (relation)
    // We should parse files JSON if the client expects object, BUT
    // standard Prisma JSON serialization sends string for 'files' if it's type String.
    // The previous db.json had 'files' as Object.
    // So we MUST parse 'files' string to JSON object before returning.
    
    const processedSongs = randomSongs.map(s => {
        let files = {};
        try {
            files = JSON.parse(s.files);
        } catch (e) {}
        
        return {
            ...s,
            files
        };
    });

    return NextResponse.json(processedSongs);
  } catch (e) {
    console.error('Error fetching random songs:', e);
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 500 });
  }
}
