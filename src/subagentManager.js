import { SocialMediaManager } from '../subagents/socialMediaManager/index.js';
import { CodeExpert } from '../subagents/codeExpert/index.js';

export class SubagentManager {
  constructor() {
    this.socialMedia = new SocialMediaManager();
    this.codeExpert = new CodeExpert();
    console.log('👥 Ahmad\'s Subagents Team Loaded:');
    console.log('   1. Social Media Manager (Facebook & Public Engagement)');
    console.log('   2. Senior Software & Web Development Expert (Coding & Architecture)');
  }

  // Delegate social media post generation
  delegatePostCreation(topic, service) {
    return this.socialMedia.generatePostDraft(topic, service);
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
