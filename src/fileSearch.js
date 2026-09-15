import fs from 'fs';
import path from 'path';

// Phonetic & transliteration mapping between Bengali and common English terms
const TRANSLITERATION_MAP = {
  'লেনথ': ['lethe', 'length', 'len'],
  'লেংথ': ['lethe', 'length'],
  'লেথে': ['lethe'],
  'ভাইরাস': ['virus'],
  'বুকস': ['books', 'book'],
  'বুক': ['book', 'books'],
  'বই': ['book', 'books'],
  'পিডিএফ': ['.pdf'],
  'ড্রাইভ': ['drive', 'my drive', 'google drive'],
  'গুগল': ['google'],
  'ডাউনলোড': ['download', 'downloads'],
  'ডেস্কটপ': ['desktop'],
  'ডকুমেন্ট': ['document', 'documents'],
  'ভিডিও': ['video', 'videos', '.mp4'],
  'ছবি': ['image', 'photo', 'picture', '.png', '.jpg', '.jpeg']
};

export function extractSearchTokens(rawQuery) {
  const queryLower = (rawQuery || '').toLowerCase();
  const tokens = new Set();

  // 1. Check transliterations
  for (const [bn, enList] of Object.entries(TRANSLITERATION_MAP)) {
    if (queryLower.includes(bn)) {
      enList.forEach(e => tokens.add(e.toLowerCase()));
      tokens.add(bn);
    }
  }

  // 2. Remove common Bengali conversational stop words
  const cleaned = queryLower
    .replace(/[এএকটিএকটানামেআছেতাতেতামাকেপাঠাওদাওখোঁজোখুঁজেসার্চsearchsendpdfপিডিএফfileফাইলসমূহ]/g, ' ')
    .replace(/[^\w\u0980-\u09FF\s.-]/g, ' ');

  cleaned.split(/\s+/).filter(w => w.length >= 2).forEach(w => {
    tokens.add(w.toLowerCase());
  });

  return Array.from(tokens);
}

export function getCandidateSearchRoots(queryLower = '', customDir = null) {
  if (customDir && fs.existsSync(customDir)) {
    return [customDir];
  }

  const roots = [];

  // Google Drive detection
  const gDrive = 'G:\\My Drive';
  if (fs.existsSync(gDrive)) {
    roots.push(gDrive);
  }

  // User standard folders
  const userBase = 'C:\\Users\\ASSDI';
  const standardDirs = [
    path.join(userBase, 'Desktop'),
    path.join(userBase, 'Downloads'),
    path.join(userBase, 'Documents'),
    'C:\\Personal Agent',
    'D:\\'
  ];

  for (const d of standardDirs) {
    if (fs.existsSync(d)) {
      roots.push(d);
    }
  }

  // Prioritize Google Drive if mentioned
  if (queryLower.includes('ড্রাইভ') || queryLower.includes('গুগল') || queryLower.includes('drive')) {
    roots.sort((a, b) => (a.includes('My Drive') ? -1 : 1));
  }

  return [...new Set(roots)];
}

export async function searchLocalFiles(query, customDir = null) {
  const queryLower = (query || '').toLowerCase();
  const tokens = extractSearchTokens(queryLower);
  const searchRoots = getCandidateSearchRoots(queryLower, customDir);

  const isPdfRequested = queryLower.includes('পিডিএফ') || queryLower.includes('pdf');
  const isImageRequested = queryLower.includes('ছবি') || queryLower.includes('photo') || queryLower.includes('image');
  const isVideoRequested = queryLower.includes('ভিডিও') || queryLower.includes('video');

  // Subfolder priority hints (e.g. 'BOOKS')
  let subfolderHint = '';
  if (queryLower.includes('বুকস') || queryLower.includes('books')) subfolderHint = 'books';
  if (queryLower.includes('ডাউনলোড') || queryLower.includes('download')) subfolderHint = 'download';

  const results = [];
  const visitedDirs = new Set();

  function walk(dir, depth = 0) {
    if (depth > 5 || visitedDirs.has(dir.toLowerCase())) return;
    visitedDirs.add(dir.toLowerCase());

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (
          e.name.startsWith('.') ||
          e.name === 'node_modules' ||
          e.name === '$RECYCLE.BIN' ||
          e.name === 'AppData'
        ) {
          continue;
        }

        const fullPath = path.join(dir, e.name);

        if (e.isDirectory()) {
          walk(fullPath, depth + 1);
        } else {
          const nameLower = e.name.toLowerCase();
          const pathLower = fullPath.toLowerCase();

          // Optional strict extension checks
          if (isPdfRequested && !nameLower.endsWith('.pdf')) continue;
          if (isVideoRequested && !/\.(mp4|mkv|mov|avi)$/i.test(nameLower)) continue;
          if (isImageRequested && !/\.(png|jpg|jpeg|webp)$/i.test(nameLower)) continue;

          let score = 0;
          for (const token of tokens) {
            if (token === '.pdf') continue; // don't count generic extension as title match
            if (nameLower.includes(token)) {
              score += 10;
            }
          }

          if (subfolderHint && pathLower.includes(subfolderHint)) {
            score += 6;
          }

          if (score > 0) {
            try {
              const stat = fs.statSync(fullPath);
              results.push({
                FullName: fullPath,
                Name: e.name,
                Length: stat.size,
                LastWriteTime: stat.mtime,
                score
              });
            } catch (err) {}
          }
        }
      }
    } catch (err) {}
  }

  for (const root of searchRoots) {
    walk(root);
  }

  // Sort by highest match score first, then newest
  results.sort((a, b) => b.score - a.score || b.LastWriteTime - a.LastWriteTime);

  return results.slice(0, 10);
}

