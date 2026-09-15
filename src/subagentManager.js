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

  // Delegate project architecture
  delegateProjectPlan(projectName, techStack) {
    return this.codeExpert.createArchitecturePlan(projectName, techStack);
  }

  // Delegate code review
  delegateCodeReview(code) {
    return this.codeExpert.reviewCodeSnippet(code);
  }

  // Get social summary for 9 PM briefing
  getSocialBriefingSnippet() {
    return this.socialMedia.getDailySocialSummary().summaryText;
  }
}
