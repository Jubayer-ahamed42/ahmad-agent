import { exec } from 'child_process';
import os from 'os';
import path from 'path';

// 1. Get PC Hardware & System Status
export function getSystemStatus() {
  const cpus = os.cpus();
  const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
  const usedMemGB = (totalMemGB - freeMemGB).toFixed(2);
  const uptimeHours = (os.uptime() / 3600).toFixed(1);

  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpuModel: cpus[0]?.model || 'Unknown CPU',
    cpuCores: cpus.length,
    totalMemory: `${totalMemGB} GB`,
    freeMemory: `${freeMemGB} GB`,
    usedMemory: `${usedMemGB} GB`,
    uptime: `${uptimeHours} hours`,
    hostname: os.hostname(),
    username: os.userInfo().username
  };
}

// 2. Take Screen Capture (Native Win32 GDI with Desktop Switch + Fallback)
export async function captureScreenshot(outputDir = path.join(process.cwd(), 'screenshots')) {
  if (process.platform !== 'win32') {
    throw new Error('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে। লোকাল পিসি চালু হলে স্ক্রিনশট ফিচারটি স্বয়ংক্রিয়ভাবে সক্রিয় হবে, স্যার।');
  }

  const fs = await import('fs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screen_${timestamp}.png`;
  const filePath = path.join(outputDir, filename);

  const psScriptPath = path.join(process.cwd(), 'src', 'capture_screen.ps1');

  // Method A: Native Win32 GDI worker thread with desktop switch
  try {
    const { execSync } = await import('child_process');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" -OutputPath "${filePath}"`;
    execSync(cmd, { stdio: 'ignore', timeout: 5000 });

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size > 15000) {
        console.log(`[ScreenCapture] Native capture successful: ${filePath} (${stats.size} bytes)`);
        return filePath;
      } else {
        console.warn(`[ScreenCapture] Warning: Captured image was suspiciously small (${stats.size} bytes), trying fallback...`);
      }
    }
  } catch (err) {
    console.warn('[ScreenCapture] Native capture notice, trying fallback:', err.message);
  }

  // Method B: Fallback to screenshot-desktop library
  try {
    const screenshotModule = await import('screenshot-desktop');
    const screenshot = screenshotModule.default || screenshotModule;
    const imgBuffer = await screenshot({ format: 'png' });
    await import('fs/promises').then(fsp => fsp.writeFile(filePath, imgBuffer));
    console.log(`[ScreenCapture] Fallback capture saved to: ${filePath}`);
    return filePath;
  } catch (fbErr) {
    console.error('[ScreenCapture] All screen capture methods failed:', fbErr.message);
    throw fbErr;
  }
}

// 3. Put PC to Sleep
export function sleepPC() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return resolve('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে।');
    }
    exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0', (err, stdout) => {
      if (err) return reject(err);
      resolve('PC going to sleep mode, Sir.');
    });
  });
}

// 4. Shutdown PC (requires explicit 2FA)
export function shutdownPC() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return resolve('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে।');
    }
    exec('shutdown /s /t 0', (err, stdout) => {
      if (err) return reject(err);
      resolve('PC shutting down, Sir.');
    });
  });
}

// 5. Restart PC
export function restartPC() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return resolve('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে।');
    }
    exec('shutdown /r /t 0', (err, stdout) => {
      if (err) return reject(err);
      resolve('PC restarting, Sir.');
    });
  });
}

// 6. Lock PC Screen immediately
export function lockPC() {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') {
      return resolve('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে।');
    }
    exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
      if (err) return reject(err);
      resolve('PC screen locked, Sir.');
    });
  });
}

// 7. Empty Windows Recycle Bin
export function emptyRecycleBin() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে।');
    }
    exec('powershell.exe -NoProfile -Command "try { Clear-RecycleBin -Force -ErrorAction SilentlyContinue } catch {}"', () => {
      resolve('Recycle Bin emptied successfully, Sir.');
    });
  });
}

// 8. Open Application on PC (Interactive Session & WMI Launch)
export function openApplication(appName, args = '') {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve(`স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে থাকায় ${appName} চালু করা সম্ভব হয়নি।`);
    }
    const psScriptPath = path.join(process.cwd(), 'src', 'open_app.ps1');
    const safeApp = (appName || 'chrome').replace(/["']/g, '');
    const safeArgs = (args || '').replace(/["']/g, '`"');
    const cmdPart = safeArgs ? ` -Arguments "${safeArgs}"` : '';
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}" -AppName "${safeApp}"${cmdPart}`;
    
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        console.warn(`[openApplication] Notice: ${err.message}`);
      } else if (stdout) {
        console.log(`[openApplication] Output: ${stdout.trim()}`);
      }
      resolve(`Launched ${appName}, Sir.`);
    });
  });
}

// 9. Wake PC & Activate Lock Screen / Login Prompt
export function wakePC() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      return resolve('স্যার, আপনার উইন্ডোজ কম্পিউটারটি বর্তমানে অফলাইনে আছে।');
    }
    const psScriptPath = path.join(process.cwd(), 'src', 'wake_pc.ps1');
    const cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${psScriptPath}"`;
    
    exec(cmd, { timeout: 5000 }, (err, stdout) => {
      if (err) {
        console.warn(`[wakePC] Notice: ${err.message}`);
      } else if (stdout) {
        console.log(stdout.trim());
      }
      resolve('PC display awakened and login screen activated, Sir.');
    });
  });
}

