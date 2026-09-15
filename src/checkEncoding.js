import fs from 'fs';
import path from 'path';

const files = [
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
  'subagents/codeExpert/index.js',
  'subagents/codeExpert/architectureEngine.js',
  'subagents/codeExpert/codeAuditor.js',
  'subagents/codeExpert/projectScaffolder.js'
];

console.log('--- Checking File Encodings & Question Marks (????) ---');
for (const f of files) {
  const content = fs.readFileSync(path.join(process.cwd(), f), 'utf-8');
  const qCount = (content.match(/\?\?\?\?/g) || []).length;
  if (qCount > 0) {
    console.log(`[CORRUPT ENCODING] ${f} contains ${qCount} occurrences of ????`);
  } else {
    console.log(`[OK] ${f}`);
  }
}
