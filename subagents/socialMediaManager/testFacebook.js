import { FacebookService } from './facebookService.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('====================================================');
console.log('       FACEBOOK GRAPH API ENGINE VERIFICATION        ');
console.log('====================================================');

async function testFacebookIntegration() {
  const fb = new FacebookService();
  
  console.log(`[Config Check] Page ID configured: ${Boolean(fb.pageId)}`);
  console.log(`[Config Check] Page Token configured: ${Boolean(fb.accessToken)}`);

  if (!fb.isConfigured()) {
    console.log('\n⚠️ Facebook credentials are not yet added to .env');
    console.log('   Please add FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN to .env to complete the link.');
    console.log('====================================================');
    return;
  }

  console.log('\n[1] Fetching Facebook Page Info via Meta Graph API...');
  const pageInfo = await fb.getPageInfo();
  console.log('Result:', JSON.stringify(pageInfo, null, 2));

  if (pageInfo.success) {
    console.log(`\n✅ Facebook Page "${pageInfo.name}" connected successfully!`);
    console.log(`   Followers: ${pageInfo.followers}`);
  } else {
    console.error(`\n❌ Error connecting: ${pageInfo.error}`);
  }
  console.log('====================================================');
}

testFacebookIntegration();
