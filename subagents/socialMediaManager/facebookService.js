import fs from 'fs';
import path from 'path';

/**
 * FacebookService
 * Official Meta Graph API Integration (v20.0)
 * 100% Free & Sanctioned by Meta (Zero Ban Risk)
 */
export class FacebookService {
  constructor(options = {}) {
    this.pageId = options.pageId || process.env.FB_PAGE_ID || '';
    this.accessToken = options.accessToken || process.env.FB_PAGE_ACCESS_TOKEN || '';
    this.apiVersion = 'v20.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  isConfigured() {
    return Boolean(this.pageId && this.accessToken);
  }

  /**
   * 1. Get Page Profile & Public Stats
   */
  async getPageInfo() {
    if (!this.isConfigured()) {
      return { success: false, error: 'Facebook Page credentials (FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN) not configured in .env' };
    }

    try {
      const url = `${this.baseUrl}/${this.pageId}?fields=id,name,followers_count,fan_count,link,about&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error.message, code: data.error.code };
      }

      return {
        success: true,
        pageId: data.id,
        name: data.name,
        followers: data.followers_count || data.fan_count || 0,
        likes: data.fan_count || 0,
        link: data.link || `https://facebook.com/${data.id}`,
        about: data.about || ''
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 2. Publish a Text Post to the Page Feed
   */
  async publishTextPost(message) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Facebook Page credentials not configured in .env' };
    }

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return { success: false, error: 'পোস্টের মেসেজ খালি হতে পারে না।' };
    }

    try {
      const url = `${this.baseUrl}/${this.pageId}/feed`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          access_token: this.accessToken
        })
      });

      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message, code: data.error.code };
      }

      return {
        success: true,
        postId: data.id,
        postUrl: `https://facebook.com/${data.id}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 3. Publish a Photo Post with Caption
   */
  async publishPhotoPost(photoUrlOrPath, caption = '') {
    if (!this.isConfigured()) {
      return { success: false, error: 'Facebook Page credentials not configured in .env' };
    }

    try {
      const url = `${this.baseUrl}/${this.pageId}/photos`;
      let res;

      if (/^https?:\/\//i.test(photoUrlOrPath)) {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: photoUrlOrPath,
            caption: caption.trim(),
            access_token: this.accessToken
          })
        });
      } else {
        if (!fs.existsSync(photoUrlOrPath)) {
          return { success: false, error: `ছবি খুঁজে পাওয়া যায়নি: ${photoUrlOrPath}` };
        }

        const formData = new FormData();
        const fileBuffer = fs.readFileSync(photoUrlOrPath);
        const blob = new Blob([fileBuffer]);
        formData.append('source', blob, path.basename(photoUrlOrPath));
        formData.append('caption', caption.trim());
        formData.append('access_token', this.accessToken);

        res = await fetch(url, {
          method: 'POST',
          body: formData
        });
      }

      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message, code: data.error.code };
      }

      return {
        success: true,
        photoId: data.id,
        postId: data.post_id || data.id,
        postUrl: `https://facebook.com/${data.id}`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 4. Fetch Recent Posts with Comments & Reactions Count
   */
  async getRecentPosts(limit = 5) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Facebook Page credentials not configured in .env' };
    }

    try {
      const url = `${this.baseUrl}/${this.pageId}/feed?fields=id,message,created_time,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      const posts = (data.data || []).map((p) => ({
        id: p.id,
        message: p.message || '[ছবি বা ভিডিও পোস্ট]',
        createdTime: p.created_time,
        likeCount: p.likes?.summary?.total_count || 0,
        commentCount: p.comments?.summary?.total_count || 0,
        url: `https://facebook.com/${p.id}`
      }));

      return { success: true, posts };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 5. Get Unanswered Comments from Recent Posts
   */
  async getRecentComments(postId) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Facebook Page credentials not configured in .env' };
    }

    try {
      const url = `${this.baseUrl}/${postId}/comments?fields=id,from,message,created_time,comment_count&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { success: true, comments: data.data || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 6. Reply to a specific customer comment
   */
  async replyToComment(commentId, message) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Facebook Page credentials not configured in .env' };
    }

    try {
      const url = `${this.baseUrl}/${commentId}/comments`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          access_token: this.accessToken
        })
      });

      const data = await res.json();
      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { success: true, replyId: data.id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}
