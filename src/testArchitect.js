import { CodeExpert } from '../subagents/codeExpert/index.js';

console.log('Testing 20+ Years Principal Architect Subagent...');
const expert = new CodeExpert();

console.log('\n--- 1. Enterprise Architecture Blueprint ---');
const arch = expert.createArchitecturePlan('NextGen Payment & E-Commerce Core', {
  domain: 'FinTech & High-Frequency Commerce',
  scale: '1,000,000+ Daily Active Users',
  platform: 'Next.js 15 Web & React Native Mobile'
});
console.log(JSON.stringify(arch, null, 2));

console.log('\n--- 2. Database Schema (Prisma PostgreSQL) ---');
const schema = expert.generateDatabaseSchema(['User', 'Project', 'Task']);
console.log(schema.slice(0, 350) + '...\n[Schema Truncated for display]');

console.log('\n--- 3. Code Security & Architecture Audit ---');
const badCode = `
async function fetchUser(req, res) {
  var id = req.query.id;
  const dbPass = "secret_db_password_123";
  const user = await db.query("SELECT * FROM users WHERE id = " + id);
  res.send(user);
}
`;
const audit = expert.reviewCodeSnippet(badCode);
console.log(JSON.stringify(audit, null, 2));

console.log('\n--- 4. DevOps Multi-Stage Dockerfile ---');
const devops = expert.generateDevOpsAssets('node');
console.log(devops.dockerfile.slice(0, 250) + '...');
