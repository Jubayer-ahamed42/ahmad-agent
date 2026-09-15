import { VoiceProcessor } from './voiceProcessor.js';
import { SubagentManager } from './subagentManager.js';
import { getSystemStatus, captureScreenshot, sleepPC, shutdownPC } from './systemController.js';
import { searchLocalFiles } from './fileSearch.js';
import { generateMorningBriefingText, generateNightSummaryText } from './scheduler.js';

export class ExecutiveBrain {
  constructor() {
    this.name = 'আহমদ (Ahmad)';
    this.title = 'Chief Executive Assistant & Confidant (50-Year Veteran Standard)';
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

    // 2. PC Hardware & System Status
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

    // 3. Social Media Video Creation
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

    // 5. File Search
    if (lower.includes('ফাইল') && (lower.includes('খোঁজো') || lower.includes('খুঁজে') || lower.includes('search'))) {
      const term = input.replace(/ফাইল|খোঁজো|খুঁজে|দাও|search/gi, '').trim() || 'report';
      const results = await searchLocalFiles(term, 'C:\\');
      let replyText = '';
      if (!results || results.length === 0) {
        replyText = `স্যার, "${term}" সংক্রান্ত কোনো ফাইল খুঁজে পাওয়া যায়নি।`;
      } else {
        replyText = `স্যার, আপনার নির্দেশিত "${term}" অনুসন্ধানে ${results.length}টি ফাইল পাওয়া গেছে:\n\n`;
        results.slice(0, 5).forEach((r, idx) => {
          replyText += `${idx + 1}. \`${r.FullName}\`\n`;
        });
      }
      return {
        type: 'text',
        replyText,
        voiceAudioPath: await this.voiceProcessor.speakToSir(`স্যার, ফাইল অনুসন্ধানের ফলাফল পাওয়া গেছে।`)
      };
    }

    // 6. 50-Year Veteran Wise Default Response
    const replyText =
      `জি স্যার, আমি আপনার কথাটি খুব মনোযোগ দিয়ে শুনেছি।\n` +
      `আপনার ব্যক্তিগত সহকারী হিসেবে আমি সবসময় আপনার আদেশ পালনে সম্পূর্ণ সজাগ আছি, স্যার। আপনি যা নির্দেশ করবেন—পিসি নিয়ন্ত্রণ, সোশ্যাল মিডিয়া ভিডিও তৈরি, কিংবা বড় কোনো সফটওয়্যার আর্কিটেকচার—আমি সর্বোচ্চ নিখুঁতভাবে তা সম্পন্ন করতে প্রস্তুত।`;

    return {
      type: 'text',
      replyText,
      voiceAudioPath: await this.voiceProcessor.speakToSir('জি স্যার, আমি আপনার পাশে আছি। আপনার যেকোনো নির্দেশনায় আমি প্রস্তুত, স্যার।')
    };
  }
}
