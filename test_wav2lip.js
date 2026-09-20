import { client } from '@gradio/client';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Connecting to Wav2lip-ZeroGPU...');
  const app = await client('pragnakalp/Wav2lip-ZeroGPU');
  console.log('Connected! Uploading files...');

  const imagePath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\sir_portrait_crop.jpg';
  const audioPath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\test_short_5s.mp3';

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
