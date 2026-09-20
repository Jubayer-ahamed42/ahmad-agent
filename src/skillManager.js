import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * SkillManager: Production-grade implementation of the Agent Skills Open Standard
 * (agentskills.io) adhering to the Google/Anthropic Agent Skills Whitepaper (May 2026).
 *
 * Implements:
 * 1. Progressive Disclosure (Level 1: Registry, Level 2: Instructions, Level 3: Deterministic Code)
 * 2. Read / Draft / Act Authority Ladder
 * 3. Selective Gating with Telegram 1-click Inline Approval
 */
export class SkillManager {
  constructor(skillsDir = path.join(process.cwd(), 'skills')) {
    this.skillsDir = skillsDir;
    this.skillsRegistry = new Map();
    this.pendingActions = new Map();
    this.initializeRegistry();
  }

  /**
   * Level 1: Discover & Index Skill Frontmatters (~50 tokens per skill)
   */
  initializeRegistry() {
    if (!fs.existsSync(this.skillsDir)) {
      console.warn(`[SkillManager] Skills directory not found: ${this.skillsDir}`);
      return;
    }

    const folders = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const skillPath = path.join(this.skillsDir, folder.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        if (fs.existsSync(skillMdPath)) {
          try {
            const rawContent = fs.readFileSync(skillMdPath, 'utf-8');
            const parsed = this.parseSkillFile(rawContent);

            this.skillsRegistry.set(parsed.frontmatter.name || folder.name, {
              folderName: folder.name,
              fullPath: skillPath,
              skillMdPath,
              frontmatter: parsed.frontmatter,
              hasScripts: fs.existsSync(path.join(skillPath, 'scripts')),
              hasReferences: fs.existsSync(path.join(skillPath, 'references')),
              hasAssets: fs.existsSync(path.join(skillPath, 'assets'))
            });

            console.log(`[SkillManager] Indexed skill: "${parsed.frontmatter.name || folder.name}" [Tier: ${parsed.frontmatter.tier || 'standard'}]`);
          } catch (err) {
            console.error(`[SkillManager] Error indexing skill in ${folder.name}:`, err.message);
          }
        }
      }
    }
  }

  /**
   * Minimal YAML Frontmatter Parser
   */
  parseSkillFile(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const yamlBlock = match[1];
    const body = match[2];
    const frontmatter = {};

    yamlBlock.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        const key = trimmed.slice(0, colonIndex).trim();
        let val = trimmed.slice(colonIndex + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        frontmatter[key] = val;
      }
    });

    return { frontmatter, body };
  }

  /**
   * Level 1: Generate lightweight metadata index for the prompt
   */
  getSkillsMetadataSummary() {
    const list = [];
    for (const [name, meta] of this.skillsRegistry.entries()) {
      list.push({
        name,
        description: meta.frontmatter.description?.replace(/[\r\n]+/g, ' ').trim() || '',
        tier: meta.frontmatter.tier || 'standard',
        allowedTools: meta.frontmatter['allowed-tools'] || ''
      });
    }
    return list;
  }

  /**
   * Level 2: Dynamically load full instructions of a triggered skill
   */
  loadSkillInstructions(skillName) {
    const meta = this.skillsRegistry.get(skillName);
    if (!meta) return null;
    const rawContent = fs.readFileSync(meta.skillMdPath, 'utf-8');
    return this.parseSkillFile(rawContent).body;
  }

  /**
   * Authority Ladder & Selective Gating
   */
  isGatingRequired(skillName, actionType) {
    const meta = this.skillsRegistry.get(skillName);
    if (!meta) return false;

    const tier = (meta.frontmatter.tier || '').toLowerCase();

    // Critical/Irreversible actions that require 1-click confirmation
    const criticalActions = ['fb_publish', 'publish', 'empty_recycle_bin', 'shutdown', 'sleep', 'delete_file'];
    if (criticalActions.includes(actionType)) {
      return true;
    }

    return false;
  }

  /**
   * Stage a pending action for 1-click confirmation on Telegram
   */
  stagePendingAction(skillName, actionType, params, previewText) {
    const actionId = crypto.randomBytes(6).toString('hex');
    const pendingObj = {
      id: actionId,
      skillName,
      actionType,
      params,
      previewText,
      createdAt: Date.now()
    };
    this.pendingActions.set(actionId, pendingObj);

    // Auto expire after 10 minutes
    setTimeout(() => {
      if (this.pendingActions.has(actionId)) {
        console.log(`[SkillManager] Pending action ${actionId} expired.`);
        this.pendingActions.delete(actionId);
      }
    }, 10 * 60 * 1000);

    return pendingObj;
  }

  /**
   * Get pending action by ID
   */
  getPendingAction(actionId) {
    return this.pendingActions.get(actionId);
  }

  /**
   * Cancel pending action
   */
  cancelPendingAction(actionId) {
    const act = this.pendingActions.get(actionId);
    if (act) {
      this.pendingActions.delete(actionId);
      return true;
    }
    return false;
  }

  /**
   * Level 3: Deterministically execute approved pending action
   */
  async executePendingAction(actionId) {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      return { success: false, error: 'অনুরোধটি পাওয়া যায়নি অথবা সময়সীমা অতিক্রান্ত হয়েছে, স্যার।' };
    }

    this.pendingActions.delete(actionId);

    try {
      if (action.skillName === 'facebook-manager' || action.skillName === 'facebook_manager') {
        const { publishToFacebookBrowser } = await import('../skills/facebook_manager/scripts/publish_browser.js');
        const postText = action.params.postText;
        const res = await publishToFacebookBrowser(postText);

        // Update calendar status to published
        try {
          const calPath = path.join(process.cwd(), 'subagents', 'socialMediaManager', 'content_calendar.json');
          if (fs.existsSync(calPath)) {
            const calData = JSON.parse(fs.readFileSync(calPath, 'utf-8'));
            const activePost = (calData.posts || []).find(p => p.status === 'ready');
            if (activePost) {
              activePost.status = 'published';
              activePost.published_at = new Date().toISOString();
              fs.writeFileSync(calPath, JSON.stringify(calData, null, 2), 'utf-8');
            }
          }
        } catch (e) {
          console.warn('[SkillManager] Notice updating calendar status:', e.message);
        }

        return {
          success: true,
          action: 'fb_publish',
          message: 'ফেসবুক পোস্টটি সফলভাবে ক্লিপবোর্ডে কপি করা হয়েছে এবং গুগল ক্রোম ওপেন করা হয়েছে, স্যার।',
          details: res
        };
      }

      if (action.skillName === 'pc-controller' || action.skillName === 'pc_controller') {
        const pc = await import('../skills/pc_controller/scripts/controller.js');
        if (action.actionType === 'empty_recycle_bin') {
          const res = await pc.emptyRecycleBin();
          return { success: true, action: 'empty_recycle_bin', message: res };
        }
        if (action.actionType === 'shutdown') {
          await pc.shutdownPC();
          return { success: true, action: 'shutdown', message: 'কম্পিউটার শাটডাউন করা হচ্ছে, স্যার।' };
        }
        if (action.actionType === 'sleep') {
          await pc.sleepPC();
          return { success: true, action: 'sleep', message: 'কম্পিউটার স্লিপ মোডে পাঠানো হচ্ছে, স্যার।' };
        }
      }

      return { success: false, error: `অজানা স্কিল একশন: ${action.skillName}` };
    } catch (err) {
      console.error('[SkillManager] Execution error:', err);
      return { success: false, error: err.message };
    }
  }
}
