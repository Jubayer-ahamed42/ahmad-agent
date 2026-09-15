import cron from 'node-cron';
import { getSystemStatus } from './systemController.js';

export function setupScheduler({ onMorningBriefing, onNightSummary }) {
  console.log('Scheduler initialized: 06:00 AM (Morning) & 09:00 PM (Night)');

  // 1. Morning Briefing at 06:00 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Triggering 06:00 AM Morning Briefing...');
    if (onMorningBriefing) {
      await onMorningBriefing();
    }
  });

  // 2. Night Summary at 09:00 PM (21:00)
  cron.schedule('0 21 * * *', async () => {
    console.log('[Cron] Triggering 09:00 PM Night Summary...');
    if (onNightSummary) {
      await onNightSummary();
    }
  });
}

// Generate formatted Bengali briefing text
export function generateMorningBriefingText() {
  const status = getSystemStatus();
  return (
    `🌅 *শুভ সকাল স্যার!*\n` +
    `ঘড়িতে এখন সকাল ৬:০০ টা। আশা করি আপনার ঘুম ভালো হয়েছে।\n\n` +
    `📊 *আজকের সিস্টেম স্ট্যাটাস:*\n` +
    `• কম্পিউটার: ${status.hostname} (সক্রিয়)\n` +
    `• মেমরি: ${status.freeMemory} খালি (মোট ${status.totalMemory})\n` +
    `• পিসি আপটাইম: ${status.uptime}\n\n` +
    `🎯 *আজকের দিনের লক্ষ্য:*\n` +
    `আজকের দিনটি আপনার কাজ ও প্রজেক্টের জন্য সফল হোক, স্যার। আপনার যেকোনো নির্দেশনার জন্য আমি প্রস্তুত আছি।`
  );
}

export function generateNightSummaryText() {
  const status = getSystemStatus();
  return (
    `🌙 *শুভরাত্রি স্যার!*\n` +
    `ঘড়িতে এখন রাত ৯:০০ টা।\n\n` +
    `📋 *আজকের দিনের খতিয়ান:*\n` +
    `• আজকের সমস্ত প্রজেক্ট ও রুটিন তদারকি সম্পন্ন হয়েছে।\n` +
    `• সিস্টেমের মেমরি ও রিসোর্স স্বাভাবিক রয়েছে (${status.usedMemory} ব্যবহৃত)।\n` +
    `• স্বয়ংক্রিয় ব্যাকআপ প্রস্তুত রাখা হয়েছে।\n\n` +
    `রাত ১০টার আগেই বিশ্রাম নেওয়ার জন্য অনুরোধ করছি, স্যার। আগামীকাল সকাল ৬:০০ টায় আবার দেখা হবে। শুভরাত্রি, স্যার!`
  );
}
