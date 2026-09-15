import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

try {
  const result = await model.generateContent('Hello');
  console.log('Result:', result.response.text());
} catch (e) {
  console.log('GenerativeAI SDK Error:', e.message);
}
