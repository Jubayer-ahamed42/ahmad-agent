import { exec } from 'child_process';
import path from 'path';

export function runNightlyBackup() {
  return new Promise((resolve) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupZip = `C:\\Personal Agent\\Agent 1\\backups\\backup_${timestamp}.zip`;

    // PowerShell command to compress folder excluding node_modules and .env
    const psCmd = `powershell.exe -NoProfile -Command "Compress-Archive -Path 'C:\\Personal Agent\\Agent 1\\rules', 'C:\\Personal Agent\\Agent 1\\src', 'C:\\Personal Agent\\Agent 1\\package.json', 'C:\\Personal Agent\\Agent 1\\README.md' -DestinationPath '${backupZip}' -Force"`;

    exec(psCmd, (err, stdout, stderr) => {
      if (err) {
        console.error('Backup Error:', err.message);
        return resolve({ success: false, error: err.message });
      }
      console.log(`[Backup] Nightly backup archive created: ${backupZip}`);
      resolve({ success: true, path: backupZip });
    });
  });
}
