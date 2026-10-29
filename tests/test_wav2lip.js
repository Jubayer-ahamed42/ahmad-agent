import { client } from '@gradio/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIR = process.env.OUTPUT_DIR || path.resolve(__dirname, '../subagents/socialMediaManager/output');

async function main() {
  console.log('Connecting to Wav2lip-ZeroGPU...');
  const app = await client('pragnakalp/Wav2lip-ZeroGPU');
  console.log('Connected! Uploading files...');

  const imagePath = path.join(DIR, 'sir_portrait_crop.jpg');
  const audioPath = path.join(DIR, 'test_short_5s.mp3');

  const imageBuffer = fs.readFileSync(imagePath);
  const audioBuffer = fs.readFileSync(audioPath);

  const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

  console.log('Sending prediction request to ZeroGPU...');
  const result = await app.predict('/run_infrence', [
    imageBlob,
    audioBlob
  ]);

  console.log('Result received!');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error('Prediction failed:', err);
});
