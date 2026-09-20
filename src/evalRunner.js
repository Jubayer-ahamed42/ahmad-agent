import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import { ExecutiveBrain } from './executiveBrain.js';
import { SkillManager } from './skillManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EVALS_DIR = path.join(path.dirname(__dirname), 'evals');

/**
 * Evaluation-Driven Development (EDD) Benchmark Runner
 * Conforming to Section 4 & Appendix A of the Agent Skills Whitepaper (May 2026).
 */
async function runSkillEvaluations() {
  console.log('===============================================================');
  console.log('🎯 AGENT SKILLS BENCHMARK SUITE (EDD) - AHMAD EXECUTIVE AGENT');
  console.log('===============================================================\n');

  const brain = new ExecutiveBrain();
  const skillManager = brain.skillManager;

  const metadata = skillManager.getSkillsMetadataSummary();
  console.log(`📦 Active Skills Indexed (Progressive Disclosure Level 1): ${metadata.length} skills`);
  metadata.forEach(s => {
    console.log(`   • [${s.tier.toUpperCase()}] ${s.name}: ${s.description.substring(0, 70)}...`);
  });
  console.log('');

  if (!fs.existsSync(EVALS_DIR)) {
    console.error(`[EvalRunner] Evals directory not found at: ${EVALS_DIR}`);
    process.exit(1);
  }

  const evalFiles = fs.readdirSync(EVALS_DIR).filter(f => f.endsWith('.json'));
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const file of evalFiles) {
    const filePath = path.join(EVALS_DIR, file);
    const suite = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`🔬 Testing Skill Suite: ${suite.skill} (Version ${suite.version})`);

    for (const testCase of suite.eval_cases) {
      totalTests++;
      const isNegativeBoundary = testCase.expected_skill === null;

      // 1. Evaluate Trigger Routing (0ms Fast Path + Semantic)
      const fastIntent = brain.matchLocalFastIntent(testCase.input);
      const action = fastIntent ? fastIntent.action : null;

      let pass = false;
      let reason = '';

      if (isNegativeBoundary) {
        // Negative test: should NOT route to expected skill action
        if (!action || (action !== testCase.expected_action)) {
          pass = true;
          reason = 'Correctly rejected / not misrouted';
        } else {
          pass = false;
          reason = `Errantly triggered action: ${action}`;
        }
      } else {
        // Positive test: should route to expected action
        if (action === testCase.expected_action) {
          // Check selective gating requirement
          const outcome = await brain.processCommand(testCase.input);
          const wasGated = outcome.type === 'draft_action';

          if (testCase.selective_gating_required === wasGated) {
            pass = true;
            reason = `Routed to ${action} | Gated: ${wasGated}`;
          } else {
            pass = false;
            reason = `Gating mismatch: expected ${testCase.selective_gating_required}, got ${wasGated}`;
          }
        } else {
          pass = false;
          reason = `Routing failure: expected ${testCase.expected_action}, got ${action || 'None'}`;
        }
      }

      if (pass) {
        passedTests++;
        console.log(`   ✅ [PASS] ${testCase.case_id}: "${testCase.input}" -> ${reason}`);
      } else {
        failedTests++;
        console.log(`   ❌ [FAIL] ${testCase.case_id}: "${testCase.input}" -> ${reason}`);
      }
    }
    console.log('');
  }

  const accuracy = ((passedTests / totalTests) * 100).toFixed(1);
  console.log('---------------------------------------------------------------');
  console.log(`📊 EVALUATION SUMMARY:`);
  console.log(`   • Total Cases Tested: ${totalTests}`);
  console.log(`   • Passed: ${passedTests}`);
  console.log(`   • Failed: ${failedTests}`);
  console.log(`   • Benchmark Accuracy: ${accuracy}% (Target: ≥ 90.0%)`);

  if (accuracy >= 90.0) {
    console.log(`🎉 BENCHMARK STATUS: PASSED - Meets Agent Skills Whitepaper Quality Bar!`);
  } else {
    console.log(`⚠️ BENCHMARK STATUS: NEEDS REFINEMENT (< 90.0%)`);
  }
  console.log('===============================================================\n');

  return { totalTests, passedTests, failedTests, accuracy };
}

runSkillEvaluations().catch(err => {
  console.error('[EvalRunner] Unhandled error:', err);
  process.exit(1);
});
