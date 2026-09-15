import { Telegraf, Markup } from 'telegraf';
import { ExecutiveBrain } from './executiveBrain.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC } from './systemController.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import fs from 'fs';
import path from 'path';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
      `• /whatsapp_status - WhatsApp লাইভ স্ট্যাটাস ও ক্লায়েন্ট পরিসংখ্যান\n` +
      `• /whatsapp_reply &lt;on/off&gt; - স্বয়ংক্রিয় সচিব বার্তা নিয়ন্ত্রণ\n` +
      `• /whatsapp_exclude - পরিবার/ভিআইপি এক্সক্লুশন তালিকা\n` +
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

  // /briefing
  bot.command('briefing', async (ctx) => {
    console.log('[Telegram] Executing /briefing command for Sir');
    const text = generateMorningBriefingText()
      .replace(/\*(.*?)\*/g, '<b>$1</b>');
    await ctx.reply(text, { parse_mode: 'HTML' });
  });

  // /summary
  bot.command('summary', async (ctx) => {
    console.log('[Telegram] Executing /summary command for Sir');
    const text = generateNightSummaryText()
      .replace(/\*(.*?)\*/g, '<b>$1</b>');
    await ctx.reply(text, { parse_mode: 'HTML' });
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

  // Voice Note Handler (Full Gemini 3.6 Flash Multimodal Audio STT)
  bot.on('voice', async (ctx) => {
    console.log('[Telegram] Received voice message from Sir. Transcribing with Gemini 3.6 Flash...');
    try {
      const fileId = ctx.message.voice.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);

      // 1. Fetch raw voice note buffer from Telegram
      const audioRes = await fetch(fileLink.href);
      const audioBuffer = await audioRes.arrayBuffer();

      // 2. Transcribe voice in Bengali using Gemini 3.6 Flash
      const transcribedText = await ahmadBrain.transcribeAudio(audioBuffer, 'audio/ogg');

      if (!transcribedText) {
        return ctx.reply('স্যার, আপনার ভয়েস অডিওটি স্পষ্টভাবে বুঝতে পারিনি। অনুগ্রহ করে আরেকবার কথা বলে পাঠানোর বিনীত অনুরোধ করছি, স্যার।');
      }

      await ctx.reply(`🎙️ <b>আপনার কণ্ঠের নির্দেশ:</b>\n<i>"${escapeHtml(transcribedText)}"</i>\n\nজি স্যার, আদেশটি পেয়েছি। এখনই সম্পন্ন করছি...`, { parse_mode: 'HTML' });

      // 3. Execute transcribed command
      const outcome = await ahmadBrain.processCommand(transcribedText, { fromVoice: true });

      if (outcome.type === 'document') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try { await ctx.replyWithVoice({ source: outcome.voiceAudioPath }); } catch (e) {}
        }
        await ctx.reply(outcome.replyText, { parse_mode: 'HTML' });
        try {
          console.log(`[Telegram] Streaming document to Sir: ${outcome.documentPath}`);
          await ctx.replyWithDocument({
            source: fs.createReadStream(outcome.documentPath),
            filename: outcome.documentName
          });
          console.log('[Telegram] Document delivered successfully!');
        } catch (docErr) {
          console.error('[Telegram] replyWithDocument error, trying telegram.sendDocument fallback:', docErr.message);
          await ctx.telegram.sendDocument(ctx.chat.id, {
            source: fs.createReadStream(outcome.documentPath),
            filename: outcome.documentName
          });
        }
      } else if (outcome.type === 'photo') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try { await ctx.replyWithVoice({ source: outcome.voiceAudioPath }); } catch (e) {}
        }
        await ctx.replyWithPhoto({ source: outcome.photoPath }, { caption: outcome.replyText });
      } else if (outcome.type === 'video_package') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try { await ctx.replyWithVoice({ source: outcome.voiceAudioPath }); } catch (e) {}
        }
        await ctx.reply(outcome.replyText);
      } else {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try { await ctx.replyWithVoice({ source: outcome.voiceAudioPath }); } catch (e) {}
        }
        await ctx.reply(outcome.replyText);
      }
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
      const targetDir = 'C:\\Personal Agent\\Agent 1\\received_files';
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
      const targetDir = 'C:\\Personal Agent\\Agent 1\\received_files';
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

      if (outcome.type === 'document') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try {
            await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
          } catch (e) {}
        }
        await ctx.reply(outcome.replyText, { parse_mode: 'HTML' });
        try {
          console.log(`[Telegram] Streaming document to Sir: ${outcome.documentPath}`);
          await ctx.replyWithDocument({
            source: fs.createReadStream(outcome.documentPath),
            filename: outcome.documentName
          });
          console.log(`[Telegram] Document "${outcome.documentName}" delivered to Sir!`);
        } catch (docErr) {
          console.error('[Telegram] replyWithDocument error, trying fallback:', docErr.message);
          await ctx.telegram.sendDocument(ctx.chat.id, {
            source: fs.createReadStream(outcome.documentPath),
            filename: outcome.documentName
          });
        }
      } else if (outcome.type === 'photo') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try {
            await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
          } catch (e) {}
        }
        await ctx.replyWithPhoto({ source: outcome.photoPath }, { caption: outcome.replyText });
      } else if (outcome.type === 'video_package') {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try {
            await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
          } catch (e) {}
        }
        await ctx.reply(outcome.replyText);
      } else {
        if (outcome.voiceAudioPath && fs.existsSync(outcome.voiceAudioPath)) {
          try {
            await ctx.replyWithVoice({ source: outcome.voiceAudioPath });
          } catch (e) {}
        }
        await ctx.reply(outcome.replyText);
      }
    } catch (err) {
      console.error('[Telegram] Text command error:', err);
      await ctx.reply(`নির্দেশ পালনে সমস্যা হয়েছে, স্যার: ${err.message}`);
    }
  });

  return bot;
}
