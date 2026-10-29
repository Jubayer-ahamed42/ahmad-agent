import { runNightlyBackup } from '../src/backup.js';
console.log('Testing Nightly Backup creation...');
const res = await runNightlyBackup();
console.log('Backup Result:', res);
