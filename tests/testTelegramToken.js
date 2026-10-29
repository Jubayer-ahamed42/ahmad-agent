import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not defined in environment variables.');
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
const data = await res.json();
console.log('Telegram getMe result:', JSON.stringify(data, null, 2));
