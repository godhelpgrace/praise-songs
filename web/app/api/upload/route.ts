import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/permission-check';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pinyin from 'tiny-pinyin';
import { prisma } from '@/lib/db';

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), '..', 'storage');

const sanitizeFolderName = (value: string) => {
  const cleaned = (value || '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return cleaned.length > 0 ? cleaned : 'default';
};

const sanitizeFileName = (value: string) => {
  const base = path.basename(value || '');
  const cleaned = base
    .replace(/[\0\/\\]/g, '_')
    .replace(/[%?#]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 180);
  return cleaned.length > 0 ? cleaned : 'file';
};

const isErrorWithCode = (value: unknown): value is { code?: unknown } => {
  return typeof value === 'object' && value !== null && 'code' in value;
};

const parseJsonObject = (value: string): Record<string, unknown> => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const normalizeTitle = (title: string) => {
  return title
    .replace(/\.[^/.]+$/, "") // Remove extension if present
    .replace(/\s*[\(\[\{（【].*?[\)\]\}）】]$/, "") // Remove trailing content in brackets (including Chinese brackets)
    .trim();
};

// Helper to save file
const saveFile = async (
  file: File,
  type: 'audio' | 'images' | 'lrc' | 'sheets',
  groupId: string,
  writtenFilePaths: string[]
) => {
  if (!(file instanceof File) || file.size === 0) return null;
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(STORAGE_ROOT, type, sanitizeFolderName(groupId));
  await mkdir(dir, { recursive: true });
  
  const fileName = sanitizeFileName(file.name);
  const parsed = path.parse(fileName);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0
        ? fileName
        : `${parsed.name}_${Date.now()}_${attempt}${parsed.ext}`;
    const filePath = path.join(dir, candidate);

    try {
      await writeFile(filePath, buffer, { flag: 'wx' });
      writtenFilePaths.push(filePath);
      return `/${type}/${sanitizeFolderName(groupId)}/${candidate}`;
    } catch (e: unknown) {
      if (isErrorWithCode(e) && e.code === 'EEXIST') continue;
      throw e;
    }
  }

  throw new Error('Failed to save file');
};

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorizedResponse();

  const canUpload = await checkPermission(user.id, 'upload', null);
  if (!canUpload) return forbiddenResponse('You do not have permission to upload');

  const writtenFilePaths: string[] = [];
  try {
    const formData = await request.formData();
    const title = ((formData.get('title') as string) || '').trim();
    const artistName = ((formData.get('artist') as string) || '').trim() || '未知歌手'; // Default to 'Unknown' if empty
    const albumName = ((formData.get('album') as string) || '').trim();
    const category = ((formData.get('category') as string) || '').trim();
    const releaseDate = ((formData.get('releaseDate') as string) || '').trim();
    const description = ((formData.get('description') as string) || '').trim();
    const genre = ((formData.get('genre') as string) || '').trim();
    const language = ((formData.get('language') as string) || '').trim();
    const force = formData.get('force') === 'true';
    
    const audioFile = formData.get('audioFile') as File;
    const imageFile = formData.get('imageFile') as File;
    const lrcFiles = formData.getAll('lrcFile') as File[];
    const sheetFiles = formData.getAll('sheetFile') as File[];

    if (!title) {
      return NextResponse.json({ error: 'Missing required fields: title' }, { status: 400 });
    }

    // Check for existing song (Title + Artist + Album)
    // Normalize the input title for comparison
    const normalizedInputTitle = normalizeTitle(title);
    
    // Find candidates by artist and album (if provided)
    const candidates = await prisma.song.findMany({
      where: {
        artistName: artistName,
        albumName: albumName || null
      }
    });

    // Find a match by comparing normalized titles
    const existingSong = candidates.find(s => normalizeTitle(s.title) === normalizedInputTitle);

    if (existingSong && !force) {
        const files = parseJsonObject(existingSong.files);

        const conflicts: string[] = [];
        const uploadedTypes: string[] = [];

        if (audioFile) {
            uploadedTypes.push('audio');
            if (files['audio']) conflicts.push('audio');
        }
        if (sheetFiles && sheetFiles.length > 0) {
            uploadedTypes.push('sheet');
            const sheets = files['sheets'];
            if ((Array.isArray(sheets) && sheets.length > 0) || files['sheet']) conflicts.push('sheet');
        }
        if (lrcFiles && lrcFiles.length > 0) {
            uploadedTypes.push('lrc');
            const lrcs = files['lrcs'];
            if ((Array.isArray(lrcs) && lrcs.length > 0) || files['lrc']) conflicts.push('lrc');
        }
        if (imageFile) {
            uploadedTypes.push('image');
            if (files['image']) conflicts.push('image');
        }

        return NextResponse.json({ 
            status: 'conflict', 
            message: 'Song already exists',
            conflicts,
            uploadedTypes,
            existingSong: {
                id: existingSong.id,
                title: existingSong.title,
                artist: existingSong.artistName
            }
        }, { status: 409 });
    }

    const songUuid = existingSong?.uuid || uuidv4().replace(/-/g, '').substring(0, 24);

    // Save all files
    const savedFiles: Record<string, unknown> = {};

    if (audioFile) savedFiles.audio = await saveFile(audioFile, 'audio', songUuid, writtenFilePaths);
    if (imageFile) savedFiles.image = await saveFile(imageFile, 'images', songUuid, writtenFilePaths);
    
    // Save multiple LRCs
    if (lrcFiles && lrcFiles.length > 0) {
        const savedLrcs = [];
        for (const f of lrcFiles) {
             if (f instanceof File) {
                const path = await saveFile(f, 'lrc', songUuid, writtenFilePaths);
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
                const path = await saveFile(f, 'sheets', songUuid, writtenFilePaths);
                if (path) savedSheets.push(path);
             }
        }
        if (savedSheets.length > 0) {
            savedFiles.sheets = savedSheets;
            savedFiles.sheet = savedSheets[0];
        }
    }

    const resultSong = await prisma.$transaction(async (tx) => {
      let artistEntry = await tx.artist.findFirst({
        where: { name: artistName }
      });

      if (!artistEntry) {
        const firstChar = artistName.charAt(0);
        let index = '#';
        if (pinyin.isSupported()) {
          const py = pinyin.convertToPinyin(firstChar, '', true);
          const firstLetter = py.charAt(0).toUpperCase();
          if (/^[A-Z]$/.test(firstLetter)) index = firstLetter;
        }

        artistEntry = await tx.artist.create({
          data: {
            name: artistName,
            index: index
          }
        });
      }

      const artistId = artistEntry.id;

      let albumId: string | null = null;

      if (albumName) {
        let albumEntry = await tx.album.findFirst({
          where: {
            name: albumName,
            artistId: artistId
          }
        });

        if (!albumEntry) {
          albumEntry = await tx.album.create({
            data: {
              name: albumName,
              artistId: artistId,
              artistName: artistName,
              releaseDate: releaseDate || new Date().toISOString().split('T')[0],
              description: description || '',
              genre: genre || '',
              language: language || '',
              cover: '/images/default_cover.png'
            }
          });
        } else {
          const updateData: { description?: string; genre?: string; language?: string; releaseDate?: string } = {};
          if (description) updateData.description = description;
          if (genre) updateData.genre = genre;
          if (language) updateData.language = language;
          if (releaseDate) updateData.releaseDate = releaseDate;

          if (Object.keys(updateData).length > 0) {
            await tx.album.update({
              where: { id: albumEntry.id },
              data: updateData
            });
          }
        }

        albumId = albumEntry.id;

        if (savedFiles.image) {
          const refreshed = await tx.album.findUnique({ where: { id: albumId } });
          if (refreshed && (!refreshed.cover || refreshed.cover.includes('default_cover'))) {
            await tx.album.update({
              where: { id: albumId },
              data: { cover: savedFiles.image }
            });
          }
        }
      }

      if (existingSong) {
        const song = await tx.song.findUnique({ where: { id: existingSong.id } });
        if (!song) {
          throw new Error('Song not found');
        }

        const currentFiles: Record<string, unknown> = parseJsonObject(song.files);

        if (savedFiles.audio) currentFiles['audio'] = savedFiles.audio;
        if (savedFiles.image) currentFiles['image'] = savedFiles.image;

        if (savedFiles.lrcs) {
          const existingLrcs = (currentFiles['lrcs'] as string[]) || [];
          const newLrcs = savedFiles.lrcs as string[];
          const mergedLrcs = Array.from(new Set([...existingLrcs, ...newLrcs]));
          currentFiles['lrcs'] = mergedLrcs;
          
          // Always update the default lrc to the latest one
          currentFiles['lrc'] = savedFiles.lrc;
        }

        if (savedFiles.sheets) {
          const existingSheets = (currentFiles['sheets'] as string[]) || [];
          const newSheets = savedFiles.sheets as string[];
          const mergedSheets = Array.from(new Set([...existingSheets, ...newSheets]));
          currentFiles['sheets'] = mergedSheets;
          
          // Always update the default sheet to the latest one
          currentFiles['sheet'] = savedFiles.sheet;
        }

        if (category) currentFiles['category'] = category;

        return tx.song.update({
          where: { id: song.id },
          data: {
            title: normalizedInputTitle,
            uuid: song.uuid || songUuid,
            files: JSON.stringify(currentFiles),
            artistId: artistId,
            artistName: artistName,
            albumId: albumId,
            albumName: albumName || null
          }
        });
      }

      const filesJson = {
        ...savedFiles,
        category: category || '简谱'
      };

      return tx.song.create({
        data: {
          title: normalizedInputTitle,
          uuid: songUuid,
          artistId,
          artistName,
          albumId: albumId,
          albumName: albumName || null,
          files: JSON.stringify(filesJson)
        }
      });
    });

    return NextResponse.json({ success: true, data: resultSong });

  } catch (error) {
    console.error('Upload error:', error);
    await Promise.allSettled(writtenFilePaths.map((p) => unlink(p)));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
