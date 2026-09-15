import dotenv from 'dotenv';
dotenv.config();

import { createTelegramBot } from './telegramBot.js';
import { WhatsAppService } from './whatsappBot.js';
import { setupScheduler, generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import { runNightlyBackup } from './backup.js';
import { getSystemStatus } from './systemController.js';

console.log('====================================================');
console.log('   Personal Executive AI Assistant (Agent 1 - Ahmad)');
console.log('====================================================');

const token = process.env.TELEGRAM_BOT_TOKEN;
const ownerId = process.env.TELEGRAM_OWNER_ID;

let bot = null;
let whatsapp = null;

// Initialize WhatsApp Client Service
whatsapp = new WhatsAppService({
  telegramNotifier: async (htmlMessage) => {
    if (bot && process.env.TELEGRAM_OWNER_ID) {
      try {
        await bot.telegram.sendMessage(process.env.TELEGRAM_OWNER_ID, htmlMessage, {
          parse_mode: 'HTML'
        });
      } catch (e) {
        console.error('[Index] Failed to send WhatsApp alert to Telegram:', e.message);
      }
    }
  }
});

if (token) {
  bot = createTelegramBot(token, ownerId, whatsapp);
  bot.launch(() => {
    console.log('✅ Ahmad Telegram Master Bot is ONLINE and listening!');
  });
} else {
  console.log('ℹ️  TELEGRAM_BOT_TOKEN is not set in .env.');
}

// Start WhatsApp Multi-Device Client
whatsapp.start().catch((err) => {
  console.error('[Index] WhatsApp client startup error:', err.message);
});

// Setup Proactive Schedules
setupScheduler({
  onMorningBriefing: async () => {
    const text = generateMorningBriefingText();
    console.log('\n' + text + '\n');
    if (bot && process.env.TELEGRAM_OWNER_ID) {
      try {
        await bot.telegram.sendMessage(process.env.TELEGRAM_OWNER_ID, text, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error('Failed to send morning briefing to Telegram:', e.message);
      }
    }
  },
  onNightSummary: async () => {
    // 1. Run Nightly Backup
    await runNightlyBackup();

    // 2. Send Summary with WhatsApp stats
    let text = generateNightSummaryText();
    if (whatsapp) {
      const waStats = whatsapp.getStatus();
      text += `\n\n📱 *WhatsApp ক্লায়েন্ট খতিয়ান:*\n• আজ প্রাপ্ত বার্তা: ${waStats.receivedToday}টি\n• আজ প্রেরিত সচিব জবাব: ${waStats.repliedToday}টি`;
    }
    console.log('\n' + text + '\n');
    if (bot && process.env.TELEGRAM_OWNER_ID) {
      try {
        await bot.telegram.sendMessage(process.env.TELEGRAM_OWNER_ID, text, { parse_mode: 'Markdown' });
      } catch (e) {
        console.error('Failed to send night summary to Telegram:', e.message);
      }
    }
  }
});

const status = getSystemStatus();
console.log(`\n💻 System Ready on: ${status.hostname} (${status.os})`);
console.log(`⏱️  Uptime: ${status.uptime} | Free RAM: ${status.freeMemory}`);
console.log('🌟 Ahmad is standing by for Sir.\n');

// Graceful shutdown
process.once('SIGINT', () => {
  if (bot) bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  if (bot) bot.stop('SIGTERM');
  process.exit(0);
});

