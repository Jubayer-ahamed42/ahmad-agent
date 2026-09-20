import { execSync } from 'child_process';

try {
  execSync('powershell.exe -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"');
  console.log('Minimized all windows');
} catch (e) {
  console.error('Error:', e.message);
}
