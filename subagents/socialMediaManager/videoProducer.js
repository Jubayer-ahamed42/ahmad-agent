import { EdgeTTS } from 'node-edge-tts';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DidService } from './didService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output');

export class VideoProducer {
  constructor(outputDir = process.env.VIDEO_OUTPUT_DIR || DEFAULT_OUTPUT_DIR) {
    this.outputDir = outputDir;
    this.didService = new DidService();
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Generate Script & Storyboard based on duration (1, 2, 3, or 5 minutes)
  generateScriptAndStoryboard(topic, durationMinutes = 1) {
    const wordTarget = durationMinutes * 130;
    const sceneCount = durationMinutes * 3;

    // Structured Bengali script blueprint
    let script = {
      topic,
      duration: `${durationMinutes} Minute(s)`,
      targetWords: wordTarget,
      aspectRatio: durationMinutes <= 2 ? '9:16 (Vertical Reel/Short)' : '16:9 (Landscape HD)',
      scenes: [],
      fullNarrationText: '',
      facebookPostText: ''
    };

    if (durationMinutes === 1) {
      script.scenes = [
        {
          sceneNumber: 1,
          timing: '00:00 - 00:15',
          visualPrompt: `High energy cinematic intro showing modern digital transformation for ${topic}. Dynamic text overlay.`,
          narration: `আসসালামু আলাইকুম! আপনি কি জানেন কীভাবে ${topic} আপনার ব্যবসা ও ক্যারিয়ারকে সম্পূর্ণ বদলে দিতে পারে?`
        },
        {
          sceneNumber: 2,
          timing: '00:15 - 00:40',
          visualPrompt: `Close-up screen recording of automated tools, clean workflow dashboard and speed metrics.`,
          narration: `সাধারণত এই কাজগুলো করতে ঘণ্টার পর ঘণ্টা সময় নষ্ট হয়। কিন্তু আধুনিক অটোমেশন ও স্মার্ট সমাধানের মাধ্যমে এটি এখন চোখের পলকেই সম্পন্ন করা সম্ভব!`
        },
        {
          sceneNumber: 3,
          timing: '00:40 - 01:00',
          visualPrompt: `Professional branding outro with logo, website URL, and WhatsApp contact button.`,
          narration: `নিজের কাজের গতি ১০ গুণ বাড়াতে আজই আমাদের পেজের ইনবক্সে নক দিন অথবা কমেন্টে জানান। দেখা হবে পরের ভিডিওতে!`
        }
      ];
    } else if (durationMinutes === 2) {
      script.scenes = [
        {
          sceneNumber: 1,
          timing: '00:00 - 00:20',
          visualPrompt: `Curiosity-inducing hook graphic explaining the core challenge of ${topic}.`,
          narration: `আসসালামু আলাইকুম! আজকের এই ২ মিনিটের ভিডিওতে আমরা আলোচনা করব ${topic} নিয়ে এবং কীভাবে এটি সবচেয়ে সহজে সমাধান করবেন।`
        },
        {
          sceneNumber: 2,
          timing: '00:20 - 00:50',
          visualPrompt: `Detailed comparison animation between traditional manual method vs modern automated approach.`,
          narration: `প্রথমে বোঝা যাক আসল সমস্যা কোথায়। অনেকেই না জেনে পুরনো পদ্ধতি ব্যবহার করে সময় ও শ্রম অপচয় করেন। অথচ মাত্র কয়েকটি সহজ নিয়ম মানলে কাজের দক্ষতা দ্বিগুণ করা যায়।`
        },
        {
          sceneNumber: 3,
          timing: '00:50 - 01:30',
          visualPrompt: `Step-by-step practical demonstration on software interface with highlighted steps.`,
          narration: `চলুন দেখে নেই বাস্তব সমাধান। প্রথমত, সিস্টেমটিকে ঠিকমতো কনফিগার করুন। দ্বিতীয়ত, পুনরাবৃত্তিমূলক কাজগুলো স্বয়ংক্রিয় করুন। এবং তৃতীয়ত, নিয়মিত ব্যাকআপ ও পারফরম্যান্স যাচাই করুন।`
        },
        {
          sceneNumber: 4,
          timing: '01:30 - 02:00',
          visualPrompt: `Call-to-action animation with contact info and special guidance note.`,
          narration: `আপনিও যদি আপনার প্রজেক্টে এই সমাধান চান, আজই আমাদের পেজে মেসেজ পাঠান। ভিডিওটি ভালো লাগলে লাইক ও শেয়ার করে সাথেই থাকুন!`
        }
      ];
    } else {
      // 3 to 5 minutes detailed masterclass
      script.scenes = [
        {
          sceneNumber: 1,
          timing: '00:00 - 00:30',
          visualPrompt: `Executive presenter style intro with chapter breakdown graphics on ${topic}.`,
          narration: `আসসালামু আলাইকুম। আজকের এই বিশদ গাইডলাইনে আমরা ${topic} সম্পর্কে শুরু থেকে শেষ পর্যন্ত সবকিছু সহজ বাংলায় তুলে ধরব।`
        },
        {
          sceneNumber: 2,
          timing: '00:30 - 01:30',
          visualPrompt: `Deep dive architectural diagram, infographic charts, and case studies.`,
          narration: `অধ্যায় ১: ভিত্তি ও প্রয়োজনীয়তা। কেন যেকোনো পেশাদার কাজের ক্ষেত্রে এটি জানা অপরিহার্য এবং সাধারণ মানুষ কোথায় সবচেয়ে বড় ভুলটি করে।`
        },
        {
          sceneNumber: 3,
          timing: '01:30 - 03:00',
          visualPrompt: `Hands-on workflow walkthrough, terminal execution, live screen capture display.`,
          narration: `অধ্যায় ২: ব্যবহারিক প্রয়োগ ও কৌশল। কীভাবে ধাপে ধাপে জটিল সমস্যাগুলোকে ছোট ছোট ভাগে বিভক্ত করে সমাধান করতে হয় তা এখানে প্রত্যক্ষ করুন।`
        },
        {
          sceneNumber: 4,
          timing: '03:00 - 05:00',
          visualPrompt: `Summary takeaways list, resource links, and closing professional signature.`,
          narration: `উপসংহার ও পরামর্শ। সঠিক গাইডলাইন মেনে কাজ করলে সফলতা নিশ্চিত। বিস্তারিত রিসোর্স লিংক কমেন্টে দেওয়া আছে। আমাদের পেজে ফলো দিয়ে যুক্ত থাকুন। ধন্যবাদ!`
        }
      ];
    }

    script.fullNarrationText = script.scenes.map(s => s.narration).join(' ');

    script.facebookPostText =
      `🔥 ${topic} — সম্পূর্ণ গাইডলাইন (${durationMinutes} মিনিটের বিশেষ ভিডিও)!\n\n` +
      `আসসালামু আলাইকুম! আপনি কি আপনার প্রজেক্টে সেরা ফলাফল চান?\n` +
      `আজকের ভিডিওতে আমরা সহজ বাংলায় বিস্তারিত আলোচনা করেছি কীভাবে সঠিক পদ্ধতিতে সমাধান পাবেন।\n\n` +
      `📌 ভিডিওর মূল বিষয়বস্তু:\n` +
      `• বাস্তব সমস্যা ও তার কারণ\n` +
      `• দ্রুত ও নিখুঁত সমাধানের বাস্তব টেকনিক\n` +
      `• কাজের গতি ও কোয়ালিটি বৃদ্ধির গোপন টিপস\n\n` +
      `👇 পুরো ভিডিওটি মনোযোগ দিয়ে দেখুন এবং আপনার মতামত কমেন্টে জানান!\n` +
      `📩 যেকোনো প্রশ্ন বা সেবার প্রয়োজনে আমাদের ইনবক্সে সরাসরি মেসেজ দিন।\n\n` +
      `#${topic.replace(/\s+/g, '')} #SocialMediaExpert #Automation #VideoMarketing #Bangladesh`;

    return script;
  }

  // Generate Neural Voiceover (.mp3) using Edge TTS
  async generateVoiceover(narrationText, filename = 'voiceover.mp3') {
    const tts = new EdgeTTS({
      voice: 'bn-BD-PradeepNeural',
      lang: 'bn-BD',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    });

    const audioPath = path.join(this.outputDir, filename);
    await tts.ttsPromise(narrationText, audioPath);
    return audioPath;
  }

  // Render MP4 Video using FFmpeg
  renderVideo({ audioPath, outputFilename = 'final_video.mp4', isVertical = true }) {
    return new Promise((resolve, reject) => {
      const videoPath = path.join(this.outputDir, outputFilename);
      const resolution = isVertical ? '1080x1920' : '1920x1080';
      const bgColor = '0x0d1117'; // Elegant dark background

      const ffmpegCmd = `ffmpeg -y -f lavfi -i color=c=${bgColor}:s=${resolution}:r=25 -i "${audioPath}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest "${videoPath}"`;

      exec(ffmpegCmd, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve(videoPath);
      });
    });
  }

  // Complete End-to-End Video Production Pipeline
  async produceCompleteVideoPackage(topic, durationMinutes = 1) {
    console.log(`[VideoProducer] Starting ${durationMinutes}-minute video production on: "${topic}"...`);

    // 1. Script & Storyboard
    const scriptData = this.generateScriptAndStoryboard(topic, durationMinutes);

    // 2. Generate Audio Voiceover
    const timestamp = Date.now();
    const audioFilename = `voice_${timestamp}.mp3`;
    const audioPath = await this.generateVoiceover(scriptData.fullNarrationText, audioFilename);
    console.log(`[VideoProducer] Audio voiceover rendered: ${audioPath}`);

    // 3. Render Final MP4
    const videoFilename = `video_${durationMinutes}min_${timestamp}.mp4`;
    const isVertical = durationMinutes <= 2;
    const videoPath = await this.renderVideo({
      audioPath,
      outputFilename: videoFilename,
      isVertical
    });
    console.log(`[VideoProducer] Final MP4 video rendered: ${videoPath}`);

    return {
      topic,
      duration: `${durationMinutes} Minute(s)`,
      scriptData,
      audioPath,
      videoPath,
      facebookPostCopy: scriptData.facebookPostText
    };
  }

  // Generate Talking Face / Lip-Sync Avatar Video via D-ID API
  async generateTalkingAvatar({ imagePath, audioPath, outputVideoPath = null }) {
    if (!this.didService.isConfigured()) {
      return {
        success: false,
        error: 'D-ID API Key (DID_API_KEY) .env ফাইলে পাওয়া যায়নি। অনুগ্রহ করে D-ID API Key কনফিগার করুন, স্যার।'
      };
    }

    try {
      const targetPath = outputVideoPath || path.join(this.outputDir, `talking_avatar_${Date.now()}.mp4`);
      return await this.didService.produceTalkingAvatarVideo({
        imagePath,
        audioPath,
        outputVideoPath: targetPath
      });
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
}
