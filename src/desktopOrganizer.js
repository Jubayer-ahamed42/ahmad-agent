import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MANIFEST_PATH = path.resolve(__dirname, '../desktop_organize_manifest.json');

export class DesktopOrganizer {
  constructor(desktopPath = path.join(process.env.USERPROFILE || os.homedir(), 'Desktop')) {
    this.desktopPath = desktopPath;
    this.manifestPath = process.env.DESKTOP_MANIFEST_PATH || DEFAULT_MANIFEST_PATH;
    this.preservedFiles = [
      'desktop.ini',
      'sir_ai_talking_avatar.mp4'
    ];
    this.preservedFolders = [
      'app',
      'assignment',
      'everydays work',
      'work',
      'ডকুমেন্টস',
      'মিডিয়া',
      'ডাউনলোড ও ইনস্টলার'
    ];
  }

  scanDesktop() {
    if (!fs.existsSync(this.desktopPath)) {
      return { success: false, error: 'Desktop path not found.' };
    }

    const entries = fs.readdirSync(this.desktopPath, { withFileTypes: true });
    const categorized = {
      shortcuts: [],
      folders: [],
      documents: [],
      media: [],
      installers: [],
      system: [],
      others: []
    };

    for (const entry of entries) {
      const lowerName = entry.name.toLowerCase();
      if (entry.isDirectory()) {
        categorized.folders.push(entry.name);
        continue;
      }

      if (lowerName.startsWith('~$')) {
        // Office temporary lock files - skip
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.lnk' || ext === '.url') {
        categorized.shortcuts.push(entry.name);
      } else if (lowerName === 'desktop.ini') {
        categorized.system.push(entry.name);
      } else if (['.pdf', '.docx', '.doc', '.xlsx', '.pptx', '.txt', '.csv'].includes(ext)) {
        categorized.documents.push(entry.name);
      } else if (['.mp4', '.mkv', '.avi', '.jpg', '.jpeg', '.png', '.mp3', '.wav'].includes(ext)) {
        categorized.media.push(entry.name);
      } else if (['.exe', '.msi', '.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
        categorized.installers.push(entry.name);
      } else {
        categorized.others.push(entry.name);
      }
    }

    return {
      success: true,
      totalItems: entries.length,
      categorized
    };
  }

  getSummaryReport() {
    const scan = this.scanDesktop();
    if (!scan.success) return `⚠️ ডেস্কটপ স্ক্যান করা যায়নি: ${scan.error}`;

    const c = scan.categorized;
    return (
      `🖥️ <b>ডেস্কটপ ফাইল স্ট্যাটাস (স্যার):</b>\n\n` +
      `• মোট আইটেম: <b>${scan.totalItems}টি</b>\n` +
      `• ফোল্ডার: <b>${c.folders.length}টি</b>\n` +
      `• অ্যাপ শর্টকাট: <b>${c.shortcuts.length}টি</b>\n` +
      `• আলগা ডকুমেন্ট/পিডিএফ: <b>${c.documents.length}টি</b>\n` +
      `• মিডিয়া ফাইল: <b>${c.media.length}টি</b>\n` +
      `• ইনস্টলার ও জিপ: <b>${c.installers.length}টি</b>\n\n` +
      `💡 <i>সবগুলো ফাইল সুন্দরভাবে গুছিয়ে নিতে লিখুন:</i> <code>/organize_desktop</code>`
    );
  }

  organizeDesktop() {
    const scan = this.scanDesktop();
    if (!scan.success) return { success: false, error: scan.error };

    const c = scan.categorized;
    const movedFiles = [];

    const targetDirs = {
      documents: path.join(this.desktopPath, 'ডকুমেন্টস'),
      media: path.join(this.desktopPath, 'মিডিয়া'),
      installers: path.join(this.desktopPath, 'ডাউনলোড ও ইনস্টলার')
    };

    // 1. Move Documents
    for (const fileName of c.documents) {
      if (this.preservedFiles.includes(fileName.toLowerCase())) continue;
      if (!fs.existsSync(targetDirs.documents)) fs.mkdirSync(targetDirs.documents, { recursive: true });

      const oldPath = path.join(this.desktopPath, fileName);
      const newPath = path.join(targetDirs.documents, fileName);

      try {
        fs.renameSync(oldPath, newPath);
        movedFiles.push({ name: fileName, from: oldPath, to: newPath, category: 'documents' });
      } catch (e) {
        console.error(`Failed to move ${fileName}:`, e.message);
      }
    }

    // 2. Move Media (keeping Sir_AI_Talking_Avatar.mp4 on desktop)
    for (const fileName of c.media) {
      if (this.preservedFiles.includes(fileName.toLowerCase())) continue;
      if (!fs.existsSync(targetDirs.media)) fs.mkdirSync(targetDirs.media, { recursive: true });

      const oldPath = path.join(this.desktopPath, fileName);
      const newPath = path.join(targetDirs.media, fileName);

      try {
        fs.renameSync(oldPath, newPath);
        movedFiles.push({ name: fileName, from: oldPath, to: newPath, category: 'media' });
      } catch (e) {
        console.error(`Failed to move ${fileName}:`, e.message);
      }
    }

    // 3. Move Installers & Archives
    for (const fileName of c.installers) {
      if (this.preservedFiles.includes(fileName.toLowerCase())) continue;
      if (!fs.existsSync(targetDirs.installers)) fs.mkdirSync(targetDirs.installers, { recursive: true });

      const oldPath = path.join(this.desktopPath, fileName);
      const newPath = path.join(targetDirs.installers, fileName);

      try {
        fs.renameSync(oldPath, newPath);
        movedFiles.push({ name: fileName, from: oldPath, to: newPath, category: 'installers' });
      } catch (e) {
        console.error(`Failed to move ${fileName}:`, e.message);
      }
    }

    // Save manifest log for 1-click Undo capability
    if (movedFiles.length > 0) {
      fs.writeFileSync(this.manifestPath, JSON.stringify({
        organizedAt: new Date().toISOString(),
        files: movedFiles
      }, null, 2), 'utf-8');
    }

    return {
      success: true,
      movedCount: movedFiles.length,
      movedFiles
    };
  }

  undoOrganize() {
    if (!fs.existsSync(this.manifestPath)) {
      return { success: false, error: 'কোনো পূর্ববর্তী অর্গানাইজেশন রেকর্ড পাওয়া যায়নি।' };
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
      const restored = [];

      for (const item of (manifest.files || [])) {
        if (fs.existsSync(item.to)) {
          fs.renameSync(item.to, item.from);
          restored.push(item.name);
        }
      }

      fs.unlinkSync(this.manifestPath);
      return {
        success: true,
        restoredCount: restored.length,
        restored
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
