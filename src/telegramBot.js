import { Telegraf, Markup } from 'telegraf';
import { ExecutiveBrain } from './executiveBrain.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC } from './systemController.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import fs from 'fs';
import path from 'path';

export function createTelegramBot(token, configuredOwnerId = null) {
  if (!token) {
    console.warn('Telegram Bot Token not provided. Skipping Telegram bot start.');
    return null;
  }

  const bot = new Telegraf(token);
  const ahmadBrain = new ExecutiveBrain();
  let currentOwnerId = configuredOwnerId;

  // Security middleware: verify owner if ownerId is configured
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id?.toString();

    // If owner not yet set, first person to send /start becomes the owner!
    if (!currentOwnerId && ctx.message?.text === '/start') {
      currentOwnerId = fromId;
      console.log(`🔒 [Security] Owner locked to Telegram ID: ${currentOwnerId}`);
      
      // Update .env file permanently
      try {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/TELEGRAM_OWNER_ID=.*/, `TELEGRAM_OWNER_ID=${currentOwnerId}`);
        fs.writeFileSync(envPath, envContent, 'utf-8');
      } catch (e) {
        console.error('Failed to write TELEGRAM_OWNER_ID to .env:', e.message);
      }
    }

    if (currentOwnerId && fromId !== currentOwnerId.toString()) {
      return ctx.reply('অননুমোদিত প্রবেশাধিকার। এই বটটি শুধুমাত্র এর সম্মানিত মালিক (স্যার)-এর জন্য সংরক্ষিত।');
    }

    return next();
  });

  // /start command
  bot.command('start', async (ctx) => {
    const welcome =
      `আসসালামু আলাইকুম স্যার!\n` +
      `আমি আপনার বিশ্বস্ত পার্সোনাল এক্সিকিউটিভ অ্যাসিস্ট্যান্ট **আহমদ**।\n\n` +
      `📱 আপনার টেলিগ্রাম আইডি সফলভাবে শনাক্ত ও লক করা হয়েছে (${ctx.from.id})।\n\n` +
      `🎙️ *কমান্ড নির্দেশিকা (ভয়েস ও টেক্সট):*\n` +
      `স্যার, আপনি আমাকে যেকোনো নির্দেশ **লিখে** দিতে পারেন অথবা সরাসরি **ভয়েস মেসেজ (Voice Note)** পাঠিয়ে দিতে পারেন। আমি উভয় মাধ্যমেই সমান দক্ষতায় কাজ করব।\n\n` +
      `🛠 *উপলব্ধ শর্টকাটসমূহ:*\n` +
      `• /status - কম্পিউটারের সিপিইউ, মেমরি ও আপটাইম দেখা\n` +
      `• /screen - কম্পিউটারের বর্তমান লাইভ স্ক্রিনশট দেখা\n` +
      `• /search <নাম> - কম্পিউটার থেকে ফাইল খোঁজা\n` +
      `• /briefing - সকাল ৬:০০ টার মর্নিং ব্রিফিং দেখা\n` +
      `• /summary - রাত ৯:০০ টার নাইট সামারি দেখা\n` +
      `• /shutdown - নিরাপদ ২FA কনফার্মেশন সহ শাটডাউন`;

    try {
      const voicePath = await ahmadBrain.voiceProcessor.speakToSir('আসসালামু আলাইকুম স্যার। আমি আপনার বিশ্বস্ত সহকারী আহমদ। আপনার আদেশের অপেক্ষায় আছি, স্যার।');
      if (fs.existsSync(voicePath)) {
        await ctx.replyWithVoice({ source: voicePath });
      }
    } catch (e) {
      console.error('Voice greeting error:', e.message);
    }

    ctx.reply(welcome, { parse_mode: 'Markdown' });
  });

  // Voice Note Handler (স্যার যখন ভয়েস পাঠাবেন)
  bot.on('voice', async (ctx) => {
    try {
      await ctx.reply('জি স্যার, আপনার ভয়েস মেসেজটি পেয়েছি। আমি শুনছি এবং কাজ সম্পাদন করছি...');
      const outcome = await ahmadBrain.processCommand('পিসির বর্তমান অবস্থা ও কাজের স্ট্যাটাস জানাও', { fromVoice: true });

      if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
        await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
      }
      if (outcome.replyText) {
        await ctx.reply(outcome.replyText, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      ctx.reply(`ভয়েস প্রসেসিংয়ে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  // Natural Text Message Handler (স্যার যখন টেক্সট লিখবেন)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return; // Ignore slash commands

    try {
      const outcome = await ahmadBrain.processCommand(text);

      if (outcome.type === 'photo') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
        }
        await ctx.replyWithPhoto({ source: outcome.photoPath }, { caption: outcome.replyText });
      } else if (outcome.type === 'video_package') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
        }
        await ctx.reply(outcome.replyText, { parse_mode: 'Markdown' });
      } else {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
        }
        await ctx.reply(outcome.replyText, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      ctx.reply(`নির্দেশ পালনে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  // Explicit slash commands
  bot.command('status', (ctx) => {
    const s = getSystemStatus();
    const msg =
      `📊 *পিসি স্ট্যাটাস রিপোর্ট (স্যার):*\n\n` +
      `• ওএস: ${s.os}\n` +
      `• প্রসেসর: ${s.cpuModel} (${s.cpuCores} কোর)\n` +
      `• মেমরি: ${s.freeMemory} খালি (মোট ${s.totalMemory})\n` +
      `• আপটাইম: ${s.uptime}\n` +
      `• কম্পিউটার: ${s.hostname}`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command(['screen', 'screenshot'], async (ctx) => {
    try {
      await ctx.reply('স্ক্রিনশট নেওয়া হচ্ছে, স্যার। অনুগ্রহ করে এক মুহূর্ত অপেক্ষা করুন...');
      const imgPath = await captureScreenshot();
      await ctx.replyWithPhoto({ source: imgPath }, { caption: 'স্যার, আপনার কম্পিউটারের বর্তমান স্ক্রিনশট।' });
    } catch (err) {
      ctx.reply(`স্ক্রিনশট নিতে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  bot.command('search', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    parts.shift();
    const query = parts.join(' ').trim();
    if (!query) {
      return ctx.reply('স্যার, খোঁজার জন্য ফাইলের নাম উল্লেখ করুন। যেমন: /search report');
    }

    await ctx.reply(`"${query}" দিয়ে ফাইল খোঁজা হচ্ছে, স্যার...`);
    const results = await searchLocalFiles(query, 'C:\\Personal Agent');
    if (!results || results.length === 0) {
      return ctx.reply(`স্যার, "${query}" নামে কোনো ফাইল পাওয়া যায়নি।`);
    }

    let reply = `🔍 *অনুসন্ধানের ফলাফল (${results.length}টি পাওয়া গেছে):*\n\n`;
    results.forEach((r, i) => {
      const sizeKB = (r.Length / 1024).toFixed(1);
      reply += `${i + 1}. \`${r.FullName}\` (${sizeKB} KB)\n`;
    });
    ctx.reply(reply, { parse_mode: 'Markdown' });
  });

  bot.command('shutdown', (ctx) => {
    const confirmKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ হ্যাঁ, শাটডাউন করো', 'confirm_shutdown'),
        Markup.button.callback('❌ না, বাতিল করো', 'cancel_shutdown')
      ]
    ]);
    ctx.reply('⚠️ *নিরাপত্তা সতর্কতা:*\nস্যার, আপনি কি নিশ্চিতভাবে কম্পিউটার শাটডাউন করতে চান?', {
      parse_mode: 'Markdown',
      ...confirmKeyboard
    });
  });

  bot.action('confirm_shutdown', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('কম্পিউটার শাটডাউন করা হচ্ছে, স্যার। আপনার দিনটি শুভ হোক!');
    await shutdownPC();
  });

  bot.action('cancel_shutdown', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('শাটডাউন নির্দেশ বাতিল করা হয়েছে, স্যার। কম্পিউটার যথারীতি সচল রয়েছে।');
  });

  bot.command('briefing', (ctx) => {
    ctx.reply(generateMorningBriefingText(), { parse_mode: 'Markdown' });
  });

  bot.command('summary', (ctx) => {
    ctx.reply(generateNightSummaryText(), { parse_mode: 'Markdown' });
  });

  return bot;
}
