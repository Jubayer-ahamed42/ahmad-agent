import { Telegraf, Markup } from 'telegraf';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC, restartPC } from './systemController.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';

export function createTelegramBot(token, ownerId = null) {
  if (!token) {
    console.warn('Telegram Bot Token not provided. Skipping Telegram bot start.');
    return null;
  }

  const bot = new Telegraf(token);

  // Security middleware: verify owner if ownerId is configured
  bot.use((ctx, next) => {
    const fromId = ctx.from?.id?.toString();
    if (ownerId && fromId !== ownerId.toString()) {
      return ctx.reply('অননুমোদিত প্রবেশাধিকার। এই বটটি শুধুমাত্র এর মালিক (স্যার)-এর জন্য সংরক্ষিত।');
    }
    return next();
  });

  // /start command
  bot.command('start', (ctx) => {
    const welcome =
      `আসসালামু আলাইকুম স্যার!\n` +
      `আমি আপনার পার্সোনাল এক্সিকিউটিভ অ্যাসিস্ট্যান্ট (Agent 1)।\n\n` +
      `📱 আপনার টেলিগ্রাম আইডি: ${ctx.from.id}\n\n` +
      `🛠 *উপলব্ধ কমান্ডসমূহ:*\n` +
      `• /status - কম্পিউটারের সিপিইউ, মেমরি ও আপটাইম দেখা\n` +
      `• /screen - কম্পিউটারের বর্তমান স্ক্রিনশট দেখা\n` +
      `• /search <ফাইলের নাম> - কম্পিউটার থেকে ফাইল খোঁজা\n` +
      `• /sleep - কম্পিউটারকে স্লিপ মোডে পাঠানো\n` +
      `• /shutdown - কম্পিউটার শাটডাউন করা (২FA সহ)\n` +
      `• /briefing - সকাল ৬টার মর্নিং ব্রিফিং দেখা\n` +
      `• /summary - রাত ৯টার নাইট সামারি দেখা`;
    ctx.reply(welcome, { parse_mode: 'Markdown' });
  });

  // /status
  bot.command('status', (ctx) => {
    const s = getSystemStatus();
    const msg =
      `📊 *পিসি স্ট্যাটাস রিপোর্ট (স্যার):*\n\n` +
      `• ওএস: ${s.os}\n` +
      `• প্রসেসর: ${s.cpuModel} (${s.cpuCores} কোর)\n` +
      `• র‍্যাম ব্যবহার: ${s.usedMemory} / ${s.totalMemory}\n` +
      `• ফ্রি র‍্যাম: ${s.freeMemory}\n` +
      `• আপটাইম: ${s.uptime}\n` +
      `• ইউজার: ${s.username}`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  // /screen
  bot.command(['screen', 'screenshot'], async (ctx) => {
    try {
      await ctx.reply('স্ক্রিনশট নেওয়া হচ্ছে, স্যার। অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন...');
      const imgPath = await captureScreenshot();
      await ctx.replyWithPhoto({ source: imgPath }, { caption: 'স্যার, আপনার কম্পিউটারের বর্তমান স্ক্রিনশট।' });
    } catch (err) {
      ctx.reply(`স্ক্রিনশট নিতে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  // /search
  bot.command('search', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    parts.shift();
    const query = parts.join(' ').trim();
    if (!query) {
      return ctx.reply('স্যার, খোঁজার জন্য ফাইলের নাম উল্লেখ করুন। যেমন: /search report');
    }

    await ctx.reply(`"${query}" দিয়ে ফাইল খোঁজা হচ্ছে, স্যার...`);
    const results = await searchLocalFiles(query, 'C:\\');
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

  // /sleep
  bot.command('sleep', async (ctx) => {
    await ctx.reply('কম্পিউটারকে স্লিপ মোডে পাঠানো হচ্ছে, স্যার...');
    await sleepPC();
  });

  // /shutdown with 2FA
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

  // Handle shutdown buttons
  bot.action('confirm_shutdown', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('কম্পিউটার শাটডাউন করা হচ্ছে, স্যার। আল্লাহ হাফেজ!');
    await shutdownPC();
  });

  bot.action('cancel_shutdown', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('শাটডাউন কমান্ড বাতিল করা হয়েছে, স্যার। কম্পিউটার যথারীতি চলছে।');
  });

  // /briefing
  bot.command('briefing', (ctx) => {
    ctx.reply(generateMorningBriefingText(), { parse_mode: 'Markdown' });
  });

  // /summary
  bot.command('summary', (ctx) => {
    ctx.reply(generateNightSummaryText(), { parse_mode: 'Markdown' });
  });

  return bot;
}
