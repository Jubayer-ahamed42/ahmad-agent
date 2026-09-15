import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const jsFiles = [
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
  'subagents/codeExpert/index.js',
  'subagents/codeExpert/architectureEngine.js',
  'subagents/codeExpert/codeAuditor.js',
  'subagents/codeExpert/projectScaffolder.js'
];

console.log('--- Checking Syntax for all JS files ---');
for (const file of jsFiles) {
  try {
    execSync(`node -c "${path.join(process.cwd(), file)}"`, { stdio: 'pipe' });
    console.log(`[SYNTAX PASS] ${file}`);
  } catch (err) {
    console.log(`[SYNTAX FAIL] ${file}: ${err.message}`);
  }
}
