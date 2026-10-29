import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: process.env.ENV_FILE_PATH || path.resolve(__dirname, '../.env') });

const appId = process.env.FB_APP_ID;
const appSecret = process.env.FB_APP_SECRET;
const oldToken = process.env.FB_PAGE_ACCESS_TOKEN;

async function test() {
  if (!appId || !appSecret || !oldToken) {
    console.error('Error: FB_APP_ID, FB_APP_SECRET, or FB_PAGE_ACCESS_TOKEN is missing in environment variables.');
    process.exit(1);
  }
  const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${oldToken}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log('Status:', res.status, data);
}

test().catch(console.error);
