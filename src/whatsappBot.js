import fs from 'fs';
import path from 'path';

// Load persona rules
const personaPath = path.join(process.cwd(), 'rules', 'persona.json');
let persona = {
  owner_honorific: "স্যার",
  client_honorific: "স্যার",
  busy_message: "আসসালামু আলাইকুম স্যার। যোগাযোগ করার জন্য ধন্যবাদ। স্যার এখন একটি গুরুত্বপূর্ণ প্রজেক্টের কাজে কিছুটা ব্যস্ত আছেন। আপনার প্রয়োজনীয় বিষয় বা বার্তাটি দয়া করে এখানে লিখে রাখুন, স্যার ফ্রি হয়েই আপনার সাথে দ্রুত যোগাযোগ করবেন, স্যার।"
};

if (fs.existsSync(personaPath)) {
  try {
    persona = JSON.parse(fs.readFileSync(personaPath, 'utf-8'));
  } catch (e) {
    console.error('Error loading persona:', e.message);
  }
}

// Client auto-response handler
export function handleIncomingClientMessage({ senderName, messageText }) {
  console.log(`[WhatsApp Client] Message from ${senderName}: ${messageText}`);

  // Default respectful response acknowledging client as "স্যার" and explaining owner is busy
  const response =
    `আসসালামু আলাইকুম ${persona.client_honorific}।\n` +
    `আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ।\n\n` +
    `স্যার এখন একটি গুরুত্বপূর্ণ প্রজেক্টের কাজে কিছুটা ব্যস্ত আছেন।\n` +
    `আপনার কাজের বিবরণ, সময়সীমা বা প্রয়োজনীয় তথ্যটি এখানে লিখে রাখুন; স্যার ফ্রি হয়েই আপনার মেসেজ দেখে বিস্তারিত জানিয়ে দেবেন, ${persona.client_honorific}।`;

  return {
    replyText: response,
    timestamp: new Date().toISOString()
  };
}
