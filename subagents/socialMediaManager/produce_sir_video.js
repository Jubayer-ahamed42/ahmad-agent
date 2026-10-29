import { EdgeTTS } from 'node-edge-tts';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const DIR = process.env.OUTPUT_DIR || path.join(__dirname, 'output');
const photoPath = path.join(DIR, 'sir_profile.jpg');
const voicePath = path.join(DIR, 'voice_ai_pros_cons.mp3');
const finalVideoPath = path.join(DIR, 'ai_advantages_disadvantages_1min.mp4');

// High-quality Bengali Script for Sir
const scriptText = 
  'আসসালামু আলাইকুম। Be Smart With AI-এর পক্ষ থেকে আমি আপনাদের সাথে আছি। ' +
  'আজকের বিশ্বে কৃত্রিম বুদ্ধিমত্তা বা এআই আমাদের কাজের গতি ও জীবনযাত্রাকে পুরোপুরি বদলে দিচ্ছে। ' +
  'এর সবচেয়ে বড় সুবিধা হলো অভাবনীয় গতি ও উৎপাদনশীলতা। জটিল গবেষণা বিশ্লেষণ, কনটেন্ট তৈরি এবং ' +
  'পুনরাবৃত্তিমূলক কাজ কয়েক সেকেন্ডে করতে এআই অতুলনীয়। ' +
  'তবে এর কিছু উল্লেখযোগ্য অসুবিধাও রয়েছে। অন্ধভাবে এআই-এর তথ্যের ওপর নির্ভর করলে নিজস্ব ' +
  'সৃজনশীলতা ও বিশ্লেষণ ক্ষমতা হ্রাস পেতে পারে। তাছাড়া তথ্যের সত্যতা যাচাই না করলে ভুল সিদ্ধান্তের ' +
  'আশঙ্কা থাকে। তাই মনে রাখবেন, এআই মানুষের বিকল্প নয়—এআই হলো আপনার মেধার এক শক্তিশালী সহযোগী। ' +
  'প্রযুক্তিকে সচেতনভাবে ব্যবহার করুন, স্মার্ট থাকুন। ধন্যবাদ।';

async function main() {
  console.log('--- Step 1: Generating Neural Voiceover ---');
  const tts = new EdgeTTS({
    voice: 'bn-BD-PradeepNeural',
    lang: 'bn-BD',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
  });

  await tts.ttsPromise(scriptText, voicePath);
  console.log(`Voiceover saved: ${voicePath}`);

  // Check audio duration
  const { stdout: durStr } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voicePath}"`);
  const audioDuration = parseFloat(durStr.trim());
  console.log(`Audio Duration: ${audioDuration.toFixed(2)}s`);

  const videoDuration = Math.ceil(audioDuration + 1.5);
  console.log(`Target Video Duration: ${videoDuration}s (Strictly <= 60s)`);

  console.log('--- Step 2: Rendering Professional 9:16 Vertical Video with FFmpeg ---');

  const fontPath = 'C\\:/Windows/Fonts/Nirmala.ttc';

  const filterComplex = [
    // Background blur
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.18:contrast=1.1[bg]`,
    // Foreground portrait with neat border
    `[0:v]scale=880:1174,pad=892:1186:6:6:color=white@0.4[fg]`,
    // Overlay portrait on blurred bg
    `[bg][fg]overlay=(W-w)/2:350[comp1]`,
    // Top header card overlay
    `[comp1]drawbox=x=80:y=120:w=920:h=180:color=black@0.65:t=fill[card1]`,
    // Top badge: BE SMART WITH AI
    `[card1]drawtext=fontfile='${fontPath}':text='BE SMART WITH AI':fontcolor=0x38bdf8:fontsize=38:x=(w-text_w)/2:y=150:shadowcolor=black@0.8:shadowx=2:shadowy=2[t1]`,
    // Bengali Title: এআই ব্যবহারের সুবিধা ও অসুবিধা
    `[t1]drawtext=fontfile='${fontPath}':text='এআই ব্যবহারের সুবিধা ও অসুবিধা':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=215:shadowcolor=black@0.8:shadowx=2:shadowy=2[t2]`,
    // Bottom banner card overlay
    `[t2]drawbox=x=80:y=1570:w=920:h=210:color=black@0.7:t=fill[card2]`,
    // Bottom line 1: সঠিক ও সচেতন ব্যবহারই আনবে সাফল্য
    `[card2]drawtext=fontfile='${fontPath}':text='সচেতন ও সঠিক ব্যবহারই আনবে সাফল্য':fontcolor=0xfacc15:fontsize=42:x=(w-text_w)/2:y=1615:shadowcolor=black@0.8:shadowx=2:shadowy=2[t3]`,
    // Bottom line 2: Facebook Page - Be Smart With AI
    `[t3]drawtext=fontfile='${fontPath}':text='Facebook Page - Be Smart With AI':fontcolor=0xe2e8f0:fontsize=34:x=(w-text_w)/2:y=1690:shadowcolor=black@0.8:shadowx=2:shadowy=2[vout]`
  ].join(';');

  const ffmpegCmd = `ffmpeg -y -loop 1 -framerate 25 -t ${videoDuration} -i "${photoPath}" -i "${voicePath}" -filter_complex "${filterComplex}" -map "[vout]" -map 1:a -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${finalVideoPath}"`;

  console.log('Running FFmpeg rendering process...');
  await execAsync(ffmpegCmd);
  console.log(`Video rendered successfully: ${finalVideoPath}`);

  // Final check on video metadata
  const { stdout: vDurStr } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalVideoPath}"`);
  console.log(`Final Video Duration: ${parseFloat(vDurStr.trim()).toFixed(2)}s`);
}

main().catch(err => {
  console.error('Video production error:', err);
});
