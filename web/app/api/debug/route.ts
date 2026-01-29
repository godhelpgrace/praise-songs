import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { prisma } from '@/lib/db';

export async function GET() {
  const cwd = process.cwd();
  const projectRoot = path.resolve(cwd, '..');
  const dbPath = path.join(projectRoot, 'db.json');
  const storageRoot = path.join(projectRoot, 'storage');
  
  let dbExists = false;
  let storageExists = false;
  let rootDirContents: string[] = [];
  let prismaStatus = 'unknown';

  try {
    await fs.access(dbPath);
    dbExists = true;
  } catch {}

  try {
    await fs.access(storageRoot);
    storageExists = true;
  } catch {}

  try {
    rootDirContents = await fs.readdir(projectRoot);
  } catch {}

  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaStatus = 'connected';
  } catch (e: any) {
    prismaStatus = `error: ${e.message}`;
  }

  return NextResponse.json({
    cwd,
    projectRoot,
    dbPath,
    storageRoot,
    dbExists,
    storageExists,
    rootDirContents,
    prismaStatus
  });
}
