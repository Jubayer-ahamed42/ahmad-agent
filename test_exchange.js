import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Personal Agent/Agent 1/.env' });

const appId = '1714437533000660';
const appSecret = 'f222dad5d970fcc3e2a5c7d36c821b2d';
const oldToken = process.env.FB_PAGE_ACCESS_TOKEN;

async function test() {
  const url = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${oldToken}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log('Status:', res.status, data);
}

test().catch(console.error);
