import { EdgeTTS } from 'node-edge-tts';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Bengali TTS audio generation...');
const tts = new EdgeTTS({
  voice: 'bn-BD-PradeepNeural',
  lang: 'bn-BD',
  outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
});

const text = 'আসসালামু আলাইকুম স্যার। আমি আপনার সোশ্যাল মিডিয়া এক্সপার্ট সাব-এজেন্ট। ভিডিও মেকিংয়ের জন্য আমি প্রস্তুত।';
const outputPath = path.resolve(__dirname, '../subagents/socialMediaManager/test_voice.mp3');

await tts.ttsPromise(text, outputPath);
console.log('Voice audio successfully generated at:', outputPath);
