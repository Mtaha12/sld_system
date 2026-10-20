import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';

async function testEndpoints() {
  console.log('Testing newly created reference list endpoints...');

  // 1. Articles
  const resArticles = await fetch(`${BASE_URL}/api/settings/articles?limit=3`);
  const dataArticles = await resArticles.json();
  console.log(`\n[ARTICLES] Status: ${resArticles.status} | Total in DB: ${dataArticles.total}`);
  console.log('Sample Article:', dataArticles.data?.[0]);

  // 2. Topics
  const resTopics = await fetch(`${BASE_URL}/api/settings/topics?limit=3`);
  const dataTopics = await resTopics.json();
  console.log(`\n[TOPICS] Status: ${resTopics.status} | Total in DB: ${dataTopics.total}`);
  console.log('Sample Topic:', dataTopics.data?.[0]);

  // 3. Words & Phrases
  const resWp = await fetch(`${BASE_URL}/api/settings/words-phrases?limit=3`);
  const dataWp = await resWp.json();
  console.log(`\n[WORDS & PHRASES] Status: ${resWp.status} | Total in DB: ${dataWp.total}`);
  console.log('Sample Word & Phrase:', dataWp.data?.[0]);

  // 4. Legal Terms
  const resLt = await fetch(`${BASE_URL}/api/settings/legal-terms?limit=3`);
  const dataLt = await resLt.json();
  console.log(`\n[LEGAL TERMS] Status: ${resLt.status} | Total in DB: ${dataLt.total}`);
  console.log('Sample Legal Term:', dataLt.data?.[0]);

  // 5. Legal Maxims with all=true
  const resMaxims = await fetch(`${BASE_URL}/api/settings/legal-maxims?all=true`);
  const dataMaxims = await resMaxims.json();
  console.log(`\n[MAXIMS all=true] Status: ${resMaxims.status} | Total in DB: ${dataMaxims.total} | Returned: ${dataMaxims.data?.length}`);
  console.log('Sample Maxim:', dataMaxims.data?.[0]);

  console.log('\n--- VERIFICATION CHECKS ---');
  const checks = [
    { name: 'Articles count == 1544', pass: dataArticles.total === 1544 },
    { name: 'Topics count == 403', pass: dataTopics.total === 403 },
    { name: 'Words & Phrases count == 282', pass: dataWp.total === 282 },
    { name: 'Legal Terms count == 96', pass: dataLt.total === 96 },
    { name: 'Legal Maxims count == 1124', pass: dataMaxims.total === 1124 },
    { name: 'All 1124 Maxims returned for dropdown', pass: dataMaxims.data?.length === 1124 }
  ];

  checks.forEach(c => console.log(`${c.pass ? '✔ PASS' : '❌ FAIL'}: ${c.name}`));
}

testEndpoints().catch(console.error);
