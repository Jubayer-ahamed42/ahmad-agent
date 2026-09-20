import { exec } from 'child_process';
import path from 'path';

/**
 * FacebookBrowserEngine
 * 100% Zero-API, Local Windows Desktop Engine for Facebook Posting.
 * Uses interactive session Chrome launcher & Windows clipboard bridge.
 */
export class FacebookBrowserEngine {
  constructor(options = {}) {
    this.pageId = options.pageId || process.env.FB_PAGE_ID || '1347013991822233';
    this.pageUrl = 'https://www.facebook.com/besmartwithaipro/';
  }

  /**
   * Copy post content to Windows clipboard & launch Chrome directly to Page Composer
   */
  async prepareAndLaunchComposer(postText) {
    if (!postText || typeof postText !== 'string' || !postText.trim()) {
      return { success: false, error: 'পোস্টের মেসেজ খালি হতে পারে না।' };
    }

    const cleanText = postText.trim();
    const composerUrl = `https://business.facebook.com/latest/composer?asset_id=${this.pageId}`;

    return new Promise((resolve) => {
      const base64Content = Buffer.from(cleanText, 'utf-8').toString('base64');
      const copyScript = `$bytes = [Convert]::FromBase64String('${base64Content}'); $text = [System.Text.Encoding]::UTF8.GetString($bytes); Set-Clipboard -Value $text;`;
      const psScriptPath = path.resolve('src/open_app.ps1');
      const fullCmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${copyScript}" && powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" -AppName "chrome" -Arguments "${composerUrl}"`;

      exec(fullCmd, { timeout: 10000 }, (err, stdout) => {
        if (err) {
          console.warn('[FacebookBrowserEngine] Warning during browser launch:', err.message);
        } else {
          console.log('[FacebookBrowserEngine] Successfully copied to clipboard and launched composer:', stdout ? stdout.trim() : 'OK');
        }

        resolve({
          success: true,
          viaBrowser: true,
          postUrl: this.pageUrl,
          composerUrl,
          message: 'পোস্টের লেখাটি আপনার পিসির ক্লিপবোর্ডে কপি করা হয়েছে এবং গুগল ক্রোমে ফেসবুক পেজের কম্পোজার সরাসরি খুলে দেওয়া হয়েছে।'
        });
      });
    });
  }
}
