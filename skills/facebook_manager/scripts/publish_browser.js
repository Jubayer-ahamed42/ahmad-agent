import { exec, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const TARGET_PAGE_ID = '1347013991822233';

/**
 * Deterministic browser publisher using UTF-8 Base64 clipboard bridge
 * and direct Chrome Session launcher.
 */
export async function publishToFacebookBrowser(postText, options = {}) {
  const pageId = options.pageId || TARGET_PAGE_ID;
  const composerUrl = `https://business.facebook.com/latest/composer?asset_id=${pageId}`;

  // Encode UTF-8 text safely into Base64
  const base64Content = Buffer.from(postText, 'utf-8').toString('base64');

  // PowerShell script to decode UTF-8 and set Windows Clipboard
  const psScript = `
$bytes = [System.Convert]::FromBase64String('${base64Content}');
$text = [System.Text.Encoding]::UTF8.GetString($bytes);
Add-Type -AssemblyName System.Windows.Forms;
[System.Windows.Forms.Clipboard]::SetText($text);
`;

  return new Promise((resolve, reject) => {
    // 1. Copy text to Windows Clipboard
    exec(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/\r?\n/g, ' ')}"`, (err) => {
      if (err) {
        console.error('[FacebookSkill:Script] Error copying post to clipboard:', err.message);
      } else {
        console.log('[FacebookSkill:Script] Post successfully copied to clipboard via Base64 bridge.');
      }

      // 2. Launch Chrome directly to Facebook Composer
      const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      const chromeAltPath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

      let targetChrome = null;
      if (fs.existsSync(chromePath)) targetChrome = chromePath;
      else if (fs.existsSync(chromeAltPath)) targetChrome = chromeAltPath;

      if (targetChrome) {
        console.log(`[FacebookSkill:Script] Launching Chrome to: ${composerUrl}`);
        const child = spawn(targetChrome, [composerUrl], { detached: true, stdio: 'ignore' });
        child.unref();
      } else {
        exec(`start "" "${composerUrl}"`);
      }

      resolve({
        success: true,
        method: 'local_browser_clipboard',
        composerUrl,
        pageId,
        charCount: postText.length
      });
    });
  });
}
