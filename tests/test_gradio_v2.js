import { Client, handle_file } from '@gradio/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIR = process.env.OUTPUT_DIR || path.resolve(__dirname, '../subagents/socialMediaManager/output');

async function main() {
  console.log('Connecting to Wav2lip-ZeroGPU via Gradio 2.6.0...');
  const app = await Client.connect('pragnakalp/Wav2lip-ZeroGPU');
  console.log('Connected! View API:');
  const apiInfo = await app.view_api();
  console.log(JSON.stringify(apiInfo, null, 2));

  const imagePath = path.join(DIR, 'sir_portrait_crop.jpg');
  const audioPath = path.join(DIR, 'test_short_5s.mp3');

  console.log('Testing prediction with handle_file...');
  const result = await app.predict('/run_infrence', [
    handle_file(imagePath),
    handle_file(audioPath)
  ]);

  console.log('Result:', result);
}

main().catch(err => {
  console.error('Error in main:', err);
});
