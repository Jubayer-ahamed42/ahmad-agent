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

// 2. Take Screen Capture
export async function captureScreenshot(outputDir = 'C:\\Personal Agent\\Agent 1\\screenshots') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screen_${timestamp}.png`;
  const filePath = path.join(outputDir, filename);

  const imgBuffer = await screenshot({ format: 'png' });
  await import('fs/promises').then(fs => fs.writeFile(filePath, imgBuffer));
  return filePath;
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
