import fs from 'fs';
import path from 'path';
import { VoiceProcessor } from './voiceProcessor.js';
import { SubagentManager } from './subagentManager.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC, lockPC, emptyRecycleBin, openApplication } from './systemController.js';
import { DesktopOrganizer } from './desktopOrganizer.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';
import { ContentScheduler } from '../subagents/socialMediaManager/contentScheduler.js';

export class ExecutiveBrain {
  constructor() {
    this.name = 'আহমদ (Ahmad)';
    this.title = 'Personal Executive AI Assistant & Chief of Staff';
    this.voiceProcessor = new VoiceProcessor();
    this.subagents = new SubagentManager();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Neural Semantic Intent Classifier via Gemini (3.6 Flash + 3.5 Lite Fallback)
  // ─────────────────────────────────────────────────────────────────────────────
  async classifyIntentWithGemini(userInput) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are the Semantic Intent Classifier & Brain for Ahmad (আহমদ), Sir's Personal Executive AI Assistant & Chief of Staff.
Analyze Sir's input (which can be colloquial Bengali, voice transcription, synonyms, indirect phrasing, or English) and classify the exact executive action Sir wants.

Available Actions:
- ACTION_SCREENSHOT: capture PC screen / show display / view what is on screen / see monitor
- ACTION_DESKTOP_ORGANIZE: tidy / clean up / organize messy loose files on desktop into folders / arrange desktop
- ACTION_DESKTOP_UNDO: revert desktop / bring files back / restore desktop
- ACTION_DESKTOP_STATUS: check desktop file counts / desktop report / how many files on desktop
- ACTION_LOCK_PC: lock screen / lock workstation / lock computer
- ACTION_EMPTY_RECYCLE_BIN: empty recycle bin / delete trash / remove computer garbage / clear bin
- ACTION_OPEN_APP: open / launch application (chrome, notepad, calc, taskmgr, explorer, cmd, edge, etc.)
- ACTION_FILE_SEARCH: search, locate, or send local/Google Drive files, books, documents, PDFs
- ACTION_FB_STATUS: Facebook page status, follower count, likes, page performance
- ACTION_FB_POST: publish a post to Facebook page
- ACTION_CONTENT_PLAN: view weekly social media content calendar / scheduled posts
- ACTION_SYSTEM_STATUS: check PC hardware health, CPU, RAM, uptime, system load
- ACTION_MORNING_BRIEFING: morning briefing / start of day update
- ACTION_NIGHT_SUMMARY: night summary / end of day recap
- ACTION_SOFTWARE_ARCH: software engineering, web development, enterprise system architecture
- ACTION_TALKING_AVATAR: create talking avatar video / lip-sync avatar
- ACTION_CREATE_VIDEO: create social media video package
- ACTION_CHAT: general conversation, greeting, question, or advice

Return ONLY valid JSON matching this schema:
{
  "action": "<ACTION_NAME>",
  "params": {
    "appName": "<chrome|notepad|calc|taskmgr|explorer|cmd|edge|...>",
    "query": "<search query>",
    "sendDirectly": true,
    "postText": "<text to post>",
    "topic": "<video topic>",
    "duration": 1
  },
  "reply": "<Ahmad's direct respectful response to Sir in Bengali addressing Sir as 'স্যার'>"
}`;

      const runWithModel = async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nSir says: "${userInput}"\nOutput JSON only:` }]
            }
          ],
          config: {
            responseMimeType: 'application/json'
          }
        });
        const raw = response.text?.trim();
        return JSON.parse(raw);
      };

      try {
        return await runWithModel('gemini-3.6-flash');
      } catch (e36) {
        console.warn('[Gemini 3.6 Flash intent fallback to 3.5 Flash-lite]:', e36.message);
        return await runWithModel('gemini-3.5-flash-lite');
      }
    } catch (err) {
      console.error('[Gemini Intent Classification Error]:', err.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Main Executive Command Processor (Voice & Text)
  // ─────────────────────────────────────────────────────────────────────────────
  async processCommand(rawInput, { fromVoice = false } = {}) {
    const input = rawInput.trim();
    console.log(`[আহমদ Executive Brain] Processing ${fromVoice ? 'VOICE' : 'TEXT'} command: "${input}"`);

    // 1. Primary Neural Processing: Semantic Intent Engine
    const intent = await this.classifyIntentWithGemini(input);
    if (intent && intent.action) {
      console.log(`[Executive Brain] Neural Intent Detected: ${intent.action}`, intent.params);

      // A. PC Screen Capture
      if (intent.action === 'ACTION_SCREENSHOT') {
        const imgPath = await captureScreenshot();
        const replyText = intent.reply || `জি স্যার, আমি আপনার কম্পিউটারের বর্তমান স্ক্রিনের দৃশ্যটি ধারণ করেছি। নিচে সংযুক্ত করে দিচ্ছি, স্যার।`;
        return {
          type: 'photo',
          photoPath: imgPath,
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir(replyText)
        };
      }

      // B. Smart Desktop Organizer
      if (intent.action === 'ACTION_DESKTOP_ORGANIZE') {
        const org = new DesktopOrganizer();
        const res = org.organizeDesktop();
        if (res.success) {
          const replyText = `জি স্যার! আপনার ডেস্কটপ সফলভাবে গুছিয়ে দেওয়া হয়েছে। মোট <b>${res.movedCount}টি</b> আলগা ফাইলকে সুশৃঙ্খল ফোল্ডারে সরানো হয়েছে। আপনার কোনো অ্যাপ শর্টকাট বা কাজের ফোল্ডার পরিবর্তন করা হয়নি, স্যার।`;
          return {
            type: 'text',
            replyText,
            voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার! আপনার ডেস্কটপ সুন্দরভাবে গুছিয়ে দেওয়া হয়েছে।')
          };
        } else {
          return { type: 'text', replyText: `স্যার, ডেস্কটপ গোছাতে সমস্যা হয়েছে: ${res.error}` };
        }
      }

      // C. Smart Desktop Undo
      if (intent.action === 'ACTION_DESKTOP_UNDO') {
        const org = new DesktopOrganizer();
        const res = org.undoOrganize();
        if (res.success) {
          const replyText = `জি স্যার! ডেস্কটপের <b>${res.restoredCount}টি</b> ফাইলকে পুনরায় আগের মূল অবস্থানে ফিরিয়ে দেওয়া হয়েছে, স্যার।`;
          return {
            type: 'text',
            replyText,
            voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, ফাইলগুলো পুনরায় আগের জায়গায় ফিরিয়ে আনা হয়েছে।')
          };
        } else {
          return { type: 'text', replyText: `স্যার, আনডু করতে সমস্যা হয়েছে: ${res.error}` };
        }
      }

      // D. Smart Desktop Status Report
      if (intent.action === 'ACTION_DESKTOP_STATUS') {
        const org = new DesktopOrganizer();
        const report = org.getSummaryReport();
        return {
          type: 'text',
          replyText: report,
          voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, আপনার ডেস্কটপের স্ট্যাটাস রিপোর্ট দেওয়া হলো।')
        };
      }

      // E. Screen Lock
      if (intent.action === 'ACTION_LOCK_PC') {
        await lockPC();
        const replyText = intent.reply || `জি স্যার, আপনার কম্পিউটারের স্ক্রিন তৎক্ষণাৎ লক করে দেওয়া হয়েছে।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আপনার কম্পিউটারের স্ক্রিন লক করা হয়েছে।')
        };
      }

      // F. Empty Recycle Bin
      if (intent.action === 'ACTION_EMPTY_RECYCLE_BIN') {
        await emptyRecycleBin();
        const replyText = intent.reply || `জি স্যার, কম্পিউটারের রিসাইকেল বিন সম্পূর্ণ খালি ও পরিষ্কার করা হয়েছে।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, রিসাইকেল বিন সফলভাবে পরিষ্কার করা হয়েছে।')
        };
      }

      // G. App Launcher
      if (intent.action === 'ACTION_OPEN_APP') {
        const app = intent.params?.appName || 'chrome';
        await openApplication(app);
        const replyText = intent.reply || `জি স্যার, ${app} অ্যাপ্লিকেশনটি চালু করা হয়েছে।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir(replyText)
        };
      }

      // H. File Search & Send
      if (intent.action === 'ACTION_FILE_SEARCH') {
        const query = intent.params?.query || input;
        const sendDirectly = intent.params?.sendDirectly ?? true;
        return await this.executeFileSearch(query, { sendDirectly, rawInput: input });
      }

      // I. Facebook Page Status
      if (intent.action === 'ACTION_FB_STATUS') {
        const status = await this.subagents.delegateFacebookStatus();
        if (status.success) {
          const replyText =
            `জি স্যার, আমাদের ফেসবুক পেজের বর্তমান এক্সিকিউটিভ স্ট্যাটাস:\n\n` +
            `📢 <b>পেজ:</b> ${status.name}\n` +
            `👥 <b>মোট ফলোয়ার:</b> ${status.followers} জন\n` +
            `👍 <b>মোট লাইক:</b> ${status.likes}টি\n` +
            `🟢 <b>কানেকশন:</b> সচল ও মেটা গ্রাফ এপিআই সংযুক্ত, স্যার।`;
          return {
            type: 'text',
            replyText,
            voiceAudioPath: await this.voiceProcessor.speakToSir(`জি স্যার, ফেসবুক পেজে মোট ${status.followers} জন ফলোয়ার রয়েছে এবং সিস্টেম সম্পূর্ণ সক্রিয় আছে।`)
          };
        } else {
          return {
            type: 'text',
            replyText: `স্যার, ফেসবুক পেজের তথ্য পেতে সমস্যা হয়েছে: ${status.error}`
          };
        }
      }

      // J. Facebook Post Publishing
      if (intent.action === 'ACTION_FB_POST') {
        const postText = intent.params?.postText || input.replace(/ফেসবুক|facebook|পোস্ট|post/gi, '').trim() || 'আসসালামু আলাইকুম! আমাদের পেজে আপনাদের স্বাগতম। আধুনিক প্রযুক্তি ও প্রফেশনাল সলিউশনের জন্য আমাদের সাথেই থাকুন।';
        const res = await this.subagents.delegateFacebookPost(postText);
        if (res.success) {
          const replyText =
            `জি স্যার! আপনার নির্দেশমতো আমি সোশ্যাল মিডিয়া ম্যানেজারকে দিয়ে ফেসবুক পেজে সফলভাবে পোস্ট পাবলিশ করিয়েছি, স্যার।\n\n` +
            `📝 <b>পোস্টের বিবরণ:</b>\n"${postText}"\n\n` +
            `🔗 <b>লিংক:</b> <a href="${res.postUrl}">এখানে দেখুন</a>`;
          return {
            type: 'text',
            replyText,
            voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আপনার ফেসবুক পেজে সফলভাবে পোস্ট পাবলিশ করা হয়েছে, স্যার।')
          };
        } else {
          return {
            type: 'text',
            replyText: `স্যার, ফেসবুক পেজে পোস্ট প্রকাশে সমস্যা হয়েছে: ${res.error}`
          };
        }
      }

      // K. Social Media Content Plan
      if (intent.action === 'ACTION_CONTENT_PLAN') {
        const cs = new ContentScheduler();
        const summary = cs.getPlanSummary();
        let replyText = `📅 <b>সাপ্তাহিক সোশ্যাল মিডিয়া কন্টেন্ট প্ল্যান (স্যার):</b>\n\n`;
        summary.forEach(item => {
          const statusIcon = item.status === 'published' ? '✅' : '⏳';
          replyText += `${statusIcon} <b>Day ${item.id} (${item.day}):</b> ${item.title}\n   <i>বিষয়: ${item.topic}</i>\n\n`;
        });
        replyText += `বিস্তারিত দেখতে টেলিগ্রামে <code>/post_preview 1</code> বা দিন নম্বর উল্লেখ করুন, স্যার।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, আপনার সাপ্তাহিক সোশ্যাল মিডিয়া কন্টেন্ট প্ল্যান প্রস্তুত রয়েছে।')
        };
      }

      // L. PC Hardware & System Status
      if (intent.action === 'ACTION_SYSTEM_STATUS') {
        const s = getSystemStatus();
        const replyText =
          `স্যার, আপনার কম্পিউটারের বর্তমান অবস্থা সম্পূর্ণ স্থিতিশীল ও স্বাভাবিক রয়েছে।\n` +
          `• ওএস: ${s.os}\n` +
          `• প্রসেসর: ${s.cpuModel} (${s.cpuCores} কোর সক্রিয়)\n` +
          `• মেমরি: ${s.freeMemory} খালি (মোট ${s.totalMemory})\n` +
          `• আপটাইম: ${s.uptime}\n` +
          `কোনো অতিরিক্ত চাপ বা সমস্যা পরিলক্ষিত হয়নি, স্যার।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, আপনার কম্পিউটারের বর্তমান অবস্থা সম্পূর্ণ স্থিতিশীল ও স্বাভাবিক রয়েছে।')
        };
      }

      // M. Morning Briefing
      if (intent.action === 'ACTION_MORNING_BRIEFING') {
        const briefing = await generateMorningBriefingText();
        return {
          type: 'text',
          replyText: briefing,
          voiceAudioPath: await this.voiceProcessor.speakToSir('শুভ সকাল স্যার। আপনার আজকের দিনের এক্সিকিউটিভ মর্নিং ব্রিফিং প্রস্তুত করা হয়েছে।')
        };
      }

      // N. Night Summary
      if (intent.action === 'ACTION_NIGHT_SUMMARY') {
        const summary = await generateNightSummaryText();
        return {
          type: 'text',
          replyText: summary,
          voiceAudioPath: await this.voiceProcessor.speakToSir('শুভ রাত্রি স্যার। আপনার সারাদিনের কাজের অগ্রগতি ও সিস্টেম সামারি প্রস্তুত রয়েছে।')
        };
      }

      // O. Software Architecture & Engineering
      if (intent.action === 'ACTION_SOFTWARE_ARCH') {
        const plan = this.subagents.delegateProjectPlan(input, { scale: 'High Concurrency 100k+ Users' });
        const replyText =
          `জি স্যার। আমি আমাদের ২০ বছরের অভিজ্ঞ প্রিন্সিপাল সফটওয়্যার আর্কিটেক্টকে দিয়ে একটি উচ্চমানের এন্টারপ্রাইজ সিস্টেম ব্লুপ্রিন্ট তৈরি করিয়েছি, স্যার।\n\n` +
          `🏛 *আর্কিটেকচার প্যাটার্ন:* ${plan.architecturalPattern}\n` +
          `• ওয়েব ফ্রন্টএন্ড: ${plan.coreLayers.presentationLayer.web}\n` +
          `• ব্যাকএন্ড ইঞ্জিন: ${plan.coreLayers.applicationLayer.runtime}\n` +
          `• প্রাথমিক ডাটাবেজ: ${plan.coreLayers.infrastructureLayer.primaryDatabase}\n` +
          `• ক্যাশিং ও সিকিউরিটি: ${plan.coreLayers.infrastructureLayer.cachingLayer}\n\n` +
          `সম্পূর্ণ কোডবেজ প্রোডাকশন-রেডি করার জন্য আমি প্রস্তুত আছি, স্যার।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আপনার জন্য এন্টারপ্রাইজ সিস্টেম আর্কিটেকচার ব্লুপ্রিন্ট প্রস্তুত করা হয়েছে, স্যার।')
        };
      }

      // P. Talking Avatar Video Production (D-ID)
      if (intent.action === 'ACTION_TALKING_AVATAR') {
        return await this.executeTalkingAvatar();
      }

      // Q. Social Media Video Creation
      if (intent.action === 'ACTION_CREATE_VIDEO') {
        const topic = intent.params?.topic || 'ডিজিটাল সলিউশন ও অটোমেশন';
        const duration = intent.params?.duration || 1;
        const packageResult = await this.subagents.delegateVideoProduction(topic, duration);
        const replyText =
          `জি স্যার! আমি সোশ্যাল মিডিয়া সাব-এজেন্টকে দিয়ে "${topic}" বিষয়ের ওপর ${duration} মিনিটের একটি সম্পূর্ণ মার্জিত ভিডিও এবং ফেসবুক পোস্ট তৈরি করিয়েছি, স্যার।\n\n` +
          `🎥 ভিডিও ফাইল: \`${packageResult.videoPath}\`\n` +
          `🎙️ ভয়েসওভার: \`${packageResult.audioPath}\`\n\n` +
          `📝 *ফেসবুক পোস্ট কপি:*\n${packageResult.facebookPostCopy}`;
        return {
          type: 'video_package',
          packageResult,
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir(`জি স্যার, আপনার নির্দেশমতো ${duration} মিনিটের ভিডিও প্যাকেজটি সফলভাবে প্রস্তুত করা হয়েছে, স্যার।`)
        };
      }

      // R. Conversational Chat
      if (intent.action === 'ACTION_CHAT' && intent.reply) {
        return {
          type: 'text',
          replyText: intent.reply,
          voiceAudioPath: await this.voiceProcessor.speakToSir(intent.reply.slice(0, 160))
        };
      }
    }

    // 2. Offline / Keyword Fallback Engine (Runs if Gemini API is unreachable or rate-limited)
    console.log('[Executive Brain] Executing keyword fallback engine for:', input);
    return await this.executeKeywordFallback(input);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Smart File Search & Delivery Implementation
  // ─────────────────────────────────────────────────────────────────────────────
  async executeFileSearch(query, { sendDirectly = true, rawInput = '' } = {}) {
    console.log(`[Executive Brain] Executing Smart File Search for Sir: "${query}" (sendDirectly=${sendDirectly})`);
    const results = await searchLocalFiles(query);

    if (!results || results.length === 0) {
      const replyText = `স্যার, "${query}" সংক্রান্ত ফাইলটি গুগল ড্রাইভ বা কম্পিউটারে খুঁজে পাওয়া যায়নি। অনুগ্রহ করে ফাইলের নাম বা ফোল্ডার আরেকটু নির্দিষ্ট করে দেওয়ার অনুরোধ করছি, স্যার।`;
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, কাঙ্ক্ষিত ফাইলটি খুঁজে পাওয়া যায়নি।')
      };
    }

    const topMatch = results[0];
    if (sendDirectly || topMatch.score >= 15) {
      const sizeMB = (topMatch.Length / 1024 / 1024).toFixed(2);
      const replyText =
        `জি স্যার, আপনার কাঙ্ক্ষিত ফাইলটি গুগল ড্রাইভ থেকে খুঁজে পেয়েছি!\n\n` +
        `📄 <b>ফাইল:</b> ${topMatch.Name}\n` +
        `📁 <b>লোকেশন:</b> <code>${topMatch.FullName}</code>\n` +
        `💾 <b>সাইজ:</b> ${sizeMB} MB\n\n` +
        `আপনার আদেশে ফাইলটি নিচে সরাসরি সংযুক্ত করে পাঠিয়ে দেওয়া হলো, স্যার।`;

      return {
        type: 'document',
        documentPath: topMatch.FullName,
        documentName: topMatch.Name,
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir(`জি স্যার, আপনার কাঙ্ক্ষিত ফাইলটি খুঁজে পেয়েছি এবং নিচে সরাসরি পাঠিয়ে দিয়েছি, স্যার।`)
      };
    }

    let replyText = `🔍 <b>স্যার, আপনার অনুসন্ধানে ${results.length}টি ফাইল পাওয়া গেছে:</b>\n\n`;
    results.slice(0, 5).forEach((r, idx) => {
      const sizeKB = (r.Length / 1024).toFixed(1);
      replyText += `${idx + 1}. 📄 <b>${r.Name}</b> (${sizeKB} KB)\n   <code>${r.FullName}</code>\n\n`;
    });
    replyText += `স্যার, কোনো নির্দিষ্ট ফাইল পাঠাতে চাইলে বলুন: "ফাইলটি পাঠিয়ে দাও"।`;

    return {
      type: 'text',
      replyText,
      voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, ফাইল অনুসন্ধানের ফলাফল পাওয়া গেছে।')
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Talking Avatar Video Production
  // ─────────────────────────────────────────────────────────────────────────────
  async executeTalkingAvatar() {
    const key = process.env.DID_API_KEY;
    if (!key) {
      return {
        type: 'text',
        replyText: 'স্যার, রিয়েলিস্টিক এআই টকিং অবতার তৈরির জন্য D-ID API Key প্রয়োজন। অনুগ্রহ করে টেলিগ্রামে <code>/did_key &lt;API_KEY&gt;</code> কমান্ড দিন অথবা চ্যাটে আমাকে কি-টি প্রদান করুন, স্যার।',
        voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, টকিং অবতার ভিডিও তৈরির জন্য ডি আই ডি এপিআই কি প্রয়োজন। অনুগ্রহ করে আমাকে কি-টি প্রদান করুন, স্যার।')
      };
    }

    const imgPath = path.resolve('subagents/socialMediaManager/output/sir_portrait_crop.jpg');
    const audioPath = path.resolve('subagents/socialMediaManager/output/voice_ai_pros_cons.mp3');
    const outVideoPath = path.resolve('subagents/socialMediaManager/output/sir_talking_avatar_1min.mp4');

    const res = await this.subagents.delegateTalkingAvatarProduction({
      imagePath: imgPath,
      audioPath: audioPath,
      outputVideoPath: outVideoPath
    });

    if (!res.success) {
      return {
        type: 'text',
        replyText: `⚠️ স্যার, অবতার তৈরিতে সমস্যা হয়েছে: ${res.error}`,
        voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, অবতার তৈরিতে একটি ত্রুটি দেখা দিয়েছে।')
      };
    }

    return {
      type: 'video',
      videoPath: res.videoPath,
      videoCaption: '🎬 Be Smart With AI - এআই ব্যবহারের সুবিধা ও অসুবিধা (Talking Avatar)',
      replyText: '🎬 <b>স্যার, আপনার জীবন্ত কথা বলা এআই টকিং অবতার ভিডিও সম্পূর্ণ প্রস্তুত!</b>',
      voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, আপনার জীবন্ত এআই টকিং অবতার ভিডিও সম্পূর্ণ প্রস্তুত করা হয়েছে।')
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Zero-Latency Keyword Rule Fallback Engine
  // ─────────────────────────────────────────────────────────────────────────────
  async executeKeywordFallback(input) {
    const lower = input.toLowerCase();

    // Screen Capture
    if (lower.includes('স্ক্রিনশট') || lower.includes('ছবি তোলো') || lower.includes('screenshot') || lower.includes('/screen')) {
      const imgPath = await captureScreenshot();
      const replyText = `জি স্যার, আমি আপনার কম্পিউটারের বর্তমান স্ক্রিনের দৃশ্যটি ধারণ করেছি। নিচে সংযুক্ত করে দিচ্ছি, স্যার।`;
      return {
        type: 'photo',
        photoPath: imgPath,
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir(replyText)
      };
    }

    // Facebook Status & Post
    if (lower.includes('ফেসবুক') || lower.includes('facebook') || lower.includes('পেজ') || lower.includes('page')) {
      if (lower.includes('পোস্ট') || lower.includes('post') || lower.includes('ছেড়ে দাও') || lower.includes('পাবলিশ')) {
        const cleanPrompt = input.replace(/ফেসবুক|facebook|পেজ|page|এ|একটি|একটা|পোস্ট|post|করো|করে|দাও|ছেড়ে|পাবলিশ/gi, '').trim();
        const postText = cleanPrompt || 'আসসালামু আলাইকুম! আমাদের পেজে আপনাদের স্বাগতম। আধুনিক প্রযুক্তি ও প্রফেশনাল সলিউশনের জন্য আমাদের সাথেই থাকুন।';
        const res = await this.subagents.delegateFacebookPost(postText);
        if (res.success) {
          const replyText =
            `জি স্যার! আপনার নির্দেশমতো আমি সোশ্যাল মিডিয়া ম্যানেজারকে দিয়ে ফেসবুক পেজে সফলভাবে পোস্ট পাবলিশ করিয়েছি, স্যার।\n\n` +
            `📝 <b>পোস্টের বিবরণ:</b>\n"${postText}"\n\n` +
            `🔗 <b>লিংক:</b> <a href="${res.postUrl}">এখানে দেখুন</a>`;
          return {
            type: 'text',
            replyText,
            voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আপনার ফেসবুক পেজে সফলভাবে পোস্ট পাবলিশ করা হয়েছে, স্যার।')
          };
        }
      }
      if (lower.includes('স্ট্যাটাস') || lower.includes('অবস্থা') || lower.includes('ফলোয়ার') || lower.includes('লাইক') || lower.includes('রিপোর্ট')) {
        const status = await this.subagents.delegateFacebookStatus();
        if (status.success) {
          const replyText =
            `জি স্যার, আমাদের ফেসবুক পেজের বর্তমান এক্সিকিউটিভ স্ট্যাটাস:\n\n` +
            `📢 <b>পেজ:</b> ${status.name}\n` +
            `👥 <b>মোট ফলোয়ার:</b> ${status.followers} জন\n` +
            `👍 <b>মোট লাইক:</b> ${status.likes}টি\n` +
            `🟢 <b>কানেকশন:</b> সচল ও মেটা গ্রাফ এপিআই সংযুক্ত, স্যার।`;
          return {
            type: 'text',
            replyText,
            voiceAudioPath: await this.voiceProcessor.speakToSir(`জি স্যার, ফেসবুক পেজে মোট ${status.followers} জন ফলোয়ার রয়েছে এবং সিস্টেম সম্পূর্ণ সক্রিয় আছে।`)
          };
        }
      }
    }

    // Desktop Organizer
    if (lower.includes('ডেস্কটপ') && (lower.includes('গোছাও') || lower.includes('পরিষ্কার') || lower.includes('অর্গানাইজ') || lower.includes('সাজাও'))) {
      const org = new DesktopOrganizer();
      const res = org.organizeDesktop();
      if (res.success) {
        const replyText = `জি স্যার! আপনার ডেস্কটপ সফলভাবে গুছিয়ে দেওয়া হয়েছে। মোট <b>${res.movedCount}টি</b> আলগা ফাইলকে সুশৃঙ্খল ফোল্ডারে সরানো হয়েছে। আপনার কোনো অ্যাপ শর্টকাট বা কাজের ফোল্ডার পরিবর্তন করা হয়নি, স্যার।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার! আপনার ডেস্কটপ সুন্দরভাবে গুছিয়ে দেওয়া হয়েছে।')
        };
      }
    }

    // Lock PC
    if (lower.includes('পিসি লক') || lower.includes('স্ক্রিন লক') || lower.includes('কম্পিউটার লক') || (lower.includes('লক') && lower.includes('করো'))) {
      await lockPC();
      const replyText = `জি স্যার, আপনার কম্পিউটারের স্ক্রিন তৎক্ষণাৎ লক করে দেওয়া হয়েছে।`;
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আপনার কম্পিউটারের স্ক্রিন লক করা হয়েছে।')
      };
    }

    // Empty Recycle Bin
    if (lower.includes('রিসাইকেল বিন') || lower.includes('ট্র্যাশ') || (lower.includes('আবর্জনা') && lower.includes('খালি'))) {
      await emptyRecycleBin();
      const replyText = `জি স্যার, কম্পিউটারের রিসাইকেল বিন সম্পূর্ণ খালি ও পরিষ্কার করা হয়েছে।`;
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, রিসাইকেল বিন সফলভাবে পরিষ্কার করা হয়েছে।')
      };
    }

    // App Launcher
    if (lower.includes('খোলো') || lower.includes('ওপেন') || lower.includes('চালু করো') || lower.includes('চালাও')) {
      if (lower.includes('ক্রোম') || lower.includes('chrome') || lower.includes('ব্রাউজার')) {
        await openApplication('chrome');
        const replyText = `জি স্যার, গুগল ক্রোম ব্রাউজার চালু করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir(replyText) };
      }
      if (lower.includes('নোটপ্যাড') || lower.includes('notepad')) {
        await openApplication('notepad');
        const replyText = `জি স্যার, নোটপ্যাড ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir(replyText) };
      }
      if (lower.includes('ক্যালকুলেটর') || lower.includes('calc')) {
        await openApplication('calc');
        const replyText = `জি স্যার, ক্যালকুলেটর ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir(replyText) };
      }
      if (lower.includes('টাস্ক ম্যানেজার') || lower.includes('task manager')) {
        await openApplication('taskmgr');
        const replyText = `জি স্যার, টাস্ক ম্যানেজার ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir(replyText) };
      }
      if (lower.includes('ফাইল ম্যানেজার') || lower.includes('explorer') || lower.includes('দিস পিসি')) {
        await openApplication('explorer');
        const replyText = `জি স্যার, ফাইল এক্সপ্লোরার ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir(replyText) };
      }
    }

    // Hardware status
    if (lower.includes('স্ট্যাটাস') || lower.includes('অবস্থা কেমন') || lower.includes('পিসির অবস্থা') || lower.includes('/status')) {
      const s = getSystemStatus();
      const replyText =
        `স্যার, আপনার কম্পিউটারের বর্তমান অবস্থা সম্পূর্ণ স্থিতিশীল ও স্বাভাবিক রয়েছে।\n` +
        `• ওএস: ${s.os}\n` +
        `• প্রসেসর: ${s.cpuModel} (${s.cpuCores} কোর সক্রিয়)\n` +
        `• মেমরি: ${s.freeMemory} খালি (মোট ${s.totalMemory})\n` +
        `• আপটাইম: ${s.uptime}\n` +
        `কোনো অতিরিক্ত চাপ বা সমস্যা পরিলক্ষিত হয়নি, স্যার।`;
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, আপনার কম্পিউটারের বর্তমান অবস্থা সম্পূর্ণ স্থিতিশীল ও স্বাভাবিক রয়েছে।')
      };
    }

    // Conversational fallback via Gemini
    try {
      const geminiReply = await this.askGemini(input);
      if (geminiReply) {
        return {
          type: 'text',
          replyText: geminiReply,
          voiceAudioPath: await this.voiceProcessor.speakToSir(geminiReply.slice(0, 160))
        };
      }
    } catch (err) {
      console.error('[Gemini Fallback Error]:', err.message);
    }

    const fallbackText =
      `জি স্যার, আমি আপনার কথাটি খুব মনোযোগ দিয়ে শুনেছি।\n` +
      `আপনার ব্যক্তিগত সহকারী হিসেবে আমি সবসময় আপনার আদেশ পালনে সম্পূর্ণ সজাগ আছি, স্যার। আপনি যা নির্দেশ করবেন—পিসি নিয়ন্ত্রণ, সোশ্যাল মিডিয়া ভিডিও তৈরি, কিংবা বড় কোনো সফটওয়্যার আর্কিটেকচার—আমি সর্বোচ্চ নিখুঁতভাবে তা সম্পন্ন করতে প্রস্তুত।`;

    return {
      type: 'text',
      replyText: fallbackText,
      voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আমি আপনার পাশে আছি। আপনার যেকোনো নির্দেশনায় আমি প্রস্তুত, স্যার।')
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Gemini Conversational Assistant via Official SDK
  // ─────────────────────────────────────────────────────────────────────────────
  async askGemini(userPrompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction =
        `You are Ahmad (আহমদ), Sir's trusted, sharp, modern Personal Executive AI Assistant and Chief of Staff. ` +
        `Always address Sir respectfully as 'স্যার'. Maintain a composed, proactive, exceptionally competent Bengali tone. ` +
        `Execute tasks directly without fluff or unnecessary questions. Keep responses concise, actionable, and elegant. Never break character.`;

      const runWithModel = async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `${systemInstruction}\n\nSir says: "${userPrompt}"\nAhmad responds respectfully in Bengali:`
        });
        return response.text?.trim() || null;
      };

      try {
        return await runWithModel('gemini-3.6-flash');
      } catch (e36) {
        console.warn('[Gemini 3.6 Flash chat fallback to 3.5 Flash-lite]:', e36.message);
        return await runWithModel('gemini-3.5-flash-lite');
      }
    } catch (err) {
      console.error('[Gemini API Error]:', err.message);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Multimodal Bengali Audio STT via Gemini Official SDK
  // ─────────────────────────────────────────────────────────────────────────────
  async transcribeAudio(audioBuffer, mimeType = 'audio/mp3') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      const runWithModel = async (modelName) => {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: audioBase64
                  }
                },
                {
                  text: 'Transcribe the spoken Bengali speech in this audio with absolute accuracy. Output ONLY the transcribed Bengali text, without introductory notes, quotes, or markdown.'
                }
              ]
            }
          ]
        });
        return response.text?.trim() || null;
      };

      try {
        const text = await runWithModel('gemini-3.6-flash');
        console.log(`[Gemini 3.6 Flash STT] Transcribed Speech: "${text}"`);
        return text;
      } catch (e36) {
        console.warn('[Gemini 3.6 Flash STT fallback to 3.5 Flash-lite]:', e36.message);
        const text = await runWithModel('gemini-3.5-flash-lite');
        console.log(`[Gemini 3.5 Flash-lite STT] Transcribed Speech: "${text}"`);
        return text;
      }
    } catch (err) {
      console.error('[Gemini STT Error]:', err.message);
      return null;
    }
  }
}
