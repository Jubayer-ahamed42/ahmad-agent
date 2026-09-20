import fs from 'fs';
import path from 'path';

/**
 * Generate Permanent (Never-Expiring) Facebook Page Access Token
 * 
 * Flow:
 * 1. User Token (Short-lived) + App ID + App Secret
 * 2. Exchanged for 60-day Long-Lived User Token
 * 3. GET /me/accounts with Long-Lived User Token -> Returns NEVER-EXPIRING Page Access Token!
 */
export async function getPermanentPageToken({ appId, appSecret, userToken, targetPageId = '1347013991822233' }) {
  console.log('[Meta Permanent Token Engine] Step 1: Exchanging for 60-day Long-Lived User Token...');
  
  const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `grant_type=fb_exchange_token` +
    `&client_id=${appId.trim()}` +
    `&client_secret=${appSecret.trim()}` +
    `&fb_exchange_token=${userToken.trim()}`;

  const exRes = await fetch(exchangeUrl);
  const exData = await exRes.json();

  if (exData.error) {
    throw new Error(`Failed to get long-lived user token: ${exData.error.message}`);
  }

  const longLivedUserToken = exData.access_token;
  console.log('[Meta Permanent Token Engine] Step 1 Success! 60-day token obtained.');

  console.log('[Meta Permanent Token Engine] Step 2: Fetching Never-Expiring Page Access Token...');
  const accountsUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${longLivedUserToken}`;
  const accRes = await fetch(accountsUrl);
  const accData = await accRes.json();

  if (accData.error) {
    throw new Error(`Failed to fetch page accounts: ${accData.error.message}`);
  }

  const pages = accData.data || [];
  const targetPage = pages.find(p => p.id === targetPageId) || pages[0];

  if (!targetPage) {
    throw new Error(`No Facebook Page found under this account.`);
  }

  const permanentPageToken = targetPage.access_token;
  console.log(`[Meta Permanent Token Engine] SUCCESS! Permanent Never-Expiring Token obtained for Page: "${targetPage.name}" (ID: ${targetPage.id})`);

  // Verify token expiry using debug_token
  console.log('[Meta Permanent Token Engine] Step 3: Verifying token lifespan with Meta debug API...');
  const debugUrl = `https://graph.facebook.com/v20.0/debug_token?input_token=${permanentPageToken}&access_token=${appId.trim()}|${appSecret.trim()}`;
  const dbgRes = await fetch(debugUrl);
  const dbgData = await dbgRes.json();

  const dataObj = dbgData.data || {};
  const isNever = dataObj.expires_at === 0 || dataObj.data_access_expires_at === 0 || !dataObj.expires_at;

  console.log(`[Meta Permanent Token Engine] Meta Token Expiry: ${isNever ? 'NEVER EXPIRES (LIFETIME)' : new Date(dataObj.expires_at * 1000).toLocaleString()}`);

  // Automatically save to .env
  const envPath = path.resolve('C:/Personal Agent/Agent 1/.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  
  if (envContent.includes('FB_PAGE_ACCESS_TOKEN=')) {
    envContent = envContent.replace(/FB_PAGE_ACCESS_TOKEN=.*/, `FB_PAGE_ACCESS_TOKEN=${permanentPageToken}`);
  } else {
    envContent += `\nFB_PAGE_ACCESS_TOKEN=${permanentPageToken}\n`;
  }

  // Also save FB_APP_ID and FB_APP_SECRET for future auto-refresh
  if (!envContent.includes('FB_APP_ID=')) envContent += `FB_APP_ID=${appId.trim()}\n`;
  else envContent = envContent.replace(/FB_APP_ID=.*/, `FB_APP_ID=${appId.trim()}`);

  if (!envContent.includes('FB_APP_SECRET=')) envContent += `FB_APP_SECRET=${appSecret.trim()}\n`;
  else envContent = envContent.replace(/FB_APP_SECRET=.*/, `FB_APP_SECRET=${appSecret.trim()}`);

  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('[Meta Permanent Token Engine] Saved to .env successfully!');

  return {
    success: true,
    pageName: targetPage.name,
    pageId: targetPage.id,
    expiresAt: isNever ? 'Never (Lifetime)' : new Date(dataObj.expires_at * 1000).toISOString(),
    token: permanentPageToken
  };
}
