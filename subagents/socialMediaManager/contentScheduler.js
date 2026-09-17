import fs from 'fs';
import path from 'path';
import { FacebookService } from './facebookService.js';

export class ContentScheduler {
  constructor() {
    this.calendarPath = path.resolve('C:/Personal Agent/Agent 1/subagents/socialMediaManager/content_calendar.json');
    this.fb = new FacebookService();
  }

  loadCalendar() {
    try {
      if (fs.existsSync(this.calendarPath)) {
        const raw = fs.readFileSync(this.calendarPath, 'utf-8').replace(/^\uFEFF/, '');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('[ContentScheduler] Failed to load calendar:', err.message);
    }
    return [];
  }

  saveCalendar(calendar) {
    try {
      fs.writeFileSync(this.calendarPath, JSON.stringify(calendar, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('[ContentScheduler] Failed to save calendar:', err.message);
      return false;
    }
  }

  getPlanSummary() {
    const calendar = this.loadCalendar();
    return calendar.map(item => ({
      id: item.id,
      day: item.day,
      title: item.title,
      topic: item.topic,
      status: item.status,
      publishedAt: item.publishedAt || null
    }));
  }

  formatPostText(item) {
    return (
      `${item.title}\n\n` +
      `${item.hook}\n\n` +
      `${item.body}\n\n` +
      `---\n` +
      `${item.cta}\n\n` +
      `${item.hashtags}`
    );
  }

  getPostForDay(dayNumber) {
    const calendar = this.loadCalendar();
    const item = calendar.find(c => c.id === Number(dayNumber));
    if (!item) return null;
    return {
      item,
      formattedText: this.formatPostText(item)
    };
  }

  getNextScheduledPost() {
    const calendar = this.loadCalendar();
    const item = calendar.find(c => c.status === 'ready');
    if (!item) return null;
    return {
      item,
      formattedText: this.formatPostText(item)
    };
  }

  async publishDayPost(dayNumber) {
    const postData = this.getPostForDay(dayNumber);
    if (!postData) {
      return { success: false, error: `Day ${dayNumber} post not found in calendar.` };
    }

    const { item, formattedText } = postData;
    console.log(`[ContentScheduler] Publishing Day ${item.id} (${item.day}): "${item.title}"...`);

    const publishRes = await this.fb.publishTextPost(formattedText);
    if (publishRes.success) {
      const calendar = this.loadCalendar();
      const target = calendar.find(c => c.id === item.id);
      if (target) {
        target.status = 'published';
        target.publishedAt = new Date().toISOString();
        target.postId = publishRes.postId;
        target.postUrl = publishRes.postUrl;
        this.saveCalendar(calendar);
      }
      return {
        success: true,
        item: target,
        postId: publishRes.postId,
        postUrl: publishRes.postUrl
      };
    }

    return {
      success: false,
      error: publishRes.error,
      code: publishRes.code
    };
  }
}
