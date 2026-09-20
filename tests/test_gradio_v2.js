import { Client, handle_file } from '@gradio/client';
import fs from 'fs';

async function main() {
  console.log('Connecting to Wav2lip-ZeroGPU via Gradio 2.6.0...');
  const app = await Client.connect('pragnakalp/Wav2lip-ZeroGPU');
  console.log('Connected! View API:');
  const apiInfo = await app.view_api();
  console.log(JSON.stringify(apiInfo, null, 2));

  const imagePath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\sir_portrait_crop.jpg';
  const audioPath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\test_short_5s.mp3';

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
