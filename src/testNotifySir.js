import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const ownerId = process.env.TELEGRAM_OWNER_ID;

const text = "আসসালামু আলাইকুম স্যার! কমান্ডের রাউটিং সমস্যার স্থায়ী সমাধান করা হয়েছে। অনুগ্রহ করে এখন /status অথবা /screen লিখে টেস্ট করে দেখুন, স্যার।";

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: ownerId,
    text: text
  })
});

const data = await res.json();
console.log('Send direct message result:', data.ok ? 'SUCCESS' : data);
