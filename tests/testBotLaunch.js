import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: process.env.ENV_FILE_PATH || path.resolve(__dirname, '../.env') });

import { createTelegramBot } from '../src/telegramBot.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('Testing bot token:', token ? `${token.slice(0, 6)}...[REDACTED]` : 'undefined');
if (!token) {
  console.log('ℹ️ TELEGRAM_BOT_TOKEN is not defined in environment variables. Skipping launch test.');
  process.exit(0);
}
const bot = createTelegramBot(token);

try {
  console.log('Calling bot.launch()...');
  bot.launch(() => {
    console.log('Callback: BOT LAUNCHED SUCCESSFULLY!');
  });
  console.log('bot.launch() called without error.');
} catch (e) {
  console.error('Launch sync error:', e);
}
