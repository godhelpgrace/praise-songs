import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/permission-check';
import { mkdir, unlink, writeFile } from 'fs/promises';
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

const saveFile = async (
  file: File,
  dirParts: string[],
  groupId: string,
  writtenFilePaths: string[]
) => {
  if (!(file instanceof File) || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const dir = path.join(STORAGE_ROOT, ...dirParts.map(sanitizeFolderName), sanitizeFolderName(groupId));
  await mkdir(dir, { recursive: true });

  const fileName = sanitizeFileName(file.name);
  const parsed = path.parse(fileName);

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0 ? fileName : `${parsed.name}_${Date.now()}_${attempt}${parsed.ext}`;
    const filePath = path.join(dir, candidate);
    try {
      await writeFile(filePath, buffer, { flag: 'wx' });
      writtenFilePaths.push(filePath);
      return `/${dirParts.map(sanitizeFolderName).join('/')}/${sanitizeFolderName(groupId)}/${candidate}`;
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
  if (!canUpload) return forbiddenResponse('You do not have permission to upload videos');

  const writtenFilePaths: string[] = [];
  try {
    const formData = await request.formData();

    const title = ((formData.get('title') as string) || '').trim();
    const artistName = ((formData.get('artist') as string) || '').trim();
    const songId = ((formData.get('songId') as string) || '').trim();
    const force = formData.get('force') === 'true';

    const videoFile = formData.get('videoFile') as File;
    const coverFile = formData.get('coverFile') as File;

    if (!title || !artistName || !(videoFile instanceof File)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingSong = songId ? await prisma.song.findUnique({ where: { id: songId } }) : null;
    if (songId && !existingSong) {
      return NextResponse.json({ error: 'Song not found' }, { status: 400 });
    }

    const videoUuid = uuidv4().replace(/-/g, '').substring(0, 24);

    const savedSrc = await saveFile(videoFile, ['videos'], videoUuid, writtenFilePaths);
    if (!savedSrc) {
      return NextResponse.json({ error: 'No video uploaded' }, { status: 400 });
    }
    const savedCover = coverFile
      ? await saveFile(coverFile, ['images', 'videos'], videoUuid, writtenFilePaths)
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      let artistEntry = await tx.artist.findFirst({ where: { name: artistName } });
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
            index
          }
        });
      }

      const artistId = artistEntry.id;

      const existingVideo = await txAny.video.findFirst({
        where: {
          title,
          artistId,
          songId: existingSong ? existingSong.id : null
        }
      });

      if (existingVideo && !force) {
        return { status: 'conflict' as const, video: existingVideo };
      }

      if (existingVideo) {
        const updated = await txAny.video.update({
          where: { id: existingVideo.id },
          data: {
            title,
            uuid: existingVideo.uuid || videoUuid,
            artistId,
            artistName,
            songId: existingSong ? existingSong.id : null,
            src: savedSrc,
            cover: savedCover || existingVideo.cover
          }
        });
        return { status: 'updated' as const, video: updated };
      }

      const created = await txAny.video.create({
        data: {
          title,
          uuid: videoUuid,
          artistId,
          artistName,
          songId: existingSong ? existingSong.id : null,
          src: savedSrc,
          cover: savedCover
        }
      });
      return { status: 'created' as const, video: created };
    });

    if (result.status === 'conflict') {
      await Promise.allSettled(writtenFilePaths.map((p) => unlink(p)));
      return NextResponse.json(
        {
          status: 'conflict',
          message: 'Video already exists',
          existingVideo: { id: result.video.id, title: result.video.title }
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.video.id,
        uuid: result.video.uuid,
        title: result.video.title,
        artistId: result.video.artistId,
        artistName: result.video.artistName,
        songId: result.video.songId,
        src: result.video.src,
        cover: result.video.cover,
        createdAt: result.video.createdAt.toISOString()
      }
    });
  } catch (e) {
    console.error('Video upload error:', e);
    await Promise.allSettled(writtenFilePaths.map((p) => unlink(p)));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
