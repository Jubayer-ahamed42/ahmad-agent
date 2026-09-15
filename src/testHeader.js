import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

console.log('Testing with header x-goog-api-key...');
const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': key
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Say hello in Bengali' }] }]
  })
});

console.log('Status:', res.status);
const data = await res.json();
console.log('Response:', JSON.stringify(data, null, 2));
