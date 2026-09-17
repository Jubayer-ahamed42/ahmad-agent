import fs from 'fs';
import path from 'path';
import { VideoProducer } from './videoProducer.js';
import { FacebookService } from './facebookService.js';

export class SocialMediaManager {
  constructor() {
    this.name = 'Social Media & Video Production Specialist';
    this.videoProducer = new VideoProducer();
    this.facebook = new FacebookService();
    this.inboxCountToday = 0;
    this.commentsCountToday = 0;
  }

  // 1. Check if Facebook integration is connected
  isFacebookConnected() {
    return this.facebook.isConfigured();
  }

  // 2. Fetch Facebook Page Profile and Stats
  async getFacebookStatus() {
    return await this.facebook.getPageInfo();
  }

  // 3. Publish post to Facebook Page
  async publishPost(message, mediaPath = null) {
    if (mediaPath) {
      return await this.facebook.publishPhotoPost(mediaPath, message);
    }
    return await this.facebook.publishTextPost(message);
  }

  // 4. Fetch recent posts from Facebook Page
  async getRecentPosts(limit = 5) {
    return await this.facebook.getRecentPosts(limit);
  }

  // 5. Reply to customer comment or message
  async handleCommentOrMessage(commentId = null, replyText = null) {
    this.commentsCountToday += 1;
    const defaultReply = 'আসসালামু আলাইকুম স্যার। ধন্যবাদ আমাদের সাথে যোগাযোগ করার জন্য। আপনার প্রশ্নটির উত্তর আমরা ইনবক্সে বিস্তারিত জানিয়ে দিচ্ছি, স্যার।';
    const textToSend = replyText || defaultReply;

    if (this.facebook.isConfigured() && commentId) {
      const res = await this.facebook.replyToComment(commentId, textToSend);
      return {
        success: res.success,
        reply: textToSend,
        replyId: res.replyId,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      reply: textToSend,
      timestamp: new Date().toISOString()
    };
  }

  // 2. Draft an engaging Bengali Facebook post
  generatePostDraft(topic, serviceHighlight = '') {
    return (
      `📢 ${topic}\n\n` +
      `আসসালামু আলাইকুম! আপনি কি আপনার ব্যবসার জন্য প্রফেশনাল ওয়েব সলিউশন ও অটোমেশন খুঁজছেন?\n` +
      `আমরা দিচ্ছি আধুনিক টেকনোলজি এবং সেরা পারফরম্যান্সের নিশ্চয়তা।\n\n` +
      `✨ বিশেষ সুবিধাসমূহ:\n` +
      `• প্রিমিয়াম ডিজাইন ও মোবাইল ফ্রেন্ডলি ইন্টারফেস\n` +
      `• দ্রুতগতির ও সুরক্ষিত ব্যাকএন্ড সিস্টেম\n` +
      `• ২৪/৭ নির্ভরযোগ্য সাপোর্ট\n\n` +
      `${serviceHighlight ? `🔹 ফোকাস: ${serviceHighlight}\n\n` : ''}` +
      `📩 বিস্তারিত জানতে আজই আমাদের পেজের ইনবক্সে নক দিন!\n` +
      `#WebDevelopment #SoftwareEngineering #Automation #TechSolutions`
    );
  }

  // 3. Complete Video Production (1, 2, 3, or 5 Minutes)
  async createVideoPackage(topic, durationMinutes = 1) {
    return await this.videoProducer.produceCompleteVideoPackage(topic, durationMinutes);
  }

  // 3b. Realistic Talking Avatar Video Production (Lip-Sync via D-ID API)
  async createTalkingAvatarVideo({ imagePath, audioPath, outputVideoPath = null }) {
    return await this.videoProducer.generateTalkingAvatar({ imagePath, audioPath, outputVideoPath });
  }

  // 4. Daily social media summary for Ahmad's 9:00 PM briefing
  getDailySocialSummary() {
    return {
      inboxCount: this.inboxCountToday,
      commentsCount: this.commentsCountToday,
      summaryText: `• সোশ্যাল মিডিয়া: ${this.commentsCountToday}টি কমেন্ট হ্যান্ডেল ও ভিডিও প্রোডাকশন পাইপলাইন সক্রিয় রয়েছে।`
    };
  }
}
