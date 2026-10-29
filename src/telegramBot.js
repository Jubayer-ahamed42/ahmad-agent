import { Telegraf, Markup } from 'telegraf';
import { ExecutiveBrain } from './executiveBrain.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC } from './systemController.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_RECEIVED_FILES_DIR = path.resolve(__dirname, '../received_files');

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Shared outcome sender ─────────────────────────────────────────────────
// Voice ও Text handler উভয়েই এই একটি ফাংশন ব্যবহার করে — duplicate code নেই।
async function sendOutcomeToSir(ctx, outcome) {
  if (!outcome) return;

  // Voice reply (যদি থাকে)
  if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
    try {
      await ctx.replyWithVoice({ source: fs.createReadStream(outcome.voiceAudioPath) });
    } catch (e) {
      console.error('[Telegram] replyWithVoice error:', e.message);
      try { await ctx.replyWithVoice({ source: outcome.voiceAudioPath }); } catch (e2) {}
    }
  }

  if (outcome.type === 'document') {
    await ctx.reply(outcome.replyText, { parse_mode: 'HTML' });
    const docCaption = `📖 <b>${escapeHtml(outcome.documentName)}</b>`;
    try {
      await ctx.replyWithDocument({
        source: fs.createReadStream(outcome.documentPath),
        filename: outcome.documentName
      }, {
        caption: docCaption,
        parse_mode: 'HTML'
      });
    } catch (docErr) {
      console.error('[Telegram] replyWithDocument fallback:', docErr.message);
      await ctx.telegram.sendDocument(ctx.chat.id, {
        source: fs.createReadStream(outcome.documentPath),
        filename: outcome.documentName
      }, {
        caption: docCaption,
        parse_mode: 'HTML'
      });
    }
  } else if (outcome.type === 'photo') {
    await ctx.replyWithPhoto({ source: outcome.photoPath }, { caption: outcome.replyText });
  } else if (outcome.type === 'video') {
    if (outcome.replyText) await ctx.reply(outcome.replyText, { parse_mode: 'HTML' });
    try {
      await ctx.replyWithVideo({ source: fs.createReadStream(outcome.videoPath) }, { caption: outcome.videoCaption || '🎬 আপনার ভিডিও, স্যার' });
    } catch (ve) {
      console.error('[Telegram] replyWithVideo fallback to document:', ve.message);
      await ctx.replyWithDocument({ source: fs.createReadStream(outcome.videoPath), filename: path.basename(outcome.videoPath) });
    }
  } else if (outcome.type === 'draft_action') {
    const actionKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ অনুমোদন ও সম্পন্ন করো', `approve_action:${outcome.actionId}`),
        Markup.button.callback('❌ বাতিল', `cancel_action:${outcome.actionId}`)
      ]
    ]);
    await ctx.reply(`${outcome.replyText}\n\n${outcome.previewText}`, {
      parse_mode: 'HTML',
      ...actionKeyboard
    });
  } else {
    // 'text' | 'video_package' | অন্য যেকোনো type
    try {
      await ctx.reply(outcome.replyText, { parse_mode: 'HTML', disable_web_page_preview: true });
    } catch (e) {
      await ctx.reply(outcome.replyText);
    }
  }
}
// ───────────────────────────────────────────────────────────────────────────

export function createTelegramBot(token, configuredOwnerId = null, whatsappService = null) {
  if (!token) {
    console.warn('Telegram Bot Token not provided. Skipping Telegram bot start.');
    return null;
  }

  const bot = new Telegraf(token);
  const ahmadBrain = new ExecutiveBrain();
  let currentOwnerId = configuredOwnerId;

  // Global error handler
  bot.catch((err, ctx) => {
    console.error(`[Telegraf Global Error for ${ctx.updateType}]:`, err);
    try {
      ctx.reply(`একটি ত্রুটি ঘটেছে, স্যার: ${err.message}`);
    } catch (e) {}
  });

  // Security middleware: verify owner if ownerId is configured
  bot.use(async (ctx, next) => {
    const fromId = ctx.from?.id?.toString();
    const text = ctx.message?.text || '';

    if (!currentOwnerId && text === '/start') {
      currentOwnerId = fromId;
      console.log(`🔒 [Security] Owner locked to Telegram ID: ${currentOwnerId}`);
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

  // ==========================================
  // EXPLICIT SLASH COMMANDS
  // ==========================================

  // /start command
  bot.command('start', async (ctx) => {
    console.log('[Telegram] Executing /start command for Sir');
    const welcome =
      `আসসালামু আলাইকুম স্যার!\n` +
      `আমি আপনার বিশ্বস্ত পার্সোনাল এক্সিকিউটিভ অ্যাসিস্ট্যান্ট <b>আহমদ</b>।\n\n` +
      `📱 আপনার টেলিগ্রাম আইডি সফলভাবে শনাক্ত ও লক করা হয়েছে (${ctx.from.id})।\n\n` +
      `🎙️ <b>কমান্ড নির্দেশিকা (ভয়েস ও টেক্সট):</b>\n` +
      `স্যার, আপনি আমাকে যেকোনো নির্দেশ <b>লিখে</b> দিতে পারেন অথবা সরাসরি <b>ভয়েস মেসেজ (Voice Note)</b> পাঠিয়ে দিতে পারেন। আমি উভয় মাধ্যমেই সমান দক্ষতায় কাজ করব।\n\n` +
      `🛠 <b>উপলব্ধ শর্টকাটসমূহ:</b>\n` +
      `• /status - কম্পিউটারের সিপিইউ, মেমরি ও আপটাইম দেখা\n` +
      `• /screen - কম্পিউটারের বর্তমান লাইভ স্ক্রিনশট দেখা\n` +
      `• /search &lt;নাম&gt; - কম্পিউটার থেকে ফাইল খোঁজা\n` +
      `• /briefing - সকাল ৬:০০ টার মর্নিং ব্রিফিং দেখা\n` +
      `• /summary - রাত ৯:০০ টার নাইট সামারি দেখা\n` +
      `• /whatsapp_qr - WhatsApp সংযোগ কিউআর কোড দেখা ও স্ক্যান করা\n` +
      `• /whatsapp_pair &lt;নম্বর&gt; - ক্যামেরা ছাড়া পেয়ারিং কোড দিয়ে সংযোগ\n` +
      `• /whatsapp_status - WhatsApp লাইভ স্ট্যাটাস ও ক্লায়েন্ট পরিসংখ্যান\n` +
      `• /whatsapp_reply &lt;on/off&gt; - স্বয়ংক্রিয় সচিব বার্তা নিয়ন্ত্রণ\n` +
      `• /whatsapp_exclude - পরিবার/ভিআইপি এক্সক্লুশন তালিকা\n` +
      `• /content_plan - সাপ্তাহিক সোশ্যাল মিডিয়া কন্টেন্ট প্ল্যান\n` +
      `• /desktop - ডেস্কটপ ফাইল অর্গানাইজেশন স্ট্যাটাস\n` +
      `• /shutdown - নিরাপদ ২FA কনফার্মেশন সহ শাটডাউন`;

    try {
      const voicePath = await ahmadBrain.voiceProcessor.speakToSir('আসসালামু আলাইকুম স্যার। আমি আপনার বিশ্বস্ত সহকারী আহমদ। আপনার আদেশের অপেক্ষায় আছি, স্যার।');
      if (fs.existsSync(voicePath)) {
        await ctx.replyWithVoice({ source: voicePath });
      }
    } catch (e) {
      console.error('Voice greeting error:', e.message);
    }

    await ctx.reply(welcome, { parse_mode: 'HTML' });
  });

  // /status
  bot.command('status', async (ctx) => {
    console.log('[Telegram] Executing /status command for Sir');
    const s = getSystemStatus();
    const msg =
      `📊 <b>পিসি স্ট্যাটাস রিপোর্ট (স্যার):</b>\n\n` +
      `• ওএস: ${escapeHtml(s.os)}\n` +
      `• প্রসেসর: ${escapeHtml(s.cpuModel)} (${escapeHtml(s.cpuCores)} কোর)\n` +
      `• মেমরি: ${escapeHtml(s.freeMemory)} খালি (মোট ${escapeHtml(s.totalMemory)})\n` +
      `• র‍্যাম ব্যবহৃত: ${escapeHtml(s.usedMemory)}\n` +
      `• আপটাইম: ${escapeHtml(s.uptime)}\n` +
      `• কম্পিউটার: ${escapeHtml(s.hostname)}\n` +
      `• ইউজার: ${escapeHtml(s.username)}`;
    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  // /screen or /screenshot
  bot.command(['screen', 'screenshot'], async (ctx) => {
    console.log('[Telegram] Executing /screen command for Sir');
    try {
      await ctx.reply('স্ক্রিনশট নেওয়া হচ্ছে, স্যার। এক মুহূর্ত অপেক্ষা করুন...');
      const imgPath = await captureScreenshot();
      console.log(`[Telegram] Sending screenshot from: ${imgPath}`);
      await ctx.replyWithPhoto({ source: imgPath }, { caption: 'স্যার, আপনার কম্পিউটারের বর্তমান লাইভ স্ক্রিনশট।' });
      console.log('[Telegram] Screenshot sent successfully to Sir!');
    } catch (err) {
      console.error('[Telegram] Screenshot error:', err);
      await ctx.reply(`স্ক্রিনশট নিতে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  // /search
  bot.command('search', async (ctx) => {
    console.log('[Telegram] Executing /search command for Sir');
    const parts = ctx.message.text.split(' ');
    parts.shift();
    const query = parts.join(' ').trim();
    if (!query) {
      return ctx.reply('স্যার, খোঁজার জন্য ফাইলের নাম উল্লেখ করুন। যেমন: /search lethe বা /search ভাইরাস');
    }

    await ctx.reply(`"${query}" দিয়ে গুগল ড্রাইভ ও লোকাল পিসিতে অনুসন্ধান চালানো হচ্ছে, স্যার...`);
    const results = await searchLocalFiles(query);
    if (!results || results.length === 0) {
      return ctx.reply(`স্যার, "${query}" সংক্রান্ত কোনো ফাইল গুগল ড্রাইভ বা পিসিতে পাওয়া যায়নি।`);
    }

    let reply = `🔍 <b>অনুসন্ধানের ফলাফল (${results.length}টি পাওয়া গেছে):</b>\n\n`;
    results.forEach((r, i) => {
      const sizeKB = (r.Length / 1024).toFixed(1);
      reply += `${i + 1}. 📄 <b>${escapeHtml(r.Name)}</b> (${sizeKB} KB)\n   <code>${escapeHtml(r.FullName)}</code>\n\n`;
    });
    reply += `স্যার, কোনো ফাইল সরাসরি টেলিগ্রামে পেতে চাইলে বলুন: "[ফাইলের নাম] পাঠিয়ে দাও"।`;
    await ctx.reply(reply, { parse_mode: 'HTML' });
  });

  // /shutdown with 2FA
  bot.command('shutdown', async (ctx) => {
    console.log('[Telegram] Executing /shutdown prompt for Sir');
    const confirmKeyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ হ্যাঁ, শাটডাউন করো', 'confirm_shutdown'),
        Markup.button.callback('❌ না, বাতিল করো', 'cancel_shutdown')
      ]
    ]);
    await ctx.reply('⚠️ <b>নিরাপত্তা সতর্কতা:</b>\nস্যার, আপনি কি নিশ্চিতভাবে কম্পিউটার শাটডাউন করতে চান?', {
      parse_mode: 'HTML',
      ...confirmKeyboard
    });
  });

  bot.action('confirm_shutdown', async (ctx) => {
    console.log('[Telegram] Sir confirmed shutdown!');
    await ctx.answerCbQuery();
    await ctx.editMessageText('কম্পিউটার শাটডাউন করা হচ্ছে, স্যার। আপনার দিনটি শুভ হোক!');
    await shutdownPC();
  });

  bot.action('cancel_shutdown', async (ctx) => {
    console.log('[Telegram] Sir cancelled shutdown.');
    await ctx.answerCbQuery();
    await ctx.editMessageText('শাটডাউন নির্দেশ বাতিল করা হয়েছে, স্যার। কম্পিউটার যথারীতি সচল রয়েছে।');
  });

  // Dynamic 1-Click Skill Action Approvals (Selective Gating)
  bot.action(/^approve_action:(.+)$/, async (ctx) => {
    const actionId = ctx.match[1];
    console.log(`[Telegram] Sir clicked approve for action: ${actionId}`);
    try {
      await ctx.answerCbQuery('অনুমোদিত! কাজ শুরু হচ্ছে...');
      await ctx.editMessageText('⏳ <b>কাজটি সম্পন্ন করা হচ্ছে, স্যার...</b>', { parse_mode: 'HTML' });
      const result = await ahmadBrain.skillManager.executePendingAction(actionId);
      if (result.success) {
        await ctx.editMessageText(`✅ <b>সফলভাবে সম্পন্ন হয়েছে, স্যার!</b>\n\n${result.message}`, { parse_mode: 'HTML' });
      } else {
        await ctx.editMessageText(`⚠️ <b>সমস্যা হয়েছে, স্যার:</b> ${result.error}`, { parse_mode: 'HTML' });
      }
    } catch (err) {
      console.error('[Telegram] Error executing approved action:', err);
      try {
        await ctx.reply(`কাজে ত্রুটি হয়েছে, স্যার: ${err.message}`);
      } catch (e) {}
    }
  });

  bot.action(/^cancel_action:(.+)$/, async (ctx) => {
    const actionId = ctx.match[1];
    console.log(`[Telegram] Sir clicked cancel for action: ${actionId}`);
    ahmadBrain.skillManager.cancelPendingAction(actionId);
    try {
      await ctx.answerCbQuery('বাতিল করা হয়েছে');
      await ctx.editMessageText('❌ <b>অনুরোধটি বাতিল করা হয়েছে, স্যার।</b> কোনো পরিবর্তন করা হয়নি।', { parse_mode: 'HTML' });
    } catch (err) {
      console.error('[Telegram] Error canceling action:', err);
    }
  });

  // /briefing
  bot.command('briefing', async (ctx) => {
    console.log('[Telegram] Executing /briefing command for Sir');
    try {
      const text = await generateMorningBriefingText();
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`⚠️ ব্রিফিং তৈরিতে ত্রুটি: ${e.message}`);
    }
  });

  // /summary
  bot.command('summary', async (ctx) => {
    console.log('[Telegram] Executing /summary command for Sir');
    try {
      const waStats = whatsappService ? whatsappService.getStatus() : null;
      const text = await generateNightSummaryText({ whatsappStats: waStats });
      await ctx.reply(text, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`⚠️ সামারি তৈরিতে ত্রুটি: ${e.message}`);
    }
  });

  // /whatsapp_qr
  bot.command('whatsapp_qr', async (ctx) => {
    console.log('[Telegram] Executing /whatsapp_qr for Sir');
    if (!whatsappService) {
      return ctx.reply('স্যার, WhatsApp সার্ভিস বর্তমানে সংযুক্ত বা সক্রিয় নেই।');
    }

    const st = whatsappService.getStatus();
    if (st.status === 'connected') {
      return ctx.reply('✅ <b>WhatsApp ইতিমধ্যেই সফলভাবে সংযুক্ত রয়েছে!</b>\nস্যার, আপনার নতুন কোনো কিউআর কোড স্ক্যান করার প্রয়োজন নেই। ক্লায়েন্ট বার্তা এলে আমি তাৎক্ষণিক আপনাকে অবহিত করব।', { parse_mode: 'HTML' });
    }

    const qrPath = whatsappService.getQrImagePath();
    if (qrPath && fs.existsSync(qrPath)) {
      try {
        await ctx.replyWithPhoto(
          { source: qrPath },
          {
            caption:
              `📱 <b>WhatsApp সংযোগ কিউআর কোড</b>\n\n` +
              `সম্মানিত স্যার, অনুগ্রহ করে আপনার ফোনের WhatsApp থেকে:\n` +
              `১. <b>Settings</b> অথবা ৩-ডট মেনুতে চাপ দিন\n` +
              `২. <b>Linked Devices (সংযুক্ত ডিভাইস)</b> সিলেক্ট করুন\n` +
              `৩. <b>Link a Device</b> দিয়ে এই কিউআর কোডটি স্ক্যান করে নিন।\n\n` +
              `স্ক্যান হওয়ামাত্রই আহমদ স্বয়ংক্রিয়ভাবে WhatsApp এ আপনার সহকারী হিসেবে দায়িত্ব গ্রহণ করবে, স্যার।`,
            parse_mode: 'HTML'
          }
        );
      } catch (err) {
        console.error('[Telegram] Error sending QR photo:', err.message);
        await ctx.reply(`কিউআর কোড পাঠাতে সমস্যা হয়েছে, স্যার: ${err.message}`);
      }
    } else {
      await ctx.reply('স্যার, WhatsApp কিউআর কোড প্রস্তুত হচ্ছে। অনুগ্রহ করে ৫-১০ সেকেন্ড পর পুনরায় /whatsapp_qr পাঠান।');
    }
  });

  // /whatsapp_pair [number]
  bot.command(['whatsapp_pair', 'pair'], async (ctx) => {
    console.log('[Telegram] Executing /whatsapp_pair for Sir');
    if (!whatsappService) {
      return ctx.reply('WhatsApp সার্ভিস সক্রিয় নেই, স্যার।');
    }

    const st = whatsappService.getStatus();
    if (st.status === 'connected') {
      return ctx.reply('✅ <b>WhatsApp ইতিমধ্যেই সফলভাবে সংযুক্ত রয়েছে!</b>\nনতুন করে কোড নেওয়ার প্রয়োজন নেই, স্যার।', { parse_mode: 'HTML' });
    }

    const parts = ctx.message.text.split(' ');
    parts.shift();
    let num = parts.join('').trim().replace(/\D/g, '');

    if (!num) {
      return ctx.reply(
        `📱 <b>WhatsApp পেয়ারিং কোড (ক্যামেরা ছাড়া সংযোগ):</b>\n\n` +
        `স্যার, ক্যামেরা দিয়ে কিউআর স্ক্যান করতে সমস্যা হলে আপনি <b>৮ সংখ্যার পেয়ারিং কোড</b> দিয়ে তাৎক্ষণিক WhatsApp যুক্ত করতে পারেন।\n\n` +
        `দয়া করে আপনার নম্বর লিখে কমান্ড পাঠান:\n` +
        `<code>/whatsapp_pair 017xxxxxxxx</code>\n` +
        `অথবা:\n` +
        `<code>/whatsapp_pair 88017xxxxxxxx</code>`,
        { parse_mode: 'HTML' }
      );
    }

    if (!num.startsWith('880') && num.startsWith('01')) {
      num = '88' + num;
    }

    await ctx.reply(`🔄 <b>+${num}</b> নম্বরের জন্য পেয়ারিং কোড তৈরি করা হচ্ছে, স্যার...`);
    try {
      const code = await whatsappService.requestPairingCode(num);
      const msg =
        `🔑 <b>আপনার WhatsApp পেয়ারিং কোড:</b>\n\n` +
        `👉 <code>${code}</code> 👈\n\n` +
        `📲 <b>ফোনে যেভাবে দিবেন:</b>\n` +
        `১. WhatsApp > <b>Linked Devices (সংযুক্ত ডিভাইস)</b>-এ যান\n` +
        `২. <b>Link a Device</b> চাপুন\n` +
        `৩. নিচে <b>"Link with phone number instead"</b> এ ট্যাপ করুন\n` +
        `৪. স্ক্রিনে কোড চাইলে উপরের <code>${code}</code> কোডটি টাইপ করুন।\n\n` +
        `কোডটি দেওয়া মাত্রই কোনো ক্যামেরা স্ক্যান ছাড়া তৎক্ষণাৎ আহমদ যুক্ত হয়ে যাবে, স্যার!`;
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('[Telegram] Pairing code error:', err.message);
      await ctx.reply(`পেয়ারিং কোড তৈরিতে সমস্যা হয়েছে, স্যার: ${err.message}\nকয়েক সেকেন্ড পর পুনরায় চেষ্টা করুন।`);
    }
  });

  // /whatsapp_status
  bot.command('whatsapp_status', async (ctx) => {
    console.log('[Telegram] Executing /whatsapp_status for Sir');
    if (!whatsappService) {
      return ctx.reply('স্যার, WhatsApp সার্ভিস কনফিগার করা হয়নি।');
    }

    const s = whatsappService.getStatus();
    const statusLabel =
      s.status === 'connected' ? '✅ সংযুক্ত (Online)' :
      s.status === 'qr_ready' ? '📱 কিউআর স্ক্যানের অপেক্ষায়' :
      s.status === 'connecting' ? '🔄 সংযোগ স্থাপন চলছে...' : '❌ বিচ্ছিন্ন (Offline)';

    const msg =
      `📱 <b>WhatsApp এক্সিকিউটিভ স্ট্যাটাস (স্যার):</b>\n\n` +
      `• সংযোগ অবস্থা: <b>${statusLabel}</b>\n` +
      `• স্বয়ংক্রিয় সচিব বার্তা: ${s.autoReplyEnabled ? '✅ সক্রিয় (ON)' : '⏸️ বন্ধ (OFF)'}\n` +
      `• ক্লায়েন্ট কুলডাউন: <b>${s.cooldownHours} ঘণ্টা</b>\n` +
      `• স্যার অ্যাক্টিভিটি সুরক্ষা: <b>${s.sirInactivityCooldownHours} ঘণ্টা</b>\n` +
      `• আজ প্রাপ্ত বার্তা: ${s.receivedToday}টি\n` +
      `• আজ প্রেরিত সচিব জবাব: ${s.repliedToday}টি\n` +
      `• ট্র্যাকিংকৃত মোট ক্লায়েন্ট: ${s.totalContactsTracked} জন\n` +
      `• এক্সক্লুশন তালিকা (পরিবার/ভিআইপি): ${s.excludedCount}টি নম্বর\n\n` +
      `<i>নিয়ন্ত্রণ শর্টকাট:</i>\n` +
      `• /whatsapp_qr - কিউআর কোড দেখতে\n` +
      `• /whatsapp_reply on অথবা off - অটো-রেসপন্ডার নিয়ন্ত্রণ করতে\n` +
      `• /whatsapp_exclude - নম্বর তালিকা নিয়ন্ত্রণ করতে`;

    await ctx.reply(msg, { parse_mode: 'HTML' });
  });

  // /whatsapp_reply <on|off>
  bot.command('whatsapp_reply', async (ctx) => {
    if (!whatsappService) return ctx.reply('WhatsApp সার্ভিস সক্রিয় নেই, স্যার।');
    const parts = ctx.message.text.split(' ');
    const mode = (parts[1] || '').toLowerCase().trim();

    if (mode === 'on') {
      whatsappService.setAutoReply(true);
      await ctx.reply('✅ <b>WhatsApp স্বয়ংক্রিয় সচিব বার্তা সক্রিয় করা হয়েছে, স্যার।</b>\nনতুন ক্লায়েন্ট মেসেজ দিলে আহমদ সম্মানজনক জবাব দেবে।', { parse_mode: 'HTML' });
    } else if (mode === 'off') {
      whatsappService.setAutoReply(false);
      await ctx.reply('⏸️ <b>WhatsApp স্বয়ংক্রিয় সচিব বার্তা বন্ধ (Pause) করা হয়েছে, স্যার।</b>\nক্লায়েন্টদের কোনো অটো-রিপ্লাই পাঠানো হবে না, তবে আপনি যথারীতি টেলিগ্রামে তাৎক্ষণিক নোটিফিকেশন পাবেন।', { parse_mode: 'HTML' });
    } else {
      const current = whatsappService.getStatus().autoReplyEnabled;
      await ctx.reply(`স্যার, বর্তমান অবস্থা: <b>${current ? 'চালু (ON)' : 'বন্ধ (OFF)'}</b>।\nপরিবর্তন করতে লিখুন: <code>/whatsapp_reply on</code> অথবা <code>/whatsapp_reply off</code>`, { parse_mode: 'HTML' });
    }
  });

  // /whatsapp_exclude <add|remove|list> [number]
  bot.command('whatsapp_exclude', async (ctx) => {
    if (!whatsappService) return ctx.reply('WhatsApp সার্ভিস সক্রিয় নেই, স্যার।');
    const parts = ctx.message.text.split(' ');
    const action = (parts[1] || '').toLowerCase().trim();
    const num = (parts[2] || '').trim();

    if (action === 'add' && num) {
      whatsappService.addExcludedNumber(num);
      await ctx.reply(`🛡️ <b>নম্বরটি এক্সক্লুশন তালিকায় সফলভাবে যুক্ত হয়েছে:</b> <code>${escapeHtml(num)}</code>\nএই নম্বরে আহমদ কখনো কোনো স্বয়ংক্রিয় সচিব বার্তা দেবে না, স্যার।`, { parse_mode: 'HTML' });
    } else if (action === 'remove' && num) {
      const removed = whatsappService.removeExcludedNumber(num);
      if (removed) {
        await ctx.reply(`নম্বরটি এক্সক্লুশন তালিকা থেকে অপসারিত হয়েছে: <code>${escapeHtml(num)}</code>, স্যার।`, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(`নম্বরটি তালিকায় পাওয়া যায়নি, স্যার।`);
      }
    } else {
      const list = whatsappService.getExcludedNumbers();
      if (list.length === 0) {
        await ctx.reply('📋 <b>এক্সক্লুশন তালিকা (পরিবার/ভিআইপি):</b>\nবর্তমানে কোনো নম্বর যুক্ত নেই, স্যার।\n\nযুক্ত করতে লিখুন: <code>/whatsapp_exclude add 88017xxxxxxxx</code>', { parse_mode: 'HTML' });
      } else {
        const formatted = list.map((n, i) => `${i + 1}. <code>+${escapeHtml(n)}</code>`).join('\n');
        await ctx.reply(`📋 <b>এক্সক্লুশন তালিকা (${list.length}টি সংরক্ষিত):</b>\n\n${formatted}\n\nবাদ দিতে: <code>/whatsapp_exclude remove <number></code>`, { parse_mode: 'HTML' });
      }
    }
  });

  // /fb_status
  bot.command('fb_status', async (ctx) => {
    console.log('[Telegram] Executing /fb_status for Sir');
    const status = await ahmadBrain.subagents.delegateFacebookStatus();
    if (!status.success) {
      return ctx.reply(
        `⚠️ <b>ফেসবুক পেজ এখনো সম্পূর্ণ সংযুক্ত করা হয়নি, স্যার।</b>\n\n` +
        `বিবরণ: <i>${escapeHtml(status.error)}</i>\n\n` +
        `কানেক্ট করতে আপনার <b>Page ID</b> এবং <b>Page Access Token</b> প্রয়োজন।`,
        { parse_mode: 'HTML' }
      );
    }

    const msg =
      `📢 <b>ফেসবুক পেজ এক্সিকিউটিভ স্ট্যাটাস (স্যার):</b>\n\n` +
      `• পেজের নাম: <b>${escapeHtml(status.name)}</b>\n` +
      `• মোট ফলোয়ার: <b>${status.followers} জন</b>\n` +
      `• পেজ লিংক: <a href="${status.link}">লিংক দেখুন</a>\n` +
      `• স্ট্যাটাস: 🟢 <b>সংযুক্ত ও সম্পূর্ণ সক্রিয় (Meta Graph API)</b>\n\n` +
      `<i>কমান্ডসমূহ:</i>\n` +
      `• <code>/fb_post &lt;টেক্সট&gt;</code> - পেজে পোস্ট দিতে\n` +
      `• <code>/fb_recent</code> - সাম্প্রতিক পোস্ট দেখতে`;

    await ctx.reply(msg, { parse_mode: 'HTML', disable_web_page_preview: true });
  });

  // /fb_post <text>
  bot.command('fb_post', async (ctx) => {
    console.log('[Telegram] Executing /fb_post for Sir');
    const parts = ctx.message.text.split(' ');
    parts.shift();
    const postText = parts.join(' ').trim();

    if (!postText) {
      return ctx.reply(
        `✍️ <b>ফেসবুক পেজে পোস্ট করার নিয়ম:</b>\n\n` +
        `কমান্ডের পর আপনার কাঙ্ক্ষিত পোস্টের লেখাটি লিখুন, স্যার:\n` +
        `<code>/fb_post আসসালামু আলাইকুম! আমাদের নতুন অফার...</code>`,
        { parse_mode: 'HTML' }
      );
    }

    await ctx.reply('⏳ ফেসবুক পেজে পোস্ট পাবলিশ করা হচ্ছে, স্যার...');
    const res = await ahmadBrain.subagents.delegateFacebookPost(postText);
    if (res.success) {
      if (res.viaBrowser) {
        await ctx.reply(
          `✅ <b>পোস্ট প্রস্তুত ও পেজ কম্পোজার ওপেন হয়েছে, স্যার!</b>\n\n` +
          `📋 <b>ক্লিপবোর্ডে কপি সম্পন্ন:</b> সম্পূর্ণ পোস্টটি আপনার পিসির ক্লিপবোর্ডে কপি করা আছে।\n` +
          `🌐 <b>ব্রাউজারে পেজ ওপেন:</b> গুগল ক্রোমে আপনার ফেসবুক পেজের পোস্ট কম্পোজার সরাসরি খুলে দেওয়া হয়েছে।\n\n` +
          `👉 পেজে গিয়ে শুধু <b>Ctrl+V</b> দিয়ে <b>Publish</b> বাটনে চাপ দিন, স্যার!`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply(
          `✅ <b>ফেসবুক পেজে সফলভাবে পোস্ট পাবলিশ হয়েছে, স্যার!</b>\n\n` +
          `🔗 <b>পোস্ট লিংক:</b> <a href="${res.postUrl}">এখানে দেখুন</a>`,
          { parse_mode: 'HTML' }
        );
      }
    } else {
      await ctx.reply(`❌ পোস্ট প্রস্তুত করতে সমস্যা হয়েছে, স্যার: ${escapeHtml(res.error)}`);
    }
  });

  // /content_plan
  bot.command(['content_plan', 'content_calendar'], async (ctx) => {
    console.log('[Telegram] Executing /content_plan for Sir');
    try {
      const { ContentScheduler } = await import('../subagents/socialMediaManager/contentScheduler.js');
      const cs = new ContentScheduler();
      const summary = cs.getPlanSummary();
      let msg = `📅 <b>সাপ্তাহিক সোশ্যাল মিডিয়া কন্টেন্ট প্ল্যান (Be Smart With AI):</b>\n\n`;
      summary.forEach(s => {
        const statusIcon = s.status === 'published' ? '✅' : '📝';
        msg += `${statusIcon} <b>Day ${s.id} (${s.day}):</b> ${escapeHtml(s.title)}\n   <i>ফোকাস: ${escapeHtml(s.topic)}</i>\n\n`;
      });
      msg += `💡 <i>যেকোনো দিনের পোস্ট দেখতে লিখুন:</i> <code>/post_preview 1</code>`;
      await ctx.reply(msg, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`কন্টেন্ট প্ল্যান লোড করতে ত্রুটি: ${e.message}`);
    }
  });

  // /post_preview <day>
  bot.command(['post_preview', 'preview_day'], async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const day = parts[1] || '1';
    try {
      const { ContentScheduler } = await import('../subagents/socialMediaManager/contentScheduler.js');
      const cs = new ContentScheduler();
      const postData = cs.getPostForDay(day);
      if (!postData) return ctx.reply(`Day ${day} এর কোনো পোস্ট খুঁজে পাওয়া যায়নি, স্যার।`);
      await ctx.reply(`📄 <b>Day ${day} (${postData.item.day}) পোস্ট প্রিভিউ:</b>\n\n${escapeHtml(postData.formattedText)}`, { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`পোস্ট দেখতে ত্রুটি: ${e.message}`);
    }
  });

  // /desktop
  bot.command('desktop', async (ctx) => {
    console.log('[Telegram] Executing /desktop scan for Sir');
    try {
      const { DesktopOrganizer } = await import('./desktopOrganizer.js');
      const org = new DesktopOrganizer();
      await ctx.reply(org.getSummaryReport(), { parse_mode: 'HTML' });
    } catch (e) {
      await ctx.reply(`ডেস্কটপ তথ্য দেখতে ত্রুটি: ${e.message}`);
    }
  });

  // /fb_recent
  bot.command('fb_recent', async (ctx) => {
    console.log('[Telegram] Executing /fb_recent for Sir');
    const res = await ahmadBrain.subagents.delegateFacebookRecentPosts(3);
    if (!res.success) {
      return ctx.reply(`⚠️ ফেসবুক পোস্ট দেখতে সমস্যা হয়েছে: ${escapeHtml(res.error)}`);
    }

    if (!res.posts || res.posts.length === 0) {
      return ctx.reply('পেজে সম্প্রতি কোনো পোস্ট পাওয়া যায়নি, স্যার।');
    }

    let msg = `📋 <b>সাম্প্রতিক ৩টি ফেসবুক পোস্ট:</b>\n\n`;
    res.posts.forEach((p, i) => {
      const snippet = p.message.length > 60 ? p.message.substring(0, 60) + '...' : p.message;
      msg += `${i + 1}. <b>"${escapeHtml(snippet)}"</b>\n`;
      msg += `   👍 লাইক: ${p.likeCount} | 💬 কমেন্ট: ${p.commentCount}\n`;
      msg += `   🔗 <a href="${p.url}">পোস্টটি দেখুন</a>\n\n`;
    });

    await ctx.reply(msg, { parse_mode: 'HTML', disable_web_page_preview: true });
  });

  // /did_key <API_KEY>
  bot.command('did_key', async (ctx) => {
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      return ctx.reply('⚠️ ব্যবহারবিধি: /did_key <আপনার_D-ID_API_Key>\n\nউদাহরণ: /did_key c29tZWVtYWlsQGdtYWlsLmNvbQ:xxxx');
    }
    const key = parts.slice(1).join(' ').trim();
    process.env.DID_API_KEY = key;

    try {
      const envPath = path.join(process.cwd(), '.env');
      let envContent = fs.readFileSync(envPath, 'utf-8');
      if (envContent.includes('DID_API_KEY=')) {
        envContent = envContent.replace(/DID_API_KEY=.*/, `DID_API_KEY=${key}`);
      } else {
        envContent += `\nDID_API_KEY=${key}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
      await ctx.reply('✅ D-ID API Key সফলভাবে সেভ ও কনফিগার করা হয়েছে, স্যার!\n\nএখন জীবন্ত কথা বলা ভিডিও তৈরি করতে /make_avatar কমান্ড দিন।');
    } catch (e) {
      await ctx.reply(`⚠️ .env ফাইলে কি সেভ করতে সমস্যা হয়েছে: ${e.message}`);
    }
  });

  // /make_avatar
  bot.command(['make_avatar', 'avatar'], async (ctx) => {
    const key = process.env.DID_API_KEY;
    if (!key) {
      return ctx.reply('⚠️ D-ID API Key কনফিগার করা নেই, স্যার।\nঅনুগ্রহ করে প্রথমে /did_key <API_KEY> দিয়ে কি সেভ করুন অথবা চ্যাটে আমাকে কি-টি দিন।');
    }

    const imgPath = path.join(process.cwd(), 'subagents/socialMediaManager/output/sir_portrait_crop.jpg');
    const audioPath = path.join(process.cwd(), 'subagents/socialMediaManager/output/voice_ai_pros_cons.mp3');
    const outVideoPath = path.join(process.cwd(), 'subagents/socialMediaManager/output/sir_talking_avatar_1min.mp4');

    if (!fs.existsSync(imgPath) || !fs.existsSync(audioPath)) {
      return ctx.reply('⚠️ প্রয়োজনীয় ছবি বা অডিও ফাইল পাওয়া যায়নি, স্যার।');
    }

    await ctx.reply('⏳ স্যার, ক্লাউড এআই দিয়ে আপনার মুখ, চোখ ও ঠোঁট নাড়ানো জীবন্ত অবতার ভিডিও রেন্ডার করা শুরু হয়েছে। এটি সাধারণত ১ থেকে ২ মিনিট সময় নেয়, অনুগ্রহ করে অপেক্ষা করুন...');

    try {
      const res = await ahmadBrain.subagents.delegateTalkingAvatarProduction({
        imagePath: imgPath,
        audioPath: audioPath,
        outputVideoPath: outVideoPath
      });

      if (!res.success) {
        return ctx.reply(`⚠️ অবতার তৈরিতে সমস্যা হয়েছে: ${escapeHtml(res.error)}`);
      }

      await ctx.reply('🎬 <b>স্যার, আপনার জীবন্ত এআই টকিং অবতার ভিডিও সম্পূর্ণ প্রস্তুত!</b>', { parse_mode: 'HTML' });
      await ctx.replyWithVideo({ source: fs.createReadStream(res.videoPath) }, {
        caption: '✨ Be Smart With AI - এআই ব্যবহারের সুবিধা ও অসুবিধা (Talking Avatar)'
      });
    } catch (err) {
      await ctx.reply(`⚠️ ত্রুটি ঘটেছে: ${err.message}`);
    }
  });

  // Voice Note & Spoken Audio Handler (Gemini Multimodal Neural STT)
  bot.on(['voice', 'audio'], async (ctx) => {
    console.log('[Telegram] Received voice/audio message from Sir. Transcribing with Gemini Neural Engine...');
    try {
      const fileId = ctx.message.voice?.file_id || ctx.message.audio?.file_id;
      if (!fileId) return;

      const fileLink = await ctx.telegram.getFileLink(fileId);

      // 1. Download raw Telegram voice note to temp file in audio_cache
      const tempId = Date.now();
      const rawAudioPath = path.join(ahmadBrain.voiceProcessor.audioDir, `voice_in_${tempId}.oga`);
      const audioRes = await fetch(fileLink.href);
      const rawBuffer = Buffer.from(await audioRes.arrayBuffer());
      fs.writeFileSync(rawAudioPath, rawBuffer);

      // 2. Convert to standard 24kHz mono MP3 via FFmpeg for universal Gemini audio decoding
      let audioPathToTranscribe = rawAudioPath;
      let mimeType = 'audio/ogg';

      try {
        const convertedMp3Path = await ahmadBrain.voiceProcessor.convertAudio(rawAudioPath, 'mp3');
        if (fs.existsSync(convertedMp3Path)) {
          audioPathToTranscribe = convertedMp3Path;
          mimeType = 'audio/mp3';
        }
      } catch (convErr) {
        console.warn('[Telegram Voice] FFmpeg conversion notice, using raw buffer:', convErr.message);
      }

      // 3. Transcribe speech in Bengali using Gemini
      const fileBuffer = fs.readFileSync(audioPathToTranscribe);
      const transcribedText = await ahmadBrain.transcribeAudio(fileBuffer, mimeType);

      // Clean up temporary files
      try { if (fs.existsSync(rawAudioPath)) fs.unlinkSync(rawAudioPath); } catch (e) {}
      if (audioPathToTranscribe !== rawAudioPath) {
        try { if (fs.existsSync(audioPathToTranscribe)) fs.unlinkSync(audioPathToTranscribe); } catch (e) {}
      }

      if (!transcribedText) {
        return ctx.reply('স্যার, আপনার ভয়েস অডিওটি স্পষ্টভাবে বুঝতে পারিনি। অনুগ্রহ করে আরেকবার কথা বলে পাঠানোর বিনীত অনুরোধ করছি, স্যার।');
      }

      await ctx.reply(`🎙️ <b>আপনার কণ্ঠের নির্দেশ:</b>\n<i>"${escapeHtml(transcribedText)}"</i>\n\nজি স্যার, আদেশটি পেয়েছি। এখনই সম্পন্ন করছি...`, { parse_mode: 'HTML' });

      // 4. Execute transcribed command through executive brain
      const outcome = await ahmadBrain.processCommand(transcribedText, { fromVoice: true });
      await sendOutcomeToSir(ctx, outcome);

    } catch (err) {
      console.error('[Telegram] Voice processing error:', err);
      await ctx.reply(`ভয়েস নির্দেশ পালনে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  // Handle incoming documents from Sir (Save to PC)
  bot.on('document', async (ctx) => {
    try {
      const doc = ctx.message.document;
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const targetDir = process.env.RECEIVED_FILES_DIR || DEFAULT_RECEIVED_FILES_DIR;
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const safeName = doc.file_name || `doc_${Date.now()}.bin`;
      const targetPath = path.join(targetDir, safeName);

      const res = await fetch(fileLink.href);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);

      await ctx.reply(`📥 <b>ফাইল গ্রহণ ও সংরক্ষণ সম্পন্ন, স্যার!</b>\n\n📄 নাম: <code>${escapeHtml(safeName)}</code>\n💾 লোকেশন: <code>${escapeHtml(targetPath)}</code>\n\nফাইলটি আপনার কম্পিউটারে নিরাপদে সংরক্ষিত রয়েছে।`, { parse_mode: 'HTML' });
    } catch (e) {
      ctx.reply(`ফাইল সংরক্ষণে সমস্যা হয়েছে, স্যার: ${e.message}`);
    }
  });

  // Handle incoming photos from Sir (Save to PC)
  bot.on('photo', async (ctx) => {
    try {
      const photos = ctx.message.photo;
      const highestRes = photos[photos.length - 1];
      const fileLink = await ctx.telegram.getFileLink(highestRes.file_id);
      const targetDir = process.env.RECEIVED_FILES_DIR || DEFAULT_RECEIVED_FILES_DIR;
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const filename = `photo_${Date.now()}.jpg`;
      const targetPath = path.join(targetDir, filename);

      const res = await fetch(fileLink.href);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);

      await ctx.reply(`🖼️ <b>ছবি সংরক্ষণ সম্পন্ন, স্যার!</b>\n\n💾 লোকেশন: <code>${escapeHtml(targetPath)}</code>\n\nছবিটি আপনার কম্পিউটারে সংরক্ষিত রাখা হয়েছে।`, { parse_mode: 'HTML' });
    } catch (e) {
      ctx.reply(`ছবি সংরক্ষণে সমস্যা হয়েছে, স্যার: ${e.message}`);
    }
  });

  // Natural Text Message Handler
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      return next();
    }

    console.log(`[Telegram] Processing natural text from Sir: "${text}"`);
    try {
      const outcome = await ahmadBrain.processCommand(text);
      await sendOutcomeToSir(ctx, outcome);
    } catch (err) {
      console.error('[Telegram] Text command error:', err);
      await ctx.reply(`নির্দেশ পালনে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  return bot;
}
