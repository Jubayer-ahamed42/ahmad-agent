import { SubagentManager } from '../src/subagentManager.js';

console.log('Testing Subagent Manager under Ahmad...');
const manager = new SubagentManager();

console.log('\n--- 1. Social Media Manager Subagent Test ---');
const post = manager.delegatePostCreation('নতুন ওয়েবসাইট লঞ্চিং অফার!', 'ই-কমার্স ও অটোমেশন সলিউশন');
console.log(post);

console.log('\n--- 2. Code Expert Subagent Test ---');
const plan = manager.delegateProjectPlan('Inventory & Billing App', ['Next.js', 'FastAPI', 'PostgreSQL']);
console.log(JSON.stringify(plan, null, 2));

console.log('\n--- 3. Nightly Social Summary Preview ---');
console.log(manager.getSocialBriefingSnippet());
