import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('  COMPREHENSIVE CODEBASE & ARCHITECTURE AUDIT');
console.log('====================================================\n');

const issues = [];
const fixes = [];
const passed = [];

// 1. Check Directory Integrity
console.log('--- 1. Checking Directory & File Integrity ---');
const requiredPaths = [
  'rules/persona.json',
  'rules/GEMINI.md',
  'src/index.js',
  'src/executiveBrain.js',
  'src/voiceProcessor.js',
  'src/systemController.js',
  'src/scheduler.js',
  'src/fileSearch.js',
  'src/backup.js',
  'src/telegramBot.js',
  'src/whatsappBot.js',
  'src/subagentManager.js',
  'subagents/socialMediaManager/index.js',
  'subagents/socialMediaManager/videoProducer.js',
  'subagents/socialMediaManager/persona.json',
  'subagents/codeExpert/index.js',
  'subagents/codeExpert/architectureEngine.js',
  'subagents/codeExpert/codeAuditor.js',
  'subagents/codeExpert/projectScaffolder.js',
  'subagents/codeExpert/persona.json',
  'backups',
  'screenshots',
  'audio_cache'
];

for (const p of requiredPaths) {
  const full = path.join(process.cwd(), p);
  if (fs.existsSync(full)) {
    passed.push(`File/Directory Exists: ${p}`);
  } else {
    issues.push(`Missing Path: ${p}`);
  }
}

// 2. Test Module Imports
console.log('--- 2. Testing Dynamic Module Imports ---');
try {
  await import('./systemController.js');
  passed.push('systemController.js imported cleanly');
} catch (e) {
  issues.push(`systemController import failed: ${e.message}`);
}

try {
  await import('./scheduler.js');
  passed.push('scheduler.js imported cleanly');
} catch (e) {
  issues.push(`scheduler import failed: ${e.message}`);
}

try {
  await import('./fileSearch.js');
  passed.push('fileSearch.js imported cleanly');
} catch (e) {
  issues.push(`fileSearch import failed: ${e.message}`);
}

try {
  await import('./backup.js');
  passed.push('backup.js imported cleanly');
} catch (e) {
  issues.push(`backup import failed: ${e.message}`);
}

try {
  await import('./voiceProcessor.js');
  passed.push('voiceProcessor.js imported cleanly');
} catch (e) {
  issues.push(`voiceProcessor import failed: ${e.message}`);
}

try {
  await import('./subagentManager.js');
  passed.push('subagentManager.js imported cleanly');
} catch (e) {
  issues.push(`subagentManager import failed: ${e.message}`);
}

try {
  await import('./executiveBrain.js');
  passed.push('executiveBrain.js imported cleanly');
} catch (e) {
  issues.push(`executiveBrain import failed: ${e.message}`);
}

try {
  await import('./whatsappBot.js');
  passed.push('whatsappBot.js imported cleanly');
} catch (e) {
  issues.push(`whatsappBot import failed: ${e.message}`);
}

try {
  await import('../subagents/socialMediaManager/index.js');
  passed.push('subagents/socialMediaManager/index.js imported cleanly');
} catch (e) {
  issues.push(`socialMediaManager import failed: ${e.message}`);
}

try {
  await import('../subagents/codeExpert/index.js');
  passed.push('subagents/codeExpert/index.js imported cleanly');
} catch (e) {
  issues.push(`codeExpert import failed: ${e.message}`);
}

console.log('\nAudit Phase 1 & 2 Results:');
console.log('Passed Checks:', passed.length);
console.log('Issues Found:', issues.length);
if (issues.length > 0) {
  console.log('Issues:', issues);
}
