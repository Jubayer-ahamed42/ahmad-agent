import dotenv from 'dotenv';
dotenv.config({ path: 'C:/Personal Agent/Agent 1/.env' });
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ownerId = process.env.TELEGRAM_OWNER_ID;

const msg =
  `🧠 <b>স্যার, আহমদের নিউরাল ব্রেন ও ভয়েস ইঞ্জিন সফলভাবে আপগ্রেড করা হয়েছে!</b>\n\n` +
  `এখন থেকে আপনি টেলিগ্রামে যেভাবেই নির্দেশ দিন না কেন—\n` +
  `• যে কোনো <b>বিকল্প শব্দ</b> বা আঞ্চলিক বাংলা\n` +
  `• যে কোনো <b>বাংলা ভয়েস মেসেজ (Voice Note)</b>\n` +
  `• পরোক্ষ বা ভিন্নভাবে বোঝানো কথা\n\n` +
  `আহমদ জেমিনি ৩.৬ ফ্ল্যাশ এবং ৩.৫ ফ্ল্যাশ-লাইট নিউরাল ইঞ্জিনের মাধ্যমে আপনার মনের ভাব ও উদ্দেশ্যের গভীর অর্থ অনুধাবন করে নিখুঁতভাবে কম্পিউটার ও সোশ্যাল মিডিয়ার কাজগুলো সম্পন্ন করবে, স্যার।\n\n` +
  `<i>উদাহরণস্বরূপ আপনি এখনই চ্যাটে লিখে বা মুখে ভয়েস পাঠিয়ে পরীক্ষা করতে পারেন:</i>\n` +
  `🎙️ <i>"আমার কম্পিউটারটা একটু গুছিয়ে দাও তো"</i>\n` +
  `🎙️ <i>"ব্রাউজারে যাও"</i>\n` +
  `🎙️ <i>"স্ক্রিনটা একটু দেখাও তো"</i>\n` +
  `🎙️ <i>"পিসির সব আবর্জনা ফেলে দাও"</i>\n\n` +
  `আপনার সেবায় সবসময় প্রস্তুত আছি, স্যার!`;

async function main() {
  await bot.telegram.sendMessage(ownerId, msg, { parse_mode: 'HTML' });
  console.log('Telegram notification delivered to Sir successfully!');
}

main().catch(console.error);
