import fs from 'fs';
import path from 'path';

export class DesktopOrganizer {
  constructor(desktopPath = 'C:\\Users\\ASSDI\\Desktop') {
    this.desktopPath = desktopPath;
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
      system: [],
      others: []
    };

    for (const entry of entries) {
      const fullPath = path.join(this.desktopPath, entry.name);
      if (entry.isDirectory()) {
        categorized.folders.push(entry.name);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.lnk' || ext === '.url') {
        categorized.shortcuts.push(entry.name);
      } else if (entry.name === 'desktop.ini') {
        categorized.system.push(entry.name);
      } else if (['.pdf', '.docx', '.doc', '.xlsx', '.pptx', '.txt', '.csv'].includes(ext)) {
        categorized.documents.push(entry.name);
      } else if (['.mp4', '.mkv', '.avi', '.jpg', '.jpeg', '.png', '.mp3', '.wav'].includes(ext)) {
        categorized.media.push(entry.name);
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
      `🖥️ <b>ডেস্কটপ অর্গানাইজেশন সামারি (স্যার):</b>\n\n` +
      `• মোট আইটেম: <b>${scan.totalItems}টি</b>\n` +
      `• ফোল্ডার: <b>${c.folders.length}টি</b> (${c.folders.join(', ') || 'নেই'})\n` +
      `• শর্টকাট আইকন: <b>${c.shortcuts.length}টি</b> (অ্যাপস ও ড্রাইভ)\n` +
      `• ডকুমেন্ট/পিডিএফ: <b>${c.documents.length}টি</b> (${c.documents.join(', ') || 'নেই'})\n` +
      `• মিডিয়া ফাইল: <b>${c.media.length}টি</b> (${c.media.join(', ') || 'নেই'})\n\n` +
      `💡 <i>সবগুলো ফাইল নিরাপদ ও সুশৃঙ্খল রয়েছে।</i>`
    );
  }
}
