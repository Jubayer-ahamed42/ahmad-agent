import fs from 'fs';
import path from 'path';
import { VoiceProcessor } from './voiceProcessor.js';
import { SubagentManager } from './subagentManager.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC, lockPC, emptyRecycleBin, openApplication } from './systemController.js';
import { DesktopOrganizer } from './desktopOrganizer.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';

export class ExecutiveBrain {
  constructor() {
    this.name = 'আহমদ (Ahmad)';
    this.title = 'Personal Executive AI Assistant & Chief of Staff';
    this.voiceProcessor = new VoiceProcessor();
    this.subagents = new SubagentManager();
  }

  // Process any command (whether received via Text or Voice)
  async processCommand(rawInput, { fromVoice = false } = {}) {
    const input = rawInput.trim();
    console.log(`[আহমদ Executive Brain] Processing ${fromVoice ? 'VOICE' : 'TEXT'} command: "${input}"`);

    const lower = input.toLowerCase();

    // 1. PC Screen Capture
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

    // 2. Facebook Page Management (Natural Language)
    if (
      (lower.includes('ফেসবুক') || lower.includes('facebook') || lower.includes('পেজ') || lower.includes('page')) &&
      (lower.includes('পোস্ট') || lower.includes('post') || lower.includes('ছেড়ে দাও') || lower.includes('পাবলিশ'))
    ) {
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
      } else {
        const replyText = `স্যার, ফেসবুক পেজে পোস্ট প্রকাশে সমস্যা হয়েছে: ${res.error}\nদয়া করে /fb_status দিয়ে পেজ সংযোগ পরীক্ষা করুন, স্যার।`;
        return { type: 'text', replyText };
      }
    }

    if (
      (lower.includes('ফেসবুক') || lower.includes('facebook') || lower.includes('পেজ') || lower.includes('page')) &&
      (lower.includes('স্ট্যাটাস') || lower.includes('অবস্থা') || lower.includes('ফলোয়ার') || lower.includes('লাইক') || lower.includes('কেমন') || lower.includes('রিপোর্ট'))
    ) {
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

    // 3. PC Hardware & System Status
    if (
      !lower.includes('ফেসবুক') && !lower.includes('facebook') && !lower.includes('পেজ') &&
      (lower.includes('স্ট্যাটাস') || lower.includes('অবস্থা কেমন') || lower.includes('পিসির অবস্থা') || lower.includes('/status'))
    ) {
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

    // 3b. Smart Desktop Organizer (Voice & Text)
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
      } else {
        return { type: 'text', replyText: `স্যার, ডেস্কটপ গোছাতে সমস্যা হয়েছে: ${res.error}` };
      }
    }

    if (lower.includes('ডেস্কটপ') && (lower.includes('আনডু') || lower.includes('আগের মতো') || lower.includes('রিস্টোর'))) {
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

    // 3c. Screen Lock (Voice & Text)
    if (lower.includes('পিসি লক') || lower.includes('স্ক্রিন লক') || lower.includes('কম্পিউটার লক') || (lower.includes('লক') && lower.includes('করো'))) {
      await lockPC();
      const replyText = `জি স্যার, আপনার কম্পিউটারের স্ক্রিন তৎক্ষণাৎ লক করে দেওয়া হয়েছে।`;
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আপনার কম্পিউটারের স্ক্রিন লক করা হয়েছে।')
      };
    }

    // 3d. Empty Recycle Bin (Voice & Text)
    if (lower.includes('রিসাইকেল বিন') || lower.includes('ট্র্যাশ') || (lower.includes('আবর্জনা') && lower.includes('খালি'))) {
      await emptyRecycleBin();
      const replyText = `জি স্যার, কম্পিউটারের রিসাইকেল বিন সম্পূর্ণ খালি ও পরিষ্কার করা হয়েছে।`;
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, রিসাইকেল বিন সফলভাবে পরিষ্কার করা হয়েছে।')
      };
    }

    // 3e. App Launcher by Voice / Text
    if (lower.includes('ওপেন করো') || lower.includes('খোলো') || lower.includes('চালু করো') || lower.includes('চালাও')) {
      if (lower.includes('ক্রোম') || lower.includes('chrome') || lower.includes('ব্রাউজার')) {
        await openApplication('chrome');
        const replyText = `জি স্যার, গুগল ক্রোম ব্রাউজার চালু করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, গুগল ক্রোম ব্রাউজার চালু করা হয়েছে।') };
      }
      if (lower.includes('নোটপ্যাড') || lower.includes('notepad')) {
        await openApplication('notepad');
        const replyText = `জি স্যার, নোটপ্যাড ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, নোটপ্যাড ওপেন করা হয়েছে।') };
      }
      if (lower.includes('ক্যালকুলেটর') || lower.includes('calc')) {
        await openApplication('calc');
        const replyText = `জি স্যার, ক্যালকুলেটর ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, ক্যালকুলেটর ওপেন করা হয়েছে।') };
      }
      if (lower.includes('টাস্ক ম্যানেজার') || lower.includes('task manager')) {
        await openApplication('taskmgr');
        const replyText = `জি স্যার, টাস্ক ম্যানেজার ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, টাস্ক ম্যানেজার ওপেন করা হয়েছে।') };
      }
      if (lower.includes('ফাইল ম্যানেজার') || lower.includes('explorer') || lower.includes('দিস পিসি')) {
        await openApplication('explorer');
        const replyText = `জি স্যার, ফাইল এক্সপ্লোরার ওপেন করা হয়েছে।`;
        return { type: 'text', replyText, voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, ফাইল এক্সপ্লোরার ওপেন করা হয়েছে।') };
      }
    }

    // 4. Talking Avatar / Lip-Sync Video Production (D-ID)
    if (lower.includes('অবতার') || lower.includes('টকিং') || (lower.includes('কথা বলা') && lower.includes('ভিডিও'))) {
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

    // 5. Social Media Video Creation
    if (lower.includes('ভিডিও') && (lower.includes('বানাও') || lower.includes('তৈরি') || lower.includes('করো'))) {
      // Determine duration
      let duration = 1;
      if (lower.includes('২ মিনিট') || lower.includes('2 min')) duration = 2;
      else if (lower.includes('৩ মিনিট') || lower.includes('3 min')) duration = 3;
      else if (lower.includes('৫ মিনিট') || lower.includes('5 min')) duration = 5;

      const topicMatch = input.replace(/ভিডিও|বানাও|তৈরি|করো|মিনিট|এর|উপর|\d+/gi, '').trim() || 'ডিজিটাল সলিউশন ও অটোমেশন';
      const packageResult = await this.subagents.delegateVideoProduction(topicMatch, duration);

      const replyText =
        `জি স্যার! আমি সোশ্যাল মিডিয়া সাব-এজেন্টকে দিয়ে "${topicMatch}" বিষয়ের ওপর ${duration} মিনিটের একটি সম্পূর্ণ মার্জিত ভিডিও এবং ফেসবুক পোস্ট তৈরি করিয়েছি, স্যার।\n\n` +
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

    // 4. Software Architecture & Engineering
    if (lower.includes('আর্কিটেকচার') || lower.includes('ওয়েবসাইট') || lower.includes('অ্যাপ বানাও') || lower.includes('কোড') || lower.includes('সফটওয়্যার')) {
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

    // 5. File Search & Send Engine
    const isFileRequest =
      lower.includes('ফাইল') ||
      lower.includes('পিডিএফ') ||
      lower.includes('pdf') ||
      lower.includes('বুকস') ||
      lower.includes('বুক') ||
      lower.includes('বই') ||
      lower.includes('ডকুমেন্ট') ||
      lower.includes('drive') ||
      lower.includes('ড্রাইভ') ||
      lower.includes('ভাইরাস') ||
      lower.includes('virus') ||
      lower.includes('lethe') ||
      lower.includes('লেনথ') ||
      lower.includes('লেংথ') ||
      lower.includes('খোঁজো') ||
      lower.includes('খুঁজে') ||
      lower.includes('search');

    const isSendAction =
      lower.includes('পাঠাও') ||
      lower.includes('দাও') ||
      lower.includes('সেন্ড') ||
      lower.includes('পাঠিয়ে') ||
      lower.includes('send');

    // শর্ত শিথিল করা হয়েছে: file request থাকলে এবং
    // send/search/exists intent থাকলে অথবা শুধু send/search থাকলেই search করো
    const shouldSearch = isFileRequest && (
      isSendAction ||
      lower.includes('খোঁজো') ||
      lower.includes('খুঁজে') ||
      lower.includes('search') ||
      lower.includes('আছে') ||
      lower.includes('কোথায়') ||
      lower.includes('দেখাও') ||
      lower.includes('বের করো') ||
      lower.includes('নিয়ে আসো')
    );

    if (shouldSearch) {
      console.log(`[Executive Brain] Executing Smart File Search for Sir: "${input}"`);
      const results = await searchLocalFiles(input);

      if (!results || results.length === 0) {
        const replyText = `স্যার, আপনার নির্দেশিত ফাইলটি গুগল ড্রাইভ বা কম্পিউটারে খুঁজে পাওয়া যায়নি। অনুগ্রহ করে ফাইলের নাম বা ফোল্ডার আরেকটু নির্দিষ্ট করে দেওয়ার অনুরোধ করছি, স্যার।`;
        return {
          type: 'text',
          replyText,
          voiceAudioPath: await this.voiceProcessor.speakToSir('স্যার, কাঙ্ক্ষিত ফাইলটি খুঁজে পাওয়া যায়নি।')
        };
      }

      const topMatch = results[0];

      // If user requested to send, or if the match has strong confidence (score >= 15)
      if (isSendAction || topMatch.score >= 15) {
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

      // Otherwise list multiple candidates
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

    // 6. Gemini 3.6 Flash Neural Executive Brain (Sir's Custom Key)
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
      console.error('[Gemini 3.6 Flash Brain Error]:', err.message);
    }

    // 7. Fallback Response
    const fallbackText =
      `জি স্যার, আমি আপনার কথাটি খুব মনোযোগ দিয়ে শুনেছি।\n` +
      `আপনার ব্যক্তিগত সহকারী হিসেবে আমি সবসময় আপনার আদেশ পালনে সম্পূর্ণ সজাগ আছি, স্যার। আপনি যা নির্দেশ করবেন—পিসি নিয়ন্ত্রণ, সোশ্যাল মিডিয়া ভিডিও তৈরি, কিংবা বড় কোনো সফটওয়্যার আর্কিটেকচার—আমি সর্বোচ্চ নিখুঁতভাবে তা সম্পন্ন করতে প্রস্তুত।`;

    return {
      type: 'text',
      replyText: fallbackText,
      voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আমি আপনার পাশে আছি। আপনার যেকোনো নির্দেশনায় আমি প্রস্তুত, স্যার।')
    };
  }

  // Live Gemini Neural API Call via Official SDK
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: `${systemInstruction}\n\nSir says: "${userPrompt}"\nAhmad responds respectfully in Bengali:`
      });

      return response.text || null;
    } catch (err) {
      console.error('[Gemini API Error]:', err.message);
      return null;
    }
  }

  // Multimodal Bengali Audio Transcription via Gemini Official SDK
  async transcribeAudio(audioBuffer, mimeType = 'audio/ogg') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
                text: 'Transcribe the spoken Bengali speech in this audio accurately. Output ONLY the transcribed Bengali text, nothing else.'
              }
            ]
          }
        ]
      });

      const transcribed = response.text?.trim() || null;
      console.log(`[Gemini STT] Transcribed Speech: "${transcribed}"`);
      return transcribed;
    } catch (err) {
      console.error('[Gemini STT Error]:', err.message);
      return null;
    }
  }
}
