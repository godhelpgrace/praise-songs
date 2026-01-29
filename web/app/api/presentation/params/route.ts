import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { existsSync } from 'fs';
import { prisma } from '@/lib/db';

const DATA_DIR = path.join(process.cwd(), '..', 'data'); // Adjusted to project root data dir
const PARAMS_FILE = path.join(DATA_DIR, 'presentation_params.json');

// Helper to migrate legacy JSON data to Prisma
async function migrateLegacyData() {
  if (!existsSync(PARAMS_FILE)) return;

  try {
    const data = await fs.readFile(PARAMS_FILE, 'utf-8');
    const json = JSON.parse(data);

    // Migrate items (Song Params)
    if (json.items) {
      for (const [songId, params] of Object.entries(json.items)) {
        // Check if song exists
        const song = await prisma.song.findUnique({ where: { id: songId } });
        if (song) {
          await prisma.song.update({
            where: { id: songId },
            data: { presentation: JSON.stringify(params) }
          });
        }
      }
    }

    // Migrate bgUrl
    if (json.bgUrl) {
      await prisma.systemSetting.upsert({
        where: { key: 'presentationBgUrl' },
        update: { value: json.bgUrl },
        create: { key: 'presentationBgUrl', value: json.bgUrl }
      });
    }

    // Rename file to indicate migration done
    await fs.rename(PARAMS_FILE, `${PARAMS_FILE}.migrated`);
    console.log('Migrated presentation params to database');
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

export async function GET() {
  try {
    // Attempt migration if file exists
    await migrateLegacyData();

    // Fetch from DB
    // 1. Get all songs with presentation params
    // Note: We can't filter by JSON field value easily in SQLite/Prisma unless we fetch all
    // But usually presentation params are empty "{}".
    // Let's fetch all songs that have presentation != "{}".
    // Prisma doesn't support inequality on JSON string well, but let's try or just fetch all
    // Optimization: we can just fetch all songs ID and presentation field.
    const songs = await prisma.song.findMany({
      select: { id: true, presentation: true }
    });

    const items: Record<string, any> = {};
    songs.forEach(s => {
      if (s.presentation && s.presentation !== '{}') {
        try {
          items[s.id] = JSON.parse(s.presentation);
        } catch (e) {}
      }
    });

    // 2. Get global settings
    const bgSetting = await prisma.systemSetting.findUnique({
      where: { key: 'presentationBgUrl' }
    });

    return NextResponse.json({
      items,
      bgUrl: bgSetting?.value
    });
  } catch (error) {
    console.error('Failed to read params:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const incoming = await request.json();
    
    // Update items (Song Params)
    if (incoming.items) {
      const updates = Object.entries(incoming.items);
      
      // Process updates individually to avoid one failure blocking others
      await Promise.all(
        updates.map(async ([songId, params]) => {
          try {
            await prisma.song.update({
              where: { id: songId },
              data: { presentation: JSON.stringify(params) }
            });
          } catch (e) {
            // Ignore if song not found
            // console.warn(`Failed to update presentation params for song ${songId}:`, e);
          }
        })
      );
    }

    // Update bgUrl
    if (incoming.bgUrl) {
      await prisma.systemSetting.upsert({
        where: { key: 'presentationBgUrl' },
        update: { value: incoming.bgUrl },
        create: { key: 'presentationBgUrl', value: incoming.bgUrl }
      });
    }

    return NextResponse.json({ status: 'ok', updatedAt: Date.now() });
  } catch (error) {
    console.error('Failed to save params:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
