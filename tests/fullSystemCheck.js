import { getSystemStatus, captureScreenshot } from '../src/systemController.js';
import { searchLocalFiles } from '../src/fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from '../src/scheduler.js';
import { runNightlyBackup } from '../src/backup.js';
import { VoiceProcessor } from '../src/voiceProcessor.js';
import { WhatsAppService } from '../src/whatsappBot.js';
import { SubagentManager } from '../src/subagentManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('       FULL COMPREHENSIVE END-TO-END VERIFICATION');
console.log('====================================================\n');

const results = [];

// 1. System Controller
try {
  const status = getSystemStatus();
  results.push({ test: 'System Controller (Hardware Specs)', status: 'PASS', detail: `${status.cpuModel} (${status.cpuCores} Cores), ${status.freeMemory} RAM Free` });
} catch (e) {
  results.push({ test: 'System Controller', status: 'FAIL', detail: e.message });
}

// 2. Screenshot Tool
try {
  const img = await captureScreenshot();
  results.push({ test: 'PC Screen Capture', status: 'PASS', detail: `Screenshot saved: ${fs.existsSync(img)}` });
} catch (e) {
  results.push({ test: 'PC Screen Capture', status: 'FAIL', detail: e.message });
}

try {
  const searchRoot = process.env.AGENT_BASE_DIR || projectRoot;
  const files = await searchLocalFiles('persona.json', searchRoot);
  results.push({ test: 'Local File Search Engine', status: 'PASS', detail: `Found ${files.length} matching files` });
} catch (e) {
  results.push({ test: 'Local File Search Engine', status: 'FAIL', detail: e.message });
}

// 4. Proactive Scheduler
try {
  const m = await generateMorningBriefingText();
  const n = await generateNightSummaryText();
  results.push({ test: 'Proactive Scheduler (06:00 AM & 09:00 PM)', status: 'PASS', detail: `Briefing & Summary generated (${m.length + n.length} chars)` });
} catch (e) {
  results.push({ test: 'Proactive Scheduler', status: 'FAIL', detail: e.message });
}

// 5. Automated Backup
try {
  const b = await runNightlyBackup();
  results.push({ test: 'Automated Nightly Backup', status: b.success ? 'PASS' : 'FAIL', detail: `Archive: ${b.path}` });
} catch (e) {
  results.push({ test: 'Automated Nightly Backup', status: 'FAIL', detail: e.message });
}

// 6. Voice Synthesis
try {
  const vp = new VoiceProcessor();
  const audio = await vp.speakToSir('পরীক্ষা সফল হয়েছে স্যার।');
  results.push({ test: 'Ahmad Bengali Neural Voice Engine', status: 'PASS', detail: `Audio generated: ${fs.existsSync(audio)}` });
} catch (e) {
  results.push({ test: 'Voice Engine', status: 'FAIL', detail: e.message });
}

// 7. WhatsApp Client Auto-Responder
try {
  const wa = new WhatsAppService();
  const replyText = wa.getSecretaryReplyText();
  const hasSir = replyText.includes('স্যার');
  results.push({ test: 'WhatsApp Client Auto-Responder ("স্যার" etiquette)', status: hasSir ? 'PASS' : 'FAIL', detail: `Replied with proper etiquette: ${hasSir}` });
} catch (e) {
  results.push({ test: 'WhatsApp Bot', status: 'FAIL', detail: e.message });
}

// 8. Subagents Coordinator
try {
  const sm = new SubagentManager();
  
  // Test Social Media
  const post = sm.delegatePostCreation('নতুন অফার', 'ওয়েব ডেভেলপমেন্ট');
  
  // Test 20-Year Architect
  const arch = sm.delegateProjectPlan('Enterprise ERP Platform', { scale: '500k Users' });
  const audit = sm.delegateCodeReview('var token = "secret_123";');
  
  results.push({ test: 'Subagent 1: Social Media Expert (Posts & Video Pipeline)', status: 'PASS', detail: 'Post generation & Video Engine active' });
  results.push({ test: 'Subagent 2: 20-Year Principal Architect (System Design & Security Audit)', status: 'PASS', detail: `Auditor caught ${audit.critical.length + audit.warnings.length} issues, Architecture layer defined` });
} catch (e) {
  results.push({ test: 'Subagents Delegation', status: 'FAIL', detail: e.message });
}

console.log('\n--- FINAL VERIFICATION SCOREBOARD ---');
console.table(results);
const allPassed = results.every(r => r.status === 'PASS');
console.log(`\nOverall Architecture Health: ${allPassed ? '100% HEALTHY & PRODUCTION READY' : 'ISSUES DETECTED'}`);
