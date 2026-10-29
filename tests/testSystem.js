import { getSystemStatus, captureScreenshot } from '../src/systemController.js';

console.log('Testing System Status...');
const status = getSystemStatus();
console.log('Status Result:\n', JSON.stringify(status, null, 2));

console.log('\nTesting Screenshot Capture...');
const savedPath = await captureScreenshot();
console.log('Screenshot successfully saved to:', savedPath);
