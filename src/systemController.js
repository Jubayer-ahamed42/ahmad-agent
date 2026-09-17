import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import screenshot from 'screenshot-desktop';

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
export async function captureScreenshot(outputDir = 'C:\\Personal Agent\\Agent 1\\screenshots') {
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
    exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0', (err, stdout) => {
      if (err) return reject(err);
      resolve('PC going to sleep mode, Sir.');
    });
  });
}

// 4. Shutdown PC (requires explicit 2FA)
export function shutdownPC() {
  return new Promise((resolve, reject) => {
    exec('shutdown /s /t 0', (err, stdout) => {
      if (err) return reject(err);
      resolve('PC shutting down, Sir.');
    });
  });
}

// 5. Restart PC
export function restartPC() {
  return new Promise((resolve, reject) => {
    exec('shutdown /r /t 0', (err, stdout) => {
      if (err) return reject(err);
      resolve('PC restarting, Sir.');
    });
  });
}

// 6. Lock PC Screen immediately
export function lockPC() {
  return new Promise((resolve, reject) => {
    exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
      if (err) return reject(err);
      resolve('PC screen locked, Sir.');
    });
  });
}

// 7. Empty Windows Recycle Bin
export function emptyRecycleBin() {
  return new Promise((resolve) => {
    exec('powershell.exe -NoProfile -Command "try { Clear-RecycleBin -Force -ErrorAction SilentlyContinue } catch {}"', () => {
      resolve('Recycle Bin emptied successfully, Sir.');
    });
  });
}

// 8. Open Application on PC
export function openApplication(appName) {
  const normalized = (appName || '').toLowerCase().trim();
  let cmd = '';

  if (normalized.includes('chrome') || normalized.includes('ক্রোম') || normalized.includes('browser') || normalized.includes('ব্রাউজার')) {
    cmd = 'start chrome';
  } else if (normalized.includes('notepad') || normalized.includes('নোটপ্যাড')) {
    cmd = 'notepad.exe';
  } else if (normalized.includes('calc') || normalized.includes('ক্যালকুলেটর')) {
    cmd = 'calc.exe';
  } else if (normalized.includes('explorer') || normalized.includes('ফাইল ম্যানেজার') || normalized.includes('দিস পিসি')) {
    cmd = 'explorer.exe';
  } else if (normalized.includes('taskmgr') || normalized.includes('টাস্ক ম্যানেজার')) {
    cmd = 'taskmgr.exe';
  } else if (normalized.includes('cmd') || normalized.includes('টার্মিনাল') || normalized.includes('কমান্ড')) {
    cmd = 'start cmd.exe';
  } else if (normalized.includes('edge') || normalized.includes('এজ')) {
    cmd = 'start msedge';
  } else {
    cmd = `start "" "${appName}"`;
  }

  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) return reject(err);
      resolve(`Application launched: ${appName}`);
    });
  });
}

