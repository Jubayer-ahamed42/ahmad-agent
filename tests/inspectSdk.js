import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'AQ.test' });
console.log('GoogleGenAI instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ai)));
console.log('models methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(ai.models)));
