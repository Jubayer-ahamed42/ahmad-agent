import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import net from 'net';
import http from 'http';

// Single-instance enforcement: prevents Telegram 409 Conflict and duplicate WhatsApp sockets
const LOCK_PORT = 38472;
const lockServer = net.createServer();
lockServer.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn('⚠️ Ahmad is already active in another window. Exiting duplicate instance.');
    process.exit(0);
  }
});
lockServer.listen(LOCK_PORT, '127.0.0.1');

import { createTelegramBot } from './telegramBot.js';
import { WhatsAppService } from './whatsappBot.js';
import { setupScheduler, generateMorningBriefingText, generateNightSummaryText, generateMorningVoiceBriefing, generateNightVoiceSummary } from './scheduler.js';
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

function sanitizeError(err) {
  if (!err) return '';
  const str = typeof err === 'string' ? err : (err.stack || err.message || String(err));
  return token ? str.split(token).join('[REDACTED_TOKEN]') : str;
}

// Global crash prevention & resilience
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Resilience] Unhandled Rejection:', sanitizeError(reason));
});
process.on('uncaughtException', (err) => {
  console.error('[Resilience] Uncaught Exception:', sanitizeError(err));
});

if (token) {
  bot = createTelegramBot(token, ownerId, whatsapp);
  const launchBot = () => {
    bot.launch(() => {
      console.log('✅ Ahmad Telegram Master Bot is ONLINE and listening!');
    }).catch((err) => {
      console.error('⚠️ Telegram bot launch error (retrying in 5s):', sanitizeError(err));
      setTimeout(launchBot, 5000);
    });
  };
  launchBot();
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
    console.log('[Scheduler] Executing 06:00 AM Morning Briefing for Sir...');
    try {
      const text = await generateMorningBriefingText();
      console.log('\n[Morning Briefing]\n' + text + '\n');
      if (bot && process.env.TELEGRAM_OWNER_ID) {
        try {
          const voicePath = await generateMorningVoiceBriefing();
          if (voicePath && fs.existsSync(voicePath)) {
            await bot.telegram.sendVoice(process.env.TELEGRAM_OWNER_ID, { source: fs.createReadStream(voicePath) });
          }
        } catch (ve) {
          console.error('[Scheduler] Voice morning note error:', ve.message);
        }
        await bot.telegram.sendMessage(process.env.TELEGRAM_OWNER_ID, text, { parse_mode: 'HTML' });
      }
    } catch (e) {
      console.error('[Scheduler] Failed to send morning briefing to Telegram:', e.message);
    }
  },
  onNightSummary: async () => {
    console.log('[Scheduler] Executing 09:00 PM Night Summary for Sir...');
    let backupOk = true;
    try {
      await runNightlyBackup();
    } catch (e) {
      backupOk = false;
      console.error('[Scheduler] Nightly backup error:', e.message);
    }

    try {
      const waStats = whatsapp ? whatsapp.getStatus() : null;
      const text = await generateNightSummaryText({ whatsappStats: waStats, backupSuccess: backupOk });
      console.log('\n[Night Summary]\n' + text + '\n');
      if (bot && process.env.TELEGRAM_OWNER_ID) {
        try {
          const voicePath = await generateNightVoiceSummary();
          if (voicePath && fs.existsSync(voicePath)) {
            await bot.telegram.sendVoice(process.env.TELEGRAM_OWNER_ID, { source: fs.createReadStream(voicePath) });
          }
        } catch (ve) {
          console.error('[Scheduler] Voice night note error:', ve.message);
        }
        await bot.telegram.sendMessage(process.env.TELEGRAM_OWNER_ID, text, { parse_mode: 'HTML' });
      }
    } catch (e) {
      console.error('[Scheduler] Failed to send night summary to Telegram:', e.message);
    }
  }
});

const status = getSystemStatus();
console.log(`\n💻 System Ready on: ${status.hostname} (${status.os})`);
console.log(`⏱️  Uptime: ${status.uptime} | Free RAM: ${status.freeMemory}`);
console.log('🌟 Ahmad is standing by for Sir.\n');

// Native HTTP Keep-Alive & Health-Check Server (for Hugging Face Spaces / Cloud deployment)
const HTTP_PORT = process.env.PORT || 7860;
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      agent: 'Ahmad (Personal Executive AI Assistant)',
      telegram: bot ? 'connected' : 'disabled',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`🌐 Ahmad Cloud Keep-Alive Server active on port ${HTTP_PORT}`);
});

// Keep Node.js process alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);

// Graceful shutdown
process.once('SIGINT', () => {
  if (bot) bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  if (bot) bot.stop('SIGTERM');
  process.exit(0);
});

