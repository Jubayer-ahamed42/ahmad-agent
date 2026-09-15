import { handleIncomingClientMessage } from './whatsappBot.js';

console.log('Testing WhatsApp Client message handling...');
const result = handleIncomingClientMessage({
  senderName: 'রহিম সাহেব',
  messageText: 'আপনাদের ওয়েব ডেভেলপমেন্ট সার্ভিসের প্যাকেজ ও ফি জানতে চাই।'
});
console.log('WhatsApp Bot Reply:\n', result.replyText);
