import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Personal Agent/Agent 1/.env' });
import fs from 'fs';
import { Telegraf } from 'telegraf';
import { generateMorningBriefingText, generateNightSummaryText, generateMorningVoiceBriefing, generateNightVoiceSummary } from './src/scheduler.js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ownerId = process.env.TELEGRAM_OWNER_ID;

async function main() {
  console.log('--- Testing Morning Briefing ---');
  const morningText = await generateMorningBriefingText();
  console.log(morningText);

  console.log('\n--- Testing Night Summary ---');
  const nightText = await generateNightSummaryText({
    whatsappStats: { receivedToday: 5, repliedToday: 5 },
    backupSuccess: true
  });
  console.log(nightText);

  console.log('\n--- Sending Live Demo Briefing to Sir on Telegram ---');
  
  // 1. Send sample morning voice note + briefing
  const mVoice = await generateMorningVoiceBriefing();
  if (mVoice && fs.existsSync(mVoice)) {
    await bot.telegram.sendVoice(ownerId, { source: fs.createReadStream(mVoice) });
  }
  await bot.telegram.sendMessage(ownerId, morningText, { parse_mode: 'HTML' });

  // 2. Send sample night voice note + summary
  const nVoice = await generateNightVoiceSummary();
  if (nVoice && fs.existsSync(nVoice)) {
    await bot.telegram.sendVoice(ownerId, { source: fs.createReadStream(nVoice) });
  }
  await bot.telegram.sendMessage(ownerId, nightText, { parse_mode: 'HTML' });

  console.log('✅ Both Morning Briefing & Night Summary delivered to Sir on Telegram successfully!');
}

main().catch(console.error);
