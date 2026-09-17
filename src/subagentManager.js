import { SocialMediaManager } from '../subagents/socialMediaManager/index.js';
import { CodeExpert } from '../subagents/codeExpert/index.js';

export class SubagentManager {
  constructor() {
    this.socialMedia = new SocialMediaManager();
    this.codeExpert = new CodeExpert();
    console.log('👥 Ahmad\'s Subagents Team Loaded:');
    console.log('   1. Social Media & Video Production Expert (Facebook & Video Engine)');
    console.log('   2. Senior Software & Web Development Expert (Coding & Architecture)');
  }

  // Delegate social media post generation
  delegatePostCreation(topic, service) {
    return this.socialMedia.generatePostDraft(topic, service);
  }

  // Delegate video creation (1, 2, 3, or 5 minutes)
  async delegateVideoProduction(topic, durationMinutes = 1) {
    return await this.socialMedia.createVideoPackage(topic, durationMinutes);
  }

  // Delegate realistic talking avatar creation (Lip-Sync via D-ID)
  async delegateTalkingAvatarProduction({ imagePath, audioPath, outputVideoPath = null }) {
    return await this.socialMedia.createTalkingAvatarVideo({ imagePath, audioPath, outputVideoPath });
  }

  // Delegate project architecture
  delegateProjectPlan(projectName, techStack) {
    return this.codeExpert.createArchitecturePlan(projectName, techStack);
  }

  // Delegate code review
  delegateCodeReview(code) {
    return this.codeExpert.reviewCodeSnippet(code);
  }

  // Delegate Facebook publishing
  async delegateFacebookPost(message, mediaPath = null) {
    return await this.socialMedia.publishPost(message, mediaPath);
  }

  // Delegate Facebook page info
  async delegateFacebookStatus() {
    return await this.socialMedia.getFacebookStatus();
  }

  // Delegate Facebook recent posts
  async delegateFacebookRecentPosts(limit = 5) {
    return await this.socialMedia.getRecentPosts(limit);
  }

  // Delegate Facebook comment reply
  async delegateFacebookCommentReply(commentId, text) {
    return await this.socialMedia.handleCommentOrMessage(commentId, text);
  }

  // Get social summary for 9 PM briefing
  getSocialBriefingSnippet() {
    return this.socialMedia.getDailySocialSummary().summaryText;
  }
}
