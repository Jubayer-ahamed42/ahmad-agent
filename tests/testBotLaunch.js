import dotenv from 'dotenv';
dotenv.config();
import { createTelegramBot } from './telegramBot.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('Testing bot token:', token);
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
