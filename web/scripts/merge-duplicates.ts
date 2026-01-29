
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

const normalizeTitle = (title: string) => {
  return title
    .replace(/\.[^/.]+$/, "")
    .replace(/\s*[\(\[\{（【].*?[\)\]\}）】]$/, "")
    .trim();
};

const parseFiles = (json: string) => {
    try {
        const parsed = JSON.parse(json);
        return (typeof parsed === 'object' && parsed !== null) ? parsed : {};
    } catch {
        return {};
    }
};

async function main() {
  const songs = await prisma.song.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Scanning ${songs.length} songs for duplicates...`);

  const groups = new Map<string, typeof songs>();

  for (const song of songs) {
    const normTitle = normalizeTitle(song.title);
    const artist = song.artistName || 'Unknown';
    // Use title + artist as key. 
    // If artist is missing or generic, we might want to be careful.
    // But for now let's assume strict artist match or empty match.
    const key = `${normTitle}|${artist}`;
    
    if (!groups.has(key)) {
        groups.set(key, []);
    }
    groups.get(key)?.push(song);
  }

  let mergedCount = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
        console.log(`Found duplicate group: ${key} (${group.length} songs)`);
        
        // Strategy: Keep the one with the shortest title (likely the base one without suffix), 
        // or the oldest if lengths are same.
        // Since we sorted by createdAt asc, the first one is oldest.
        // Let's sort by title length asc, then createdAt asc.
        group.sort((a, b) => {
            if (a.title.length !== b.title.length) {
                return a.title.length - b.title.length;
            }
            return a.createdAt.getTime() - b.createdAt.getTime();
        });

        const target = group[0];
        const others = group.slice(1);

        console.log(`  Target: "${target.title}" (ID: ${target.id})`);
        
        const targetFiles = parseFiles(target.files);
        
        // Arrays to hold merged resources
        const allSheets = new Set<string>();
        const allLrcs = new Set<string>();
        
        // Initialize with target's files
        if (targetFiles.sheet) allSheets.add(targetFiles.sheet as string);
        if (Array.isArray(targetFiles.sheets)) targetFiles.sheets.forEach((s: any) => allSheets.add(s));
        
        if (targetFiles.lrc) allLrcs.add(targetFiles.lrc as string);
        if (Array.isArray(targetFiles.lrcs)) targetFiles.lrcs.forEach((l: any) => allLrcs.add(l));

        let hasUpdates = false;

        for (const other of others) {
            console.log(`  Merging: "${other.title}" (ID: ${other.id})`);
            const otherFiles = parseFiles(other.files);

            // Merge Sheets
            if (otherFiles.sheet) allSheets.add(otherFiles.sheet as string);
            if (Array.isArray(otherFiles.sheets)) otherFiles.sheets.forEach((s: any) => allSheets.add(s));

            // Merge LRCs
            if (otherFiles.lrc) allLrcs.add(otherFiles.lrc as string);
            if (Array.isArray(otherFiles.lrcs)) otherFiles.lrcs.forEach((l: any) => allLrcs.add(l));

            // Merge Audio/Image if target is missing them
            if (!targetFiles.audio && otherFiles.audio) {
                targetFiles.audio = otherFiles.audio;
                hasUpdates = true;
            }
            if (!targetFiles.image && otherFiles.image) {
                targetFiles.image = otherFiles.image;
                hasUpdates = true;
            }
        }

        // Update target files
        targetFiles.sheets = Array.from(allSheets);
        targetFiles.lrcs = Array.from(allLrcs);
        
        // Ensure default sheet/lrc are set if they were missing but now available
        if (!targetFiles.sheet && targetFiles.sheets.length > 0) targetFiles.sheet = targetFiles.sheets[0];
        if (!targetFiles.lrc && targetFiles.lrcs.length > 0) targetFiles.lrc = targetFiles.lrcs[0];

        // Perform DB updates
        // 1. Update target
        await prisma.song.update({
            where: { id: target.id },
            data: {
                files: JSON.stringify(targetFiles)
            }
        });

        // 2. Delete others
        for (const other of others) {
            await prisma.song.delete({ where: { id: other.id } });
            // Note: We do NOT delete the physical files because they are now referenced by the target song!
        }

        mergedCount++;
    }
  }

  console.log(`Merge complete. Merged ${mergedCount} groups.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
