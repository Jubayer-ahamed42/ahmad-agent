import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

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
  'দাওয়া': ['dawah', 'dawa'],
  'দাওয়াহ': ['dawah', 'dawa'],
  'কারিকুলাম': ['curriculum', 'কারিকুলাম'],
  'আলেমদের': ['alem', 'আলেম'],
  'ভিডিও': ['video', 'videos', '.mp4'],
  'ছবি': ['image', 'photo', 'picture', '.png', '.jpg', '.jpeg']
};

const STOP_WORDS = new Set([
  'আমার', 'তোমার', 'জি', 'ড্রাইভ', 'ড্রাইভে', 'দেখো', 'একটা', 'একটি', 'অপশন', 'আছে', 'সেখানে',
  'নামে', 'তাতে', 'তা', 'আমাকে', 'পাঠাও', 'তো', 'দাও', 'খোঁজো', 'খুঁজে', 'সার্চ', 'search',
  'send', 'file', 'ফাইল', 'ফাইলটি', 'ফাইলসমূহ', 'দিয়ে', 'করো', 'এর', 'সেটা'
]);

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

  // 2. Extract meaningful words that are not stop-words
  const words = queryLower.split(/[\s,।!?\-_\/\\:;'"()[\]{}]+/);
  for (const w of words) {
    const trimmed = w.trim();
    if (trimmed.length >= 2 && !STOP_WORDS.has(trimmed)) {
      tokens.add(trimmed);
    }
  }

  return Array.from(tokens);
}

export function getCandidateSearchRoots(queryLower = '', customDir = null) {
  if (customDir && fs.existsSync(customDir)) {
    return [customDir];
  }

  const roots = [];

  // Google Drive detection
  const gDrive = process.env.GOOGLE_DRIVE_PATH || (fs.existsSync('G:\\My Drive') ? 'G:\\My Drive' : null);
  if (gDrive && fs.existsSync(gDrive)) {
    roots.push(gDrive);
  }

  // User standard folders
  const userBase = process.env.USERPROFILE || os.homedir();
  const standardDirs = [
    path.join(userBase, 'Desktop'),
    path.join(userBase, 'Downloads'),
    path.join(userBase, 'Documents'),
    projectRoot,
    process.env.AGENT_BASE_DIR || projectRoot,
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
            if (token === '.pdf') continue;
            if (nameLower.includes(token)) {
              score += 15;
            }
            if (pathLower.includes(token)) {
              score += 5;
            }
          }

          if (subfolderHint && pathLower.includes(subfolderHint)) {
            score += 10;
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

