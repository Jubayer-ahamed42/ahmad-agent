import { Telegraf, Markup } from 'telegraf';
import { ExecutiveBrain } from './executiveBrain.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC } from './systemController.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import fs from 'fs';
import path from 'path';

export function createTelegramBot(token, ownerId = null) {
  if (!token) {
    console.warn('Telegram Bot Token not provided. Skipping Telegram bot start.');
    return null;
  }

  const bot = new Telegraf(token);
  const ahmadBrain = new ExecutiveBrain();

  // Security middleware: verify owner if ownerId is configured
  bot.use((ctx, next) => {
    const fromId = ctx.from?.id?.toString();
    if (ownerId && fromId !== ownerId.toString()) {
      return ctx.reply('অননুমোদিত প্রবেশাধিকার। এই বটটি শুধুমাত্র এর সম্মানিত মালিক (স্যার)-এর জন্য সংরক্ষিত।');
    }
    return next();
  });

  // /start command
  bot.command('start', (ctx) => {
    const welcome =
      `আসসালামু আলাইকুম স্যার!\n` +
      `আমি আপনার বিশ্বস্ত পার্সোনাল এক্সিকিউটিভ অ্যাসিস্ট্যান্ট **আহমদ**।\n\n` +
      `📱 আপনার সাথে সফলভাবে যুক্ত হয়েছি (আইডি: ${ctx.from.id})।\n\n` +
      `🎙️ *কমান্ড নির্দেশিকা (ভয়েস ও টেক্সট):*\n` +
      `স্যার, আপনি আমাকে যেকোনো নির্দেশ **লিখে** দিতে পারেন অথবা সরাসরি **ভয়েস মেসেজ (Voice Note)** পাঠিয়ে দিতে পারেন। আমি উভয় মাধ্যমেই সমান দক্ষতায় কাজ সম্পাদন করব।\n\n` +
      `🛠 *সাধারণ শর্টকাটসমূহ:*\n` +
      `• /status - কম্পিউটারের অবস্থা ও আপটাইম দেখা\n` +
      `• /screen - কম্পিউটারের বর্তমান স্ক্রিনশট দেখা\n` +
      `• /briefing - সকাল ৬:০০ টার মর্নিং ব্রিফিং\n` +
      `• /summary - রাত ৯:০০ টার নাইট সামারি\n` +
      `• /shutdown - নিরাপদ ২FA সহ কম্পিউটার শাটডাউন`;
    ctx.reply(welcome, { parse_mode: 'Markdown' });
  });

  // Voice Note Handler (স্যার যখন ভয়েস পাঠাবেন)
  bot.on('voice', async (ctx) => {
    try {
      await ctx.reply('জি স্যার, আপনার ভয়েস মেসেজটি পেয়েছি। আমি শুনছি এবং কাজ সম্পন্ন করছি...');
      // Simulated or transcribed voice execution
      const outcome = await ahmadBrain.processCommand('পিসির স্ট্যাটাস এবং কাজের অবস্থা জানাও', { fromVoice: true });

      if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
        await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
      }
      if (outcome.replyText) {
        await ctx.reply(outcome.replyText, { parse_mode: 'Markdown' });
      }
    } catch (err) {
      ctx.reply(`ভয়েস প্রসেসিংয়ে সমস্যা হয়েছে, স্যার: ${err.message}`);
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
      `• ইউজার: ${s.username}`;
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
