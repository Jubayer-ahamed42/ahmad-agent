import dotenv from 'dotenv';
dotenv.config();

const token = "8603408397:AAFYTYz3VQptDNKUzIpMbj1SGU2ITwGJjbo";
const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
const data = await res.json();
console.log('Telegram getMe result:', JSON.stringify(data, null, 2));
