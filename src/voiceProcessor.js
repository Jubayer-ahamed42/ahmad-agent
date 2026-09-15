import { EdgeTTS } from 'node-edge-tts';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export class VoiceProcessor {
  constructor(audioDir = 'C:\\Personal Agent\\Agent 1\\audio_cache') {
    this.audioDir = audioDir;
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  // 1. Convert any audio format (e.g. Telegram .oga/.ogg) to standard MP3/WAV via FFmpeg
  convertAudio(inputPath, targetFormat = 'mp3') {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(
        this.audioDir,
        `converted_${Date.now()}.${targetFormat}`
      );
      const cmd = `ffmpeg -y -i "${inputPath}" -acodec libmp3lame -ar 24000 -ac 1 "${outputPath}"`;

      exec(cmd, (err) => {
        if (err) return reject(err);
        resolve(outputPath);
      });
    });
  }

  // 2. Synthesize Ahmad's Royal 50-Year Veteran Voice in Bengali
  async speakToSir(text, filename = null) {
    try {
      const tts = new EdgeTTS();
      tts.voice = 'bn-BD-PradeepNeural'; // Dignified, calm male Bengali tone
      tts.rate = '-5%';                  // সামান্য ধীর গতি — গাম্ভীর্যপূর্ণ উচ্চারণ

      const outName = filename || `ahmad_voice_${Date.now()}.mp3`;
      const outputPath = path.join(this.audioDir, outName);
      await tts.ttsPromise(text, outputPath);
      return outputPath;
    } catch (e) {
      console.error('[VoiceProcessor] EdgeTTS error:', e.message);
      return null; // voice না হলেও text reply আসবে
    }
  }
}
