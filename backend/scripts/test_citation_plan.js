import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testCitationPlan() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  console.log('Testing 134 TAX 1 queries:');

  // Query A: Current buildCitationQuery
  const t0 = Date.now();
  const qA = {
    isDeleted: false,
    $or: [
      { mapYearPage: { $regex: '(?:\\(\\d{4}\\)\\s+)?134\\s+TAX\\s+1(?:$|\\b)', $options: 'i' } },
      { publications: { $elemMatch: { mag: /^TAX$/i, vol: '134', page: '1' } } }
    ]
  };
  const expA = await coll.find(qA).explain('executionStats');
  console.log('Query A (Current):');
  console.log('  Time ms:', Date.now() - t0);
  console.log('  Exec time ms:', expA.executionStats.executionTimeMillis);
  console.log('  Docs examined:', expA.executionStats.totalDocsExamined);
  console.log('  Keys examined:', expA.executionStats.totalKeysExamined);
  console.log('  nReturned:', expA.executionStats.nReturned);

  // Query B: Optimized using page index or exact mapYearPage
  const t1 = Date.now();
  const qB = {
    isDeleted: false,
    'publications.page': '1',
    $or: [
      { 'publications.mag': { $regex: /^TAX$/i }, 'publications.vol': '134' },
      { mapYearPage: { $regex: /134\s+TAX\s+1/i } }
    ]
  };
  const expB = await coll.find(qB).hint({ 'publications.page': 1, 'publications.year': 1 }).explain('executionStats');
  console.log('\nQuery B (Optimized with page index):');
  console.log('  Time ms:', Date.now() - t1);
  console.log('  Exec time ms:', expB.executionStats.executionTimeMillis);
  console.log('  Docs examined:', expB.executionStats.totalDocsExamined);
  console.log('  Keys examined:', expB.executionStats.totalKeysExamined);
  console.log('  nReturned:', expB.executionStats.nReturned);

  await mongoose.disconnect();
}

testCitationPlan();
