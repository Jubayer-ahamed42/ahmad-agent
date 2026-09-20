import { Client, handle_file } from '@gradio/client';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Connecting to Wav2lip-ZeroGPU...');
  const app = await Client.connect('pragnakalp/Wav2lip-ZeroGPU');

  const imagePath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\sir_face_avatar.jpg';
  const audioPath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\test_short_5s.mp3';
  const dest = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\sir_talking_avatar_close.mp4';

  console.log('Synthesizing talking avatar on ZeroGPU...');
  const res = await app.predict('/run_infrence', [
    handle_file(imagePath),
    handle_file(audioPath)
  ]);

  const videoInfo = res.data[0].video;
  console.log('Video rendered on cloud:', videoInfo.url);

  console.log('Downloading video to local disk...');
  const dlRes = await fetch(videoInfo.url);
  if (!dlRes.ok) throw new Error('Download failed: ' + dlRes.statusText);
  const buffer = Buffer.from(await dlRes.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  console.log('✅ Final Talking Avatar video saved to:', dest, `(${buffer.length} bytes)`);
}

main().catch(err => {
  console.error('Talking avatar production error:', err);
});
