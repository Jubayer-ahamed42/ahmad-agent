import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const bgPath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\sir_profile.jpg';
const avatarVideoPath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\sir_talking_avatar_raw.mp4';
const previewFramePath = 'C:\\Personal Agent\\Agent 1\\subagents\\socialMediaManager\\output\\preview_composite.jpg';
const fontPath = 'C\\:/Windows/Fonts/Nirmala.ttc';

const filterComplex = [
  `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5,eq=brightness=-0.28:contrast=1.15[bg]`,
  `[1:v]scale=720:910:flags=lanczos,pad=736:926:8:8:color=0x38bdf8@0.9,pad=756:946:10:10:color=white@0.4[fg]`,
  `[bg][fg]overlay=(W-w)/2:440[comp1]`,
  `[comp1]drawbox=x=70:y=90:w=940:h=290:color=black@0.75:t=fill[card1]`,
  `[card1]drawbox=x=70:y=90:w=940:h=6:color=0x38bdf8:t=fill[acc1]`,
  `[acc1]drawtext=fontfile='${fontPath}':text='BE SMART WITH AI • EXECUTIVE BRIEFING':fontcolor=0x38bdf8:fontsize=32:x=(w-text_w)/2:y=130:shadowcolor=black@0.8:shadowx=2:shadowy=2[t1]`,
  `[t1]drawtext=fontfile='${fontPath}':text='এআই ব্যবহারের সুবিধা ও অসুবিধা':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=195:shadowcolor=black@0.8:shadowx=2:shadowy=2[t2]`,
  `[t2]drawtext=fontfile='${fontPath}':text='প্রযুক্তি যখন আপনার মেধার সহযোগী':fontcolor=0x94a3b8:fontsize=32:x=(w-text_w)/2:y=280:shadowcolor=black@0.8:shadowx=2:shadowy=2[comp2]`,
  `[comp2]drawbox=x=70:y=1440:w=940:h=340:color=black@0.80:t=fill[card2]`,
  `[card2]drawbox=x=70:y=1774:w=940:h=6:color=0xfacc15:t=fill[acc2]`,
  `[acc2]drawtext=fontfile='${fontPath}':text='সচেতন ও সঠিক ব্যবহারই আনবে প্রকৃত সাফল্য':fontcolor=0xfacc15:fontsize=40:x=(w-text_w)/2:y=1485:shadowcolor=black@0.8:shadowx=2:shadowy=2[t3]`,
  `[t3]drawtext=fontfile='${fontPath}':text='এআই মানুষের বিকল্প নয় — আপনার মেধার এক শক্তিশালী সহযোগী':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=1565:shadowcolor=black@0.8:shadowx=2:shadowy=2[t4]`,
  `[t4]drawtext=fontfile='${fontPath}':text='Facebook Page - Be Smart With AI':fontcolor=0x38bdf8:fontsize=34:x=(w-text_w)/2:y=1645:shadowcolor=black@0.8:shadowx=2:shadowy=2[t5]`,
  `[t5]drawtext=fontfile='${fontPath}':text='Executive AI Presentation by Ahmad':fontcolor=0x64748b:fontsize=26:x=(w-text_w)/2:y=1710:shadowcolor=black@0.8:shadowx=2:shadowy=2[outv]`
].join(';');

const cmd = `ffmpeg -y -i "${bgPath}" -ss 00:00:10 -i "${avatarVideoPath}" -filter_complex "${filterComplex}" -map "[outv]" -vframes 1 "${previewFramePath}"`;

async function run() {
  console.log('Rendering composite test frame...');
  await execAsync(cmd);
  console.log('Preview frame rendered:', previewFramePath);
}

run().catch(console.error);
