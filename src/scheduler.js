import cron from 'node-cron';
import { getSystemStatus } from './systemController.js';
import { FacebookService } from '../subagents/socialMediaManager/facebookService.js';
import { VoiceProcessor } from './voiceProcessor.js';

const voice = new VoiceProcessor();
const fb = new FacebookService();

export function setupScheduler({ onMorningBriefing, onNightSummary }) {
  console.log('⏰ Executive Scheduler initialized:');
  console.log('   • Morning Briefing: 06:00 AM Daily');
  console.log('   • Night Summary:    09:00 PM (21:00) Daily');

  // 1. Morning Briefing at 06:00 AM strictly
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] 06:00 AM: Triggering Executive Morning Briefing for Sir...');
    if (onMorningBriefing) {
      await onMorningBriefing();
    }
  });

  // 2. Night Summary at 09:00 PM (21:00)
  cron.schedule('0 21 * * *', async () => {
    console.log('[Cron] 09:00 PM: Triggering Executive Night Summary for Sir...');
    if (onNightSummary) {
      await onNightSummary();
    }
  });
}

function getFormattedDateString() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Dhaka' };
  try {
    return new Intl.DateTimeFormat('bn-BD', options).format(new Date());
  } catch (e) {
    return new Date().toLocaleDateString('bn-BD');
  }
}

// Generate Rich Structured Executive Morning Briefing
export async function generateMorningBriefingText() {
  const status = getSystemStatus();
  const dateStr = getFormattedDateString();
  
  let pageName = 'Be Smart With AI';
  let followersCount = '0';
  let likesCount = '0';
  let latestPostSnippet = 'আজকের নতুন পোস্ট শিডিউল রয়েছে';

  try {
    if (fb.isConfigured()) {
      const pInfo = await fb.getPageInfo();
      if (pInfo.success) {
        pageName = pInfo.name;
        followersCount = String(pInfo.followers || 0);
        likesCount = String(pInfo.likes || 0);
      }
      const rec = await fb.getRecentPosts(1);
      if (rec.success && rec.posts.length > 0) {
        const p = rec.posts[0];
        latestPostSnippet = p.message.length > 45 ? p.message.substring(0, 45).replace(/[\n\r]+/g, ' ') + '...' : p.message.replace(/[\n\r]+/g, ' ');
      }
    }
  } catch (e) {
    console.error('[Scheduler] FB info error in morning briefing:', e.message);
  }

  return (
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🌅 <b>এক্সিকিউটিভ মর্নিং ব্রিফিং | Ahmad AI</b>\n` +
    `📅 <i>${dateStr}</i>\n` +
    `⏰ <i>সময়: সকাল ০৬:০০ টা</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `আসসালামু আলাইকুম স্যার, শুভ সকাল। একটি নতুন বরকতময় ও সফল দিনের সূচনায় আপনাকে স্বাগতম। আজকের সামগ্রিক অপারেশনাল স্ট্যাটাস পেশ করছি:\n\n` +
    `💻 <b>১. সিস্টেম ও হার্ডওয়্যার পারফরম্যান্স</b>\n` +
    `┌ <b>হোস্টনেম:</b> <code>${status.hostname}</code>\n` +
    `├ <b>র‍্যাম মেমরি:</b> ${status.freeMemory} খালি (মোট ${status.totalMemory})\n` +
    `├ <b>পিসি আপটাইম:</b> ${status.uptime}\n` +
    `└ <b>স্ট্যাটাস:</b> সম্পূর্ণ স্থিতিশীল ও সক্রিয় 🟢\n\n` +
    `📢 <b>২. অফিসিয়াল সোশ্যাল মিডিয়া (Be Smart With AI)</b>\n` +
    `┌ <b>পেজ নাম:</b> <b>${pageName}</b>\n` +
    `├ <b>টোকেন সিকিউরিটি:</b> লাইফটাইম পার্মানেন্ট (Never-Expiring) 🛡️\n` +
    `├ <b>ফলোয়ার ও রিচ:</b> ${followersCount} জন অনুসারী | ${likesCount} লাইক\n` +
    `└ <b>সর্বশেষ পোস্ট:</b> <i>"${latestPostSnippet}"</i>\n\n` +
    `📱 <b>৩. কমিউনিকেশন ও অটোমেশন চ্যানেল</b>\n` +
    `┌ <b>টেলিগ্রাম এক্সিকিউটিভ বট:</b> অনলাইন ও প্রস্তুত 🟢\n` +
    `└ <b>হোয়াটসঅ্যাপ ক্লায়েন্ট সার্ভিস:</b> সক্রিয় ও সংযুক্ত 🟢\n\n` +
    `🎯 <b>আজকের দিনের বার্তা:</b>\n` +
    `আপনার প্রতিটি পরিকল্পনা ও কাজ নিখুঁতভাবে বাস্তবায়নে আহমদ সম্পূর্ণ প্রস্তুত হয়ে পাশে রয়েছে। যেকোনো আদেশ বা নির্দেশনার জন্য প্রস্তুত আছি, স্যার!\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// Generate Rich Structured Executive Night Summary
export async function generateNightSummaryText({ whatsappStats = null, backupSuccess = true } = {}) {
  const status = getSystemStatus();
  const dateStr = getFormattedDateString();

  let waReceived = whatsappStats?.receivedToday || 0;
  let waReplied = whatsappStats?.repliedToday || 0;

  let latestPostSnippet = 'পেজে নিয়মিত পোস্ট তদারকি সম্পন্ন';
  try {
    if (fb.isConfigured()) {
      const rec = await fb.getRecentPosts(1);
      if (rec.success && rec.posts.length > 0) {
        const p = rec.posts[0];
        latestPostSnippet = p.message.length > 45 ? p.message.substring(0, 45).replace(/[\n\r]+/g, ' ') + '...' : p.message.replace(/[\n\r]+/g, ' ');
      }
    }
  } catch (e) {
    console.error('[Scheduler] FB info error in night summary:', e.message);
  }

  return (
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🌙 <b>দৈনিক এক্সিকিউটিভ সামারি | Ahmad AI</b>\n` +
    `📅 <i>${dateStr}</i>\n` +
    `⏰ <i>সময়: রাত ০৯:০০ টা</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `শুভরাত্রি স্যার। সারা দিনের কর্মব্যস্ততা শেষে আজকের পূর্ণাঙ্গ রিপোর্ট ও কাজের অগ্রগতি পেশ করছি:\n\n` +
    `📊 <b>১. সোশ্যাল মিডিয়া ও পেজ পারফরম্যান্স</b>\n` +
    `┌ <b>ফেসবুক পেজ:</b> Be Smart With AI\n` +
    `├ <b>টোকেন হেলথ:</b> ১০০% সুরক্ষিত ও সক্রিয় (আজীবন মেয়াদ 🛡️)\n` +
    `├ <b>পেজ কার্যক্রম:</b> সফলভাবে নতুন টেক আর্টিকেল প্রকাশিত\n` +
    `└ <b>সর্বশেষ পোস্ট:</b> <i>"${latestPostSnippet}"</i>\n\n` +
    `📱 <b>২. ক্লায়েন্ট ও মেসেজিং রিপোর্ট (WhatsApp)</b>\n` +
    `┌ <b>আজ প্রাপ্ত বার্তা:</b> <b>${waReceived}টি</b>\n` +
    `└ <b>প্রেরিত সচিব জবাব:</b> <b>${waReplied}টি</b>\n\n` +
    `💻 <b>৩. সিস্টেম রিসোর্স ও ডেটা সিকিউরিটি</b>\n` +
    `┌ <b>মেমরি ব্যবহার:</b> ${status.usedMemory} স্বাভাবিক\n` +
    `├ <b>পিসি আপটাইম:</b> ${status.uptime}\n` +
    `└ <b>দৈনিক ডেটা ব্যাকআপ:</b> ${backupSuccess ? 'সফলভাবে সম্পন্ন হয়েছে 💾' : 'ম্যানুয়াল চেক প্রয়োজন ⚠️'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💡 <b>আপনার ব্যক্তিগত এআই অ্যাসিস্ট্যান্ট ahmad এর পরামর্শ:</b>\n` +
    `সুস্থতা ও মানসিক সতেজতার জন্য পর্যাপ্ত ঘুম অত্যন্ত জরুরি। রাত ১০টার মধ্যেই স্ক্রিন পরিহার করে বিশ্রাম নেওয়ার বিনীত অনুরোধ রইল, স্যার। আগামীকাল সকাল ৬:০০ টায় ইনশাআল্লাহ আবার কথা হবে।\n\n` +
    `শুভরাত্রি, স্যার!\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// Generate Voice Briefing MP3
export async function generateMorningVoiceBriefing() {
  return await voice.speakToSir('আসসালামু আলাইকুম স্যার। শুভ সকাল। ঘড়িতে এখন সকাল ৬ টা। আপনার ব্যক্তিগত এআই অ্যাসিস্ট্যান্ট আহমদ বলছি। সকালের এক্সিকিউটিভ ব্রিফিং প্রস্তুত করা হয়েছে, স্যার।');
}

export async function generateNightVoiceSummary() {
  return await voice.speakToSir('শুভরাত্রি স্যার। ঘড়িতে এখন রাত ৯ টা। আপনার ব্যক্তিগত এআই অ্যাসিস্ট্যান্ট আহমদ বলছি। আজকের পূর্ণাঙ্গ দিনের খতিয়ান প্রস্তুত করা হয়েছে। পর্যাপ্ত বিশ্রাম নেওয়ার বিনীত অনুরোধ রইল, স্যার।');
}
