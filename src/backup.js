import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export function runNightlyBackup() {
  return new Promise((resolve) => {
    const backupDir = 'C:\\Personal Agent\\Agent 1\\backups';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupZip = path.join(backupDir, `backup_${timestamp}.zip`);

    // PowerShell command to compress folder including subagents, excluding node_modules and .env
    const psCmd = `powershell.exe -NoProfile -Command "Compress-Archive -Path 'C:\\Personal Agent\\Agent 1\\rules', 'C:\\Personal Agent\\Agent 1\\src', 'C:\\Personal Agent\\Agent 1\\subagents', 'C:\\Personal Agent\\Agent 1\\package.json', 'C:\\Personal Agent\\Agent 1\\README.md' -DestinationPath '${backupZip}' -Force"`;

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
