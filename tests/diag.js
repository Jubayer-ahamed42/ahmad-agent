import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

console.log('Testing header x-goog-api-key with key:', key.slice(0, 8) + '...');
const res1 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
console.log('Query param status:', res1.status, await res1.text());

console.log('\nTesting Authorization: Bearer...');
const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
  headers: { 'Authorization': `Bearer ${key}` }
});
console.log('Bearer status:', res2.status, await res2.text());
