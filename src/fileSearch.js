import { exec } from 'child_process';

export function searchLocalFiles(query, searchDir = 'C:\\') {
  return new Promise((resolve, reject) => {
    // Escape single quotes for PowerShell
    const cleanQuery = query.replace(/'/g, "''");
    const cmd = `powershell.exe -NoProfile -Command "Get-ChildItem -Path '${searchDir}' -Filter '*${cleanQuery}*' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 10 -Property FullName, Length, LastWriteTime | ConvertTo-Json"`;

    exec(cmd, { maxBuffer: 1024 * 1024 * 4 }, (err, stdout, stderr) => {
      if (err) return resolve([]);
      try {
        const parsed = JSON.parse(stdout.trim() || '[]');
        const results = Array.isArray(parsed) ? parsed : [parsed];
        resolve(results.filter(r => r && r.FullName));
      } catch (e) {
        resolve([]);
      }
    });
  });
}
