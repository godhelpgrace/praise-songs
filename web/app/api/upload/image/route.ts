
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/permission-check';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(process.cwd(), '..', 'storage');

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dir = path.join(STORAGE_ROOT, 'images', 'uploads');
    await mkdir(dir, { recursive: true });

    const ext = path.extname(file.name);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(dir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({ path: `/images/uploads/${fileName}` });
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
