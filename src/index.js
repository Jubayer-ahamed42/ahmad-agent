import dotenv from 'dotenv';
dotenv.config();

import { createTelegramBot } from './telegramBot.js';
import { setupScheduler, generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import { runNightlyBackup } from './backup.js';
import { getSystemStatus } from './systemController.js';

console.log('====================================================');
console.log('   Personal Executive AI Assistant (Agent 1)');
console.log('====================================================');

const token = process.env.TELEGRAM_BOT_TOKEN;
const ownerId = process.env.TELEGRAM_OWNER_ID;

let bot = null;

if (token) {
  bot = createTelegramBot(token, ownerId);
  bot.launch().then(() => {
    console.log('✅ Telegram Master Remote Bot is ONLINE and listening!');
  }).catch((err) => {
    console.error('Telegram Bot Launch Error:', err.message);
  });
} else {
  console.log('ℹ️  TELEGRAM_BOT_TOKEN is not set in .env. Bot waiting for token.');
}

// Setup Proactive Schedules
setupScheduler({
  onMorningBriefing: async () => {
    const text = generateMorningBriefingText();
    console.log('\n' + text + '\n');
    if (bot && ownerId) {
      try {
        await bot.telegram.sendMessage(ownerId, text, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error('Failed to send morning briefing to Telegram:', e.message);
      }
    }
  },
  onNightSummary: async () => {
    // 1. Run Nightly Backup
    await runNightlyBackup();

    // 2. Send Summary
    const text = generateNightSummaryText();
    console.log('\n' + text + '\n');
    if (bot && ownerId) {
      try {
        await bot.telegram.sendMessage(ownerId, text, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error('Failed to send night summary to Telegram:', e.message);
      }
    }
  }
});

const status = getSystemStatus();
console.log(`\n💻 System Ready on: ${status.hostname} (${status.os})`);
console.log(`⏱️  Uptime: ${status.uptime} | Free RAM: ${status.freeMemory}`);
console.log('🌟 Agent 1 is standing by for Sir.\n');

// Graceful shutdown
process.once('SIGINT', () => bot && bot.stop('SIGINT'));
process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));
