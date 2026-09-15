import fs from 'fs';
import path from 'path';
import pino from 'pino';
import QRCode from 'qrcode';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class WhatsAppService {
  constructor(options = {}) {
    this.projectRoot = process.cwd();
    this.authDir = path.join(this.projectRoot, 'auth_info_baileys');
    this.qrImagePath = path.join(this.projectRoot, 'whatsapp_qr.png');
    this.configPath = path.join(this.projectRoot, 'rules', 'whatsapp_config.json');
    this.cooldownsPath = path.join(this.projectRoot, 'whatsapp_cooldowns.json');
    this.personaPath = path.join(this.projectRoot, 'rules', 'persona.json');

    this.sock = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
    this.currentQrRaw = null;
    this.telegramNotifier = options.telegramNotifier || null;

    this.pendingBatches = new Map();
    this.stats = {
      messagesReceivedToday: 0,
      autoRepliesSentToday: 0,
      connectedAt: null
    };

    this.config = this.loadConfig();
    this.persona = this.loadPersona();
    this.cooldowns = this.loadCooldowns();
  }

  loadConfig() {
    const defaults = {
      autoReplyEnabled: true,
      cooldownHours: 2,
      sirInactivityCooldownHours: 4,
      debounceSeconds: 3.5,
      excludedNumbers: []
    };
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8').replace(/^\uFEFF/, '');
        return { ...defaults, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('[WhatsApp] Error loading config:', e.message);
    }
    return defaults;
  }

  saveConfig() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.error('[WhatsApp] Error saving config:', e.message);
    }
  }

  loadPersona() {
    const defaults = {
      agent_name: 'আহমদ',
      owner_honorific: 'স্যার',
      client_honorific: 'স্যার',
      busy_message: 'আসসালামু আলাইকুম স্যার। যোগাযোগ করার জন্য ধন্যবাদ। আমি স্যারের পার্সোনাল এআই অ্যাসিস্ট্যান্ট আহমদ। স্যার এখন একটি গুরুত্বপূর্ণ প্রজেক্টের কাজে ব্যস্ত আছেন। আপনার প্রয়োজনীয় বিষয় বা বার্তাটি দয়া করে এখানে লিখে রাখুন, স্যার ফ্রি হওয়া মাত্রই আপনার সাথে যোগাযোগ করবেন, স্যার।'
    };
    try {
      if (fs.existsSync(this.personaPath)) {
        const raw = fs.readFileSync(this.personaPath, 'utf-8').replace(/^\uFEFF/, '');
        return { ...defaults, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('[WhatsApp] Error loading persona:', e.message);
    }
    return defaults;
  }

  loadCooldowns() {
    try {
      if (fs.existsSync(this.cooldownsPath)) {
        const raw = fs.readFileSync(this.cooldownsPath, 'utf-8').replace(/^\uFEFF/, '');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('[WhatsApp] Error loading cooldowns:', e.message);
    }
    return {};
  }

  saveCooldowns() {
    try {
      fs.writeFileSync(this.cooldownsPath, JSON.stringify(this.cooldowns, null, 2), 'utf-8');
    } catch (e) {
      console.error('[WhatsApp] Error saving cooldowns:', e.message);
    }
  }

  getSecretaryReplyText() {
    return (
      `আসসালামু আলাইকুম ${this.persona.client_honorific}।\n` +
      `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আমি স্যারের পার্সোনাল এআই অ্যাসিস্ট্যান্ট ${this.persona.agent_name}।\n\n` +
      `স্যার এখন একটি গুরুত্বপূর্ণ প্রজেক্টের কাজে ব্যস্ত আছেন। আপনার বার্তাটি আমি ইতিমধ্যে স্যারের ব্যক্তিগত জরুরি নোটিফিকেশন সিস্টেমে পৌঁছে দিয়েছি। স্যার ফ্রি হওয়া মাত্রই আপনার সাথে যোগাযোগ করবেন, ইনশাআল্লাহ।\n\n` +
      `আপনার প্রয়োজনীয় কাজের বিবরণ, সময়সীমা বা জরুরি কোনো তথ্য থাকলে এখানে লিখে রাখতে পারেন, ${this.persona.client_honorific}। ধন্যবাদ।`
    );
  }

  recordSirActivity(phoneNum) {
    const cleanNum = phoneNum.replace(/\D/g, '');
    if (!this.cooldowns[cleanNum]) {
      this.cooldowns[cleanNum] = {
        name: 'পরিচিত কন্টাক্ট',
        lastRepliedAt: 0,
        lastMessageAt: Date.now(),
        sirInteractedAt: Date.now(),
        totalMessages: 0
      };
    } else {
      this.cooldowns[cleanNum].sirInteractedAt = Date.now();
    }
    this.saveCooldowns();
    console.log(`[WhatsApp Protection] Sir interacted with +${cleanNum}. Auto-reply paused for this contact.`);
  }

  recordAutoReplySent(phoneNum, name) {
    const cleanNum = phoneNum.replace(/\D/g, '');
    const now = Date.now();
    if (!this.cooldowns[cleanNum]) {
      this.cooldowns[cleanNum] = {
        name: name || 'সম্মানিত ক্লায়েন্ট',
        lastRepliedAt: now,
        lastMessageAt: now,
        sirInteractedAt: 0,
        totalMessages: 1
      };
    } else {
      this.cooldowns[cleanNum].lastRepliedAt = now;
      this.cooldowns[cleanNum].lastMessageAt = now;
      if (name) this.cooldowns[cleanNum].name = name;
      this.cooldowns[cleanNum].totalMessages = (this.cooldowns[cleanNum].totalMessages || 0) + 1;
    }
    this.stats.autoRepliesSentToday++;
    this.saveCooldowns();
  }

  checkEligibility(phoneNum) {
    const cleanNum = phoneNum.replace(/\D/g, '');

    // 1. Excluded numbers check (Family / VIP / Whitelist)
    if (Array.isArray(this.config.excludedNumbers)) {
      const isExcluded = this.config.excludedNumbers.some(n => cleanNum.includes(n.replace(/\D/g, '')));
      if (isExcluded) {
        return { eligible: false, reason: 'excluded' };
      }
    }

    // 2. Global auto reply toggle check
    if (!this.config.autoReplyEnabled) {
      return { eligible: false, reason: 'auto_reply_disabled' };
    }

    const record = this.cooldowns[cleanNum];
    if (!record) {
      return { eligible: true };
    }

    const now = Date.now();

    // 3. Sir Inactivity protection check
    if (record.sirInteractedAt) {
      const sirElapsedHours = (now - record.sirInteractedAt) / (1000 * 60 * 60);
      if (sirElapsedHours < this.config.sirInactivityCooldownHours) {
        return {
          eligible: false,
          reason: 'sir_engaged',
          hoursAgo: sirElapsedHours.toFixed(1)
        };
      }
    }

    // 4. Cooldown window check (default 2 hours)
    if (record.lastRepliedAt) {
      const elapsedHours = (now - record.lastRepliedAt) / (1000 * 60 * 60);
      if (elapsedHours < this.config.cooldownHours) {
        const remainingMinutes = Math.ceil((this.config.cooldownHours - elapsedHours) * 60);
        const elapsedMinutes = Math.floor(elapsedHours * 60);
        return {
          eligible: false,
          reason: 'cooldown_active',
          elapsedMinutes,
          remainingMinutes
        };
      }
    }

    return { eligible: true };
  }

  enqueueMessage(phoneNum, jid, pushName, messageText) {
    this.stats.messagesReceivedToday++;
    const cleanNum = phoneNum.replace(/\D/g, '');

    if (!this.pendingBatches.has(cleanNum)) {
      this.pendingBatches.set(cleanNum, {
        jid,
        phoneNum: cleanNum,
        pushName: pushName || 'সম্মানিত ক্লায়েন্ট',
        messages: [messageText],
        timer: null
      });
    } else {
      const batch = this.pendingBatches.get(cleanNum);
      batch.messages.push(messageText);
      if (pushName && batch.pushName === 'সম্মানিত ক্লায়েন্ট') {
        batch.pushName = pushName;
      }
      if (batch.timer) clearTimeout(batch.timer);
    }

    const batch = this.pendingBatches.get(cleanNum);
    const delayMs = (this.config.debounceSeconds || 3.5) * 1000;

    batch.timer = setTimeout(() => {
      this.flushBatch(cleanNum);
    }, delayMs);
  }

  async flushBatch(phoneNum) {
    const batch = this.pendingBatches.get(phoneNum);
    if (!batch) return;
    this.pendingBatches.delete(phoneNum);

    const { jid, pushName, messages } = batch;
    const eligibility = this.checkEligibility(phoneNum);
    let actionDescription = '';

    // Auto Reply Execution
    if (eligibility.eligible) {
      const replyText = this.getSecretaryReplyText();
      try {
        if (this.sock && this.status === 'connected') {
          await this.sock.sendMessage(jid, { text: replyText });
          this.recordAutoReplySent(phoneNum, pushName);
          actionDescription = '✅ সম্মানজনক স্বয়ংক্রিয় সচিব বার্তা ক্লায়েন্টকে প্রেরণ করা হয়েছে (২ ঘণ্টার কুলডাউন সক্রিয়)।';
          console.log(`[WhatsApp] Auto-reply sent to ${pushName} (+${phoneNum})`);
        } else {
          actionDescription = '⚠️ WhatsApp সকেট অনলাইন না থাকায় স্বয়ংক্রিয় জবাব দেওয়া সম্ভব হয়নি।';
        }
      } catch (err) {
        console.error('[WhatsApp] Error sending auto-reply:', err.message);
        actionDescription = `⚠️ বার্তা প্রেরণে ত্রুটি: ${err.message}`;
      }
    } else {
      if (eligibility.reason === 'cooldown_active') {
        actionDescription = `⏳ ক্লায়েন্টকে পূর্বে জবাব দেওয়া হয়েছে (${eligibility.elapsedMinutes} মিনিট আগে, ${eligibility.remainingMinutes} মিনিট পর পরবর্তী জবাব প্রযোজ্য)।`;
      } else if (eligibility.reason === 'sir_engaged') {
        actionDescription = `💬 স্যার, আপনি নিজেই পূর্বে এই ক্লায়েন্টের সাথে আলাপচারিতায় ছিলেন (${eligibility.hoursAgo} ঘণ্টা পূর্বে)। আহমদ কোনো হস্তক্ষেপ করেনি।`;
      } else if (eligibility.reason === 'excluded') {
        actionDescription = '🛡️ নম্বরটি আপনার এক্সক্লুশন তালিকায় (পরিবার/ভিআইপি) থাকায় স্বয়ংক্রিয় বার্তা পাঠানো হয়নি।';
      } else if (eligibility.reason === 'auto_reply_disabled') {
        actionDescription = '⏸️ স্বয়ংক্রিয় রেসপন্ডার বর্তমানে বন্ধ (Disabled) রাখা হয়েছে।';
      }
    }

    // Forward Alert to Sir on Telegram
    await this.notifySirOnTelegram({
      pushName,
      phoneNum,
      messages,
      actionDescription
    });
  }

  async notifySirOnTelegram({ pushName, phoneNum, messages, actionDescription }) {
    if (!this.telegramNotifier) return;

    const timeStr = new Date().toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka'
    });

    let messageBody = '';
    if (messages.length === 1) {
      messageBody = `<i>"${escapeHtml(messages[0])}"</i>`;
    } else {
      messageBody = messages.map((m, i) => `${i + 1}. <i>"${escapeHtml(m)}"</i>`).join('\n');
    }

    const alertHtml =
      `📬 <b>হোয়াটসঅ্যাপ ক্লায়েন্ট বার্তা (Ahmad Triage)</b>\n\n` +
      `👤 <b>প্রেরক:</b> ${escapeHtml(pushName)}\n` +
      `📱 <b>নম্বর:</b> <code>+${escapeHtml(phoneNum)}</code>\n` +
      `⏰ <b>সময়:</b> ${timeStr} (বাংলাদেশ সময়)\n\n` +
      `💬 <b>বার্তা:</b>\n${messageBody}\n\n` +
      `🤖 <b>আহমদের ব্যবস্থা:</b>\n${actionDescription}`;

    try {
      await this.telegramNotifier(alertHtml);
    } catch (err) {
      console.error('[WhatsApp] Failed to send Telegram alert to Sir:', err.message);
    }
  }

  async start() {
    console.log('[WhatsApp] Initializing Baileys Multi-Device Client...');
    this.status = 'connecting';

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`[WhatsApp] Using WA v${version.join('.')}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: Browsers.windows('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.currentQrRaw = qr;
          this.status = 'qr_ready';
          try {
            await QRCode.toFile(this.qrImagePath, qr, {
              margin: 2,
              scale: 8,
              color: { dark: '#000000', light: '#ffffff' }
            });
            console.log(`[WhatsApp] New QR code generated at ${this.qrImagePath}`);
          } catch (e) {
            console.error('[WhatsApp] QR image generation error:', e.message);
          }
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.stats.connectedAt = new Date().toISOString();
          console.log('✅ [WhatsApp] Multi-Device connection OPEN! Ahmad is now live on WhatsApp.');

          if (fs.existsSync(this.qrImagePath)) {
            try { fs.unlinkSync(this.qrImagePath); } catch (e) {}
          }

          if (this.telegramNotifier) {
            const welcomeMsg =
              `✅ <b>WhatsApp সফলভাবে সংযুক্ত হয়েছে!</b>\n\n` +
              `সম্মানিত স্যার, আহমদ এখন আপনার WhatsApp এ ক্লায়েন্ট ও ইনকামিং বার্তা তদারকি করতে সম্পূর্ণ প্রস্তুত।\n` +
              `• স্বয়ংক্রিয় সচিব বার্তা: ${this.config.autoReplyEnabled ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Off)'}\n` +
              `• স্মার্ট কুলডাউন: ${this.config.cooldownHours} ঘণ্টা\n` +
              `• গ্রুপ বার্তা ও স্ট্যাটাস: সম্পূর্ণ সুরক্ষিত ও ফিল্টার্ড।`;
            try {
              await this.telegramNotifier(welcomeMsg);
            } catch (e) {}
          }
        }

        if (connection === 'close') {
          const wasConnected = this.status === 'connected';
          this.status = 'disconnected';
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          console.log(`[WhatsApp] Connection closed (status: ${statusCode}, wasConnected: ${wasConnected})`);

          if (statusCode === DisconnectReason.loggedOut && wasConnected) {
            console.log('[WhatsApp] Logged out from phone by user. Wiping credentials for fresh pairing...');
            try {
              if (fs.existsSync(this.authDir)) {
                fs.rmSync(this.authDir, { recursive: true, force: true });
              }
            } catch (e) {}
            if (this.telegramNotifier) {
              await this.telegramNotifier(
                '⚠️ <b>WhatsApp সেশন সমাপ্ত হয়েছে।</b>\nনতুন করে সংযোগ করতে টেলিগ্রামে <code>/whatsapp_qr</code> পাঠান, স্যার।'
              );
            }
          }

          // Always automatically restart to generate fresh QR code and accept pairing
          console.log('[WhatsApp] Re-initializing socket in 3 seconds for fresh pairing / QR refresh...');
          setTimeout(() => this.start(), 3000);
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (!messages || messages.length === 0) return;

        for (const m of messages) {
          try {
            if (!m || !m.key) continue;
            const jid = m.key.remoteJid;

            // Basic filters
            if (!jid) continue;
            if (jid.endsWith('@g.us')) continue; // Ignore groups
            if (jid.includes('@broadcast') || jid.includes('@newsletter') || jid === 'status@broadcast') continue; // Ignore broadcast
            if (!jid.endsWith('@s.whatsapp.net')) continue; // Must be 1-on-1 private user

            const phoneNum = jid.split('@')[0];

            // If Sir sent message from his phone
            if (m.key.fromMe) {
              this.recordSirActivity(phoneNum);
              continue;
            }

            // Client message
            if (this.isProtocolOrSystemMessage(m)) continue;

            const text = this.extractMessageText(m);
            if (!text || text.trim() === '') continue;

            const pushName = m.pushName || 'সম্মানিত ক্লায়েন্ট';
            console.log(`[WhatsApp] Incoming private message from ${pushName} (+${phoneNum}): ${text}`);
            this.enqueueMessage(phoneNum, jid, pushName, text);
          } catch (err) {
            console.error('[WhatsApp] Error processing incoming message:', err);
          }
        }
      });

    } catch (e) {
      console.error('[WhatsApp] Failed to initialize socket:', e);
      this.status = 'disconnected';
    }
  }

  isProtocolOrSystemMessage(m) {
    if (!m || !m.message) return true;
    const msg = m.message;
    return !!(
      msg.protocolMessage ||
      msg.senderKeyDistributionMessage ||
      msg.fastRatchetKeySenderKeyDistributionMessage ||
      msg.reactionMessage ||
      msg.keepInChatMessage
    );
  }

  extractMessageText(m) {
    if (!m || !m.message) return '';
    const msg =
      m.message.ephemeralMessage?.message ||
      m.message.viewOnceMessage?.message ||
      m.message.viewOnceMessageV2?.message ||
      m.message;

    if (msg.conversation) return msg.conversation;
    if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
    if (msg.imageMessage?.caption) return `[ছবি] ${msg.imageMessage.caption}`;
    if (msg.imageMessage) return '[ছবি / Image]';
    if (msg.videoMessage?.caption) return `[ভিডিও] ${msg.videoMessage.caption}`;
    if (msg.videoMessage) return '[ভিডিও / Video]';
    if (msg.audioMessage) return '[ভয়েস অডিও নোট / Voice Note]';
    if (msg.documentMessage) {
      const fn = msg.documentMessage.fileName || 'ফাইল';
      return `[ডকুমেন্ট: ${fn}]`;
    }
    if (msg.contactMessage) {
      return `[কন্টাক্ট কার্ড: ${msg.contactMessage.displayName || 'নাম্বার'}]`;
    }
    if (msg.locationMessage) return '[লোকেশন / Location]';
    if (msg.stickerMessage) return '[স্টিকার / Sticker]';
    return '';
  }

  getQrImagePath() {
    if (fs.existsSync(this.qrImagePath)) {
      return this.qrImagePath;
    }
    return null;
  }

  async requestPairingCode(phoneNum) {
    const cleanNum = phoneNum.replace(/\D/g, '');
    if (!cleanNum) throw new Error('ফোন নম্বরটি সঠিক নয়');

    if (!this.sock) {
      await this.start();
      await new Promise((r) => setTimeout(r, 2500));
    }

    try {
      const code = await this.sock.requestPairingCode(cleanNum);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(`[WhatsApp] Pairing code generated for +${cleanNum}: ${formatted}`);
      return formatted;
    } catch (err) {
      console.error('[WhatsApp] requestPairingCode error, retrying with fresh socket:', err.message);
      await this.start();
      await new Promise((r) => setTimeout(r, 2500));
      const retryCode = await this.sock.requestPairingCode(cleanNum);
      const retryFormatted = retryCode?.match(/.{1,4}/g)?.join('-') || retryCode;
      return retryFormatted;
    }
  }

  getStatus() {
    const totalHandled = Object.keys(this.cooldowns).length;
    return {
      status: this.status,
      autoReplyEnabled: this.config.autoReplyEnabled,
      cooldownHours: this.config.cooldownHours,
      sirInactivityCooldownHours: this.config.sirInactivityCooldownHours,
      excludedCount: this.config.excludedNumbers.length,
      totalContactsTracked: totalHandled,
      receivedToday: this.stats.messagesReceivedToday,
      repliedToday: this.stats.autoRepliesSentToday
    };
  }

  setAutoReply(enabled) {
    this.config.autoReplyEnabled = !!enabled;
    this.saveConfig();
    return this.config.autoReplyEnabled;
  }

  addExcludedNumber(num) {
    const clean = num.replace(/\D/g, '');
    if (!clean) return false;
    if (!this.config.excludedNumbers.includes(clean)) {
      this.config.excludedNumbers.push(clean);
      this.saveConfig();
    }
    return true;
  }

  removeExcludedNumber(num) {
    const clean = num.replace(/\D/g, '');
    const idx = this.config.excludedNumbers.indexOf(clean);
    if (idx !== -1) {
      this.config.excludedNumbers.splice(idx, 1);
      this.saveConfig();
      return true;
    }
    return false;
  }

  getExcludedNumbers() {
    return this.config.excludedNumbers;
  }
}

// Backward compatibility function
export function handleIncomingClientMessage({ senderName, messageText }) {
  const service = new WhatsAppService();
  return {
    replyText: service.getSecretaryReplyText(),
    timestamp: new Date().toISOString()
  };
}

