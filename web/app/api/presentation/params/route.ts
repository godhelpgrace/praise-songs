import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const PARAMS_FILE = path.join(DATA_DIR, 'presentation_params.json');

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function GET() {
  try {
    await ensureDataDir();
    if (!existsSync(PARAMS_FILE)) {
      return NextResponse.json({});
    }
    const data = await fs.readFile(PARAMS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to read params file:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureDataDir();
    const incoming = await request.json();
    
    let existing = {};
    // Use async exists check if possible, or just try/catch read
    try {
      const fileContent = await fs.readFile(PARAMS_FILE, 'utf-8');
      existing = JSON.parse(fileContent);
    } catch (e) {
    }
    const merged: any = { ...existing };
    
    if (incoming.items) {
      merged.items = { ...(merged.items || {}) };
      Object.keys(incoming.items).forEach(key => {
        merged.items[key] = {
          ...(merged.items[key] || {}),
          ...incoming.items[key]
        };
      });
    }

    // Also save background if provided
    if (incoming.bgUrl) {
        merged.bgUrl = incoming.bgUrl;
    }

    merged.updatedAt = Date.now();

    // Write file asynchronously
    await fs.writeFile(PARAMS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    
    return NextResponse.json({ status: 'ok', updatedAt: merged.updatedAt });
  } catch (error) {
    console.error('Failed to save params:', error);
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 });
  }
}
