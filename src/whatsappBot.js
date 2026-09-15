import fs from 'fs';
import path from 'path';

const personaPath = path.join(process.cwd(), 'rules', 'persona.json');
let persona = {
  agent_name: "আহমদ",
  owner_honorific: "স্যার",
  client_honorific: "স্যার",
  busy_message: "আসসালামু আলাইকুম স্যার। যোগাযোগ করার জন্য ধন্যবাদ। আমি স্যারের পার্সোনাল অ্যাসিস্ট্যান্ট আহমদ। স্যার এখন একটি গুরুত্বপূর্ণ প্রজেক্টের কাজে কিছুটা ব্যস্ত আছেন। আপনার প্রয়োজনীয় বিষয় বা বার্তাটি দয়া করে এখানে লিখে রাখুন, স্যার ফ্রি হয়েই আপনার সাথে দ্রুত যোগাযোগ করবেন, স্যার।"
};

if (fs.existsSync(personaPath)) {
  try {
    persona = JSON.parse(fs.readFileSync(personaPath, 'utf-8'));
  } catch (e) {
    console.error('Error loading persona:', e.message);
  }
}

export function handleIncomingClientMessage({ senderName, messageText }) {
  console.log([WhatsApp Client] Message from : );

  const response =
    আসসালামু আলাইকুম ।\n +
    আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ। আমি স্যারের পার্সোনাল অ্যাসিস্ট্যান্ট আহমদ।\n\n +
    স্যার এখন একটি গুরুত্বপূর্ণ প্রজেক্টের কাজে কিছুটা ব্যস্ত আছেন।\n +
    আপনার কাজের বিবরণ, সময়সীমা বা প্রয়োজনীয় তথ্যটি এখানে লিখে রাখুন; স্যার ফ্রি হয়েই আপনার মেসেজ দেখে বিস্তারিত জানিয়ে দেবেন, ।;

  return {
    replyText: response,
    timestamp: new Date().toISOString()
  };
}
