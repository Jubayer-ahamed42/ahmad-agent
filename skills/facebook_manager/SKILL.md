---
name: facebook-manager
description: |
  Manages Facebook page operations, content scheduling, and post publishing for 'Be Smart With AI'. Use this skill when the user asks to publish Facebook posts, draft social media updates, check post status, or view the content calendar.
  Do NOT use for personal profile messaging, account settings, or non-Facebook social networks.
version: 1.0.0
tier: action-allowed
allowed-tools: [browser_publisher, content_calendar, page_metrics]
metadata:
  author: Ahmad Core Team
  target_page_id: "1347013991822233"
  page_url: "https://www.facebook.com/besmartwithaipro/"
---

# Facebook Manager Skill

## Purpose & Scope
This skill governs all publishing, drafting, and scheduling workflows for Sir's Facebook page **"Be Smart With AI"** (Page ID: `1347013991822233`).
It operates under the **Read / Draft / Act** authority model:
- **Read-Only**: Viewing page statistics, follower counts, and inspecting scheduled posts.
- **Draft-Only**: Writing new post captions, preparing hashtags, and queuing drafts.
- **Action-Allowed**: Publishing live posts to Facebook. Irreversible operations require Sir's 1-click confirmation on Telegram.

## Progressive Disclosure Levels
- **Level 1 (Metadata)**: Name, description, and frontmatter are indexed at agent startup.
- **Level 2 (Instructions)**: This markdown guide is loaded dynamically when Facebook-related intent triggers.
- **Level 3 (Deterministic Code)**: `scripts/publish_browser.js` executes the base64 clipboard bridge and opens the business composer.

## When to Use
- When Sir commands to publish a post ("ফেসবুকে পোস্ট দাও", "পোস্ট পাবলিশ কর", "ফেসবুকে নতুন পোস্টটি ছাড়ো").
- When Sir asks to draft or review content ("একটি টেক পোস্ট লিখে দাও", "কনটেন্ট ক্যালেন্ডার দেখাও").
- When Sir inquires about page status or follower counts.

## When NOT to Use
- Do NOT use for personal account chats or sending private Facebook Messenger messages to non-page contacts.
- Do NOT use for editing billing, ads manager credit cards, or page deletion.

## Deterministic Execution Workflow
1. **Identify Operation**:
   - If action is `status` or `calendar`: Run read-only query immediately and return formatted summary.
   - If action is `draft`: Generate content draft and return with status `ready`.
   - If action is `publish`:
     - Fetch the target post text from `content_calendar.json` or Sir's input.
     - Require Sir's 1-click approval if triggered naturally without explicit confirmation.
     - Once approved, invoke `scripts/publish_browser.js` with base64 post text.
     - Update post status to `published` in `content_calendar.json`.
2. **References & Guidelines**:
   - See `references/page_conventions.md` for branding, hashtags, and formatting standards.
