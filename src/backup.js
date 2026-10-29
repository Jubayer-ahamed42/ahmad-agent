import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function runNightlyBackup() {
  return new Promise((resolve) => {
    const backupDir = process.env.BACKUP_DIR || path.join(rootDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupZip = path.join(backupDir, `backup_${timestamp}.zip`);

    // PowerShell command to compress folder including subagents, excluding node_modules and .env
    const pathsToZip = [
      path.join(rootDir, 'rules'),
      path.join(rootDir, 'src'),
      path.join(rootDir, 'subagents'),
      path.join(rootDir, 'package.json'),
      path.join(rootDir, 'README.md')
    ].map(p => `'${p}'`).join(', ');

    const psCmd = `powershell.exe -NoProfile -Command "Compress-Archive -Path ${pathsToZip} -DestinationPath '${backupZip}' -Force"`;

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
