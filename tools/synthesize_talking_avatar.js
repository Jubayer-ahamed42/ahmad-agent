import { Client, handle_file } from '@gradio/client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DIR = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output';
const imagePath = path.join(DIR, 'sir_face_avatar.jpg');

const parts = [
  { audio: path.join(DIR, 'part1.mp3'), video: path.join(DIR, 'avatar_part1.mp4') },
  { audio: path.join(DIR, 'part2.mp3'), video: path.join(DIR, 'avatar_part2.mp4') },
  { audio: path.join(DIR, 'part3.mp3'), video: path.join(DIR, 'avatar_part3.mp4') }
];

const fullAvatarRaw = path.join(DIR, 'sir_talking_avatar_raw.mp4');

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  console.log(`Saved: ${dest} (${buffer.length} bytes)`);
}

async function main() {
  console.log('Connecting to Wav2lip-ZeroGPU Space...');
  const app = await Client.connect('pragnakalp/Wav2lip-ZeroGPU');
  console.log('Connected successfully!');

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    console.log(`\n--- Synthesizing Part ${i + 1}/${parts.length} ---`);
    console.log(`Audio: ${p.audio}`);
    const res = await app.predict('/run_infrence', [
      handle_file(imagePath),
      handle_file(p.audio)
    ]);
    const videoUrl = res.data[0].video.url;
    console.log(`Part ${i + 1} synthesized on cloud: ${videoUrl}`);
    await downloadFile(videoUrl, p.video);
  }

  console.log('\n--- Concatenating avatar parts with FFmpeg ---');
  const concatListPath = path.join(DIR, 'concat_list.txt');
  const fileContent = parts.map(p => `file '${p.video.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatListPath, fileContent);

  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${fullAvatarRaw}"`;
  console.log('Running concat command...');
  await execAsync(concatCmd);

  const { stdout: durStr } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullAvatarRaw}"`);
  console.log(`\n🎉 Full Talking Avatar raw video successfully created!`);
  console.log(`Path: ${fullAvatarRaw}`);
  console.log(`Duration: ${parseFloat(durStr.trim()).toFixed(2)}s`);
}

main().catch(err => {
  console.error('Fatal error in talking avatar pipeline:', err);
  process.exit(1);
});
