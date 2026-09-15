import { SubagentManager } from './subagentManager.js';

console.log('Testing Ahmad Video Delegation to Social Media Subagent...');
const manager = new SubagentManager();

const result = await manager.delegateVideoProduction('আধুনিক ওয়েব ডেভেলপমেন্ট ও অটোমেশন', 1);

console.log('\n--- Video Production Completed! ---');
console.log('Topic:', result.topic);
console.log('Duration:', result.duration);
console.log('Audio Path:', result.audioPath);
console.log('Video Path:', result.videoPath);
console.log('\n--- Facebook Post Copy ---');
console.log(result.facebookPostCopy);
