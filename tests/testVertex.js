import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;

// Test Vertex AI Express Mode endpoint
const res = await fetch(`https://aiplatform.googleapis.com/v1/projects/350173897324/locations/us-central1/publishers/google/models/gemini-1.5-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hi' }] }] })
});

console.log('Vertex Express Status:', res.status, await res.text());
