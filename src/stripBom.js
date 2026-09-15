import fs from 'fs';
import path from 'path';

const jsonFiles = [
  'rules/persona.json',
  'package.json',
  'subagents/socialMediaManager/persona.json',
  'subagents/codeExpert/persona.json'
];

console.log('--- Checking & Stripping UTF-8 BOM from JSON files ---');
for (const file of jsonFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    if (content.charCodeAt(0) === 0xFEFF) {
      console.log(`[BOM DETECTED & STRIPPED] ${file}`);
      content = content.slice(1);
      fs.writeFileSync(fullPath, content, 'utf-8');
    } else {
      console.log(`[CLEAN NO-BOM] ${file}`);
    }
    // Verify JSON validity
    try {
      JSON.parse(content);
      console.log(`[VALID JSON PASS] ${file}`);
    } catch (e) {
      console.log(`[INVALID JSON] ${file}: ${e.message}`);
    }
  }
}
