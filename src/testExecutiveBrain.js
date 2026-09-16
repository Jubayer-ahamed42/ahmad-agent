import dotenv from 'dotenv';
dotenv.config();

import { ExecutiveBrain } from './executiveBrain.js';
import fs from 'fs';

console.log('Testing Ahmad 50-Year Veteran Executive Brain...');
const ahmad = new ExecutiveBrain();

// Test 1: Screen command
console.log('\n--- Test 1: Screen Command ---');
const r1 = await ahmad.processCommand('আহমদ, আমার পিসির একটা স্ক্রিনশট তুলে দাও');
console.log('Reply Type:', r1.type);
console.log('Text:', r1.replyText);
console.log('Voice Audio generated:', fs.existsSync(r1.voiceAudioPath));

// Test 2: Architecture command
console.log('\n--- Test 2: Architecture Command ---');
const r2 = await ahmad.processCommand('আহমদ, একটি ই-কমার্স ওয়েবসাইটের জন্য সিস্টেম আর্কিটেকচার বানিয়ে দাও');
console.log('Text Summary:', r2.replyText.slice(0, 200) + '...');
console.log('Voice Audio generated:', fs.existsSync(r2.voiceAudioPath));

// Test 3: Wise Greeting
console.log('\n--- Test 3: Wise General Chat ---');
const r3 = await ahmad.processCommand('আহমদ, তুমি কেমন আছো?');
console.log('Text:', r3.replyText);
console.log('Voice Audio generated:', fs.existsSync(r3.voiceAudioPath));
