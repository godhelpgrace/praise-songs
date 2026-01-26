import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import mime from 'mime';

// Define storage root consistently
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const STORAGE_ROOT = path.join(PROJECT_ROOT, 'storage');

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: urlPath } = await params;
    
    // Decode URI components
    const decodedPath = urlPath.map(p => decodeURIComponent(p));
    
    // Construct local file path safely
    const filePath = path.join(STORAGE_ROOT, ...decodedPath);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(STORAGE_ROOT)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists and get stats
    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch {
      console.error(`File not found: ${filePath}`);
      return new NextResponse('File not found', { status: 404 });
    }
    
    const fileBuffer = await readFile(filePath);
    const contentType = mime.getType(filePath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes', // Hint to browser that seeking is supported (simplified impl)
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
