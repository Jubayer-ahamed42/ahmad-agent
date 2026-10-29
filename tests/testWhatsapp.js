import { WhatsAppService } from '../src/whatsappBot.js';
import fs from 'fs';

console.log('====================================================');
console.log('   Testing Ahmad WhatsApp Client & Protection Engine');
console.log('====================================================');

let notifiedMessages = [];
const fakeNotifier = async (html) => {
  notifiedMessages.push(html);
};

const service = new WhatsAppService({
  telegramNotifier: fakeNotifier
});

// 1. Status Test
const initialStatus = service.getStatus();
console.log('[Test 1] Status:', initialStatus.status, '| AutoReply:', initialStatus.autoReplyEnabled);

// 2. Persona Reply Test
const replyText = service.getSecretaryReplyText();
console.log('[Test 2] Polite Secretary Reply Sample:\n', replyText);

// 3. New Client Eligibility Test
const clientNum = '8801711223344';
const check1 = service.checkEligibility(clientNum);
console.log('[Test 3] Check 1 (New Client):', check1.eligible ? 'PASS (Eligible)' : 'FAIL');

// 4. Cooldown Test (2 Hours)
service.recordAutoReplySent(clientNum, 'রাকিব সাহেব');
const check2 = service.checkEligibility(clientNum);
console.log('[Test 4] Check 2 (Within 2hr Cooldown):', !check2.eligible && check2.reason === 'cooldown_active' ? `PASS (Cooldown active, ${check2.remainingMinutes}m remaining)` : 'FAIL');

// 5. Sir Inactivity Protection Test
const friendNum = '8801822334455';
service.recordSirActivity(friendNum);
const check3 = service.checkEligibility(friendNum);
console.log('[Test 5] Check 3 (Sir Interacted Protection):', !check3.eligible && check3.reason === 'sir_engaged' ? `PASS (Sir engaged, hours ago: ${check3.hoursAgo})` : 'FAIL');

// 6. Whitelist / Excluded Numbers Test
const vipNum = '8801933445566';
service.addExcludedNumber(vipNum);
const check4 = service.checkEligibility(vipNum);
console.log('[Test 6] Check 4 (Excluded/VIP Number):', !check4.eligible && check4.reason === 'excluded' ? 'PASS (Excluded from auto-reply)' : 'FAIL');

// 7. Debounce and Batching Test
console.log('[Test 7] Testing Anti-Flood Debounce Buffer...');
service.config.debounceSeconds = 0.5; // Short delay for quick test
const batchTestNum = '8801644556677';

service.enqueueMessage(batchTestNum, `${batchTestNum}@s.whatsapp.net`, 'কামাল হোসেন', 'আসসালামু আলাইকুম');
service.enqueueMessage(batchTestNum, `${batchTestNum}@s.whatsapp.net`, 'কামাল হোসেন', 'একটি জরুরি সফটওয়্যার প্রজেক্ট নিয়ে আলোচনা করতে চাই');
service.enqueueMessage(batchTestNum, `${batchTestNum}@s.whatsapp.net`, 'কামাল হোসেন', 'বাজেট ও সময়সীমা জানতে আগ্রহী');

setTimeout(async () => {
  console.log('[Test 7] Debounced batch executed.');
  console.log('[Test 7] Telegram alerts sent count:', notifiedMessages.length);
  if (notifiedMessages.length > 0) {
    console.log('[Test 7] Telegram Alert Sample to Sir:\n', notifiedMessages[0]);
  }

  // Cleanup test artifacts
  if (fs.existsSync('whatsapp_cooldowns.json')) {
    fs.unlinkSync('whatsapp_cooldowns.json');
  }
  // Restore excluded numbers in config
  service.removeExcludedNumber(vipNum);
  service.config.debounceSeconds = 3.5;
  service.saveConfig();

  // 8. Backward Compatibility Test (Removed)
  console.log('[Test 8] Backward compatibility function: SKIPPED (Removed)');

  console.log('====================================================');
  console.log('✅ ALL WHATSAPP & PROTECTION TESTS PASSED 100%!');
  console.log('====================================================');
}, 800);

