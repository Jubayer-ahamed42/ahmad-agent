import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';

console.log('Testing Gemini API Key...');
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY not found in .env');
  process.exit(1);
}

try {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: 'You are Ahmad (Agent 1), a 50-year veteran personal executive assistant. Greet Sir in respectful Bengali addressing him as স্যার, and confirm that you are online and ready to serve.',
  });

  console.log('\n--- Gemini API Response ---');
  console.log(response.text);
  console.log('---------------------------\n');
  console.log('Gemini API Connection: SUCCESS!');
} catch (error) {
  console.error('API Test Error:', error.message || error);
}
