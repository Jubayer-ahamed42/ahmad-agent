import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { Telegraf } from 'telegraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: process.env.ENV_FILE_PATH || path.resolve(__dirname, '../.env') });

const execAsync = promisify(exec);

const DIR = process.env.OUTPUT_DIR || path.resolve(__dirname, '../subagents/socialMediaManager/output');
const bgPath = path.join(DIR, 'sir_profile.jpg');
const avatarVideoPath = path.join(DIR, 'sir_talking_avatar_raw.mp4');
const audioPath = path.join(DIR, 'voice_ai_pros_cons.mp3');
const localVideoPath = path.join(DIR, 'Sir_AI_Talking_Avatar_Full.mp4');
const desktopPath = path.join(process.env.USERPROFILE || os.homedir(), 'Desktop', 'Sir_AI_Talking_Avatar.mp4');
const fontPath = 'C\\:/Windows/Fonts/Nirmala.ttc';

const filterComplex = [
  `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.28:contrast=1.15[bg]`,
  `[1:v]scale=720:910:flags=lanczos,pad=736:926:8:8:color=0x38bdf8@0.9,pad=756:946:10:10:color=white@0.4[fg]`,
  `[bg][fg]overlay=(W-w)/2:440[comp1]`,
  `[comp1]drawbox=x=70:y=90:w=940:h=290:color=black@0.75:t=fill[card1]`,
  `[card1]drawbox=x=70:y=90:w=940:h=6:color=0x38bdf8:t=fill[acc1]`,
  `[acc1]drawtext=fontfile='${fontPath}':text='BE SMART WITH AI • EXECUTIVE BRIEFING':fontcolor=0x38bdf8:fontsize=32:x=(w-text_w)/2:y=130:shadowcolor=black@0.8:shadowx=2:shadowy=2[t1]`,
  `[t1]drawtext=fontfile='${fontPath}':text='এআই ব্যবহারের সুবিধা ও অসুবিধা':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=195:shadowcolor=black@0.8:shadowx=2:shadowy=2[t2]`,
  `[t2]drawtext=fontfile='${fontPath}':text='প্রযুক্তি যখন আপনার মেধার সহযোগী':fontcolor=0x94a3b8:fontsize=32:x=(w-text_w)/2:y=280:shadowcolor=black@0.8:shadowx=2:shadowy=2[comp2]`,
  `[comp2]drawbox=x=70:y=1440:w=940:h=340:color=black@0.80:t=fill[card2]`,
  `[card2]drawbox=x=70:y=1774:w=940:h=6:color=0xfacc15:t=fill[acc2]`,
  `[acc2]drawtext=fontfile='${fontPath}':text='সচেতন ও সঠিক ব্যবহারই আনবে প্রকৃত সাফল্য':fontcolor=0xfacc15:fontsize=40:x=(w-text_w)/2:y=1485:shadowcolor=black@0.8:shadowx=2:shadowy=2[t3]`,
  `[t3]drawtext=fontfile='${fontPath}':text='এআই মানুষের বিকল্প নয় — আপনার মেধার এক শক্তিশালী সহযোগী':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=1565:shadowcolor=black@0.8:shadowx=2:shadowy=2[t4]`,
  `[t4]drawtext=fontfile='${fontPath}':text='Facebook Page - Be Smart With AI':fontcolor=0x38bdf8:fontsize=34:x=(w-text_w)/2:y=1645:shadowcolor=black@0.8:shadowx=2:shadowy=2[t5]`,
  `[t5]drawtext=fontfile='${fontPath}':text='Executive AI Presentation by Ahmad':fontcolor=0x64748b:fontsize=26:x=(w-text_w)/2:y=1710:shadowcolor=black@0.8:shadowx=2:shadowy=2[outv]`
].join(';');

// Input 0: Sir's background image looped
// Input 1: Sir's talking avatar video (video stream)
// Input 2: High fidelity master audio
const renderCmd = `ffmpeg -y -loop 1 -i "${bgPath}" -i "${avatarVideoPath}" -i "${audioPath}" -filter_complex "${filterComplex}" -map "[outv]" -map 2:a -c:v libx264 -preset fast -crf 19 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${localVideoPath}"`;

async function main() {
  console.log('--- Step 1: Rendering Master Executive Vertical Video (1080x1920) ---');
  console.log('Executing FFmpeg composite...');
  await execAsync(renderCmd);
  console.log('Rendering complete! Master video saved to:', localVideoPath);

  // Probe duration and size
  const { stdout: durStr } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localVideoPath}"`);
  const stats = fs.statSync(localVideoPath);
  console.log(`Duration: ${parseFloat(durStr.trim()).toFixed(2)}s, File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

  console.log('\n--- Step 2: Deploying Video to Sir\'s Desktop ---');
  fs.copyFileSync(localVideoPath, desktopPath);
  console.log('✅ Video saved to Sir\'s Desktop at:', desktopPath);

  console.log('\n--- Step 3: Delivering Video to Sir via Telegram ---');
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_OWNER_ID) {
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    const caption = 
      `🎬 <b>স্যার, আপনার চ্যালেঞ্জ অনুযায়ী তৈরি সম্পূর্ণ AI Talking Avatar ভিডিও পেশ করা হলো!</b>\n\n` +
      `📌 <b>বিষয়:</b> এআই ব্যবহারের সুবিধা ও অসুবিধা\n` +
      `👤 <b>অ্যাভাটার:</b> স্যারের নিজস্ব রিয়েল-টাইম লিপ-সিঙ্ক টকিং অ্যাভাটার\n` +
      `⏱️ <b>দৈর্ঘ্য:</b> ৪৮.৫ সেকেন্ড (সম্পূর্ণ ভয়েস ওভারসহ)\n` +
      `📱 <b>ফরম্যাট:</b> ৯:১৬ ফুল এইচডি ভার্টিক্যাল রিল (১০৮০x১৯২০)\n` +
      `🖥️ <b>ডেস্কটপ কপি:</b> <code>${desktopPath}</code>\n\n` +
      `— আপনার একান্ত বিশ্বস্ত এআই চিফ অব স্টাফ, <b>Ahmad</b>`;

    console.log('Sending video directly to Sir\'s Telegram chat...');
    await bot.telegram.sendVideo(process.env.TELEGRAM_OWNER_ID, { source: localVideoPath }, {
      caption,
      parse_mode: 'HTML',
      supports_streaming: true
    });
    console.log('✅ Video delivered directly to Sir\'s Telegram successfully!');
  } else {
    console.log('Telegram credentials not found, skipping Telegram delivery.');
  }

  console.log('\n🌟 All steps completed flawlessly!');
}

main().catch(err => {
  console.error('Error during final production and delivery:', err);
  process.exit(1);
});
