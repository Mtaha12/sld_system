import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testPlans() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  console.log('Testing explain with hint vs without hint...');

  // Test 1: caseNumber search with hint
  try {
    const t0 = Date.now();
    const exp1 = await coll.find({
      isDeleted: false,
      caseNumber: /389/i
    })
    .hint({ isDeleted: 1, caseNumber: 1 })
    .limit(25)
    .explain('executionStats');
    console.log('Test 1 (WITH HINT):');
    console.log('  Time ms:', Date.now() - t0);
    console.log('  Exec time ms:', exp1.executionStats.executionTimeMillis);
    console.log('  Docs examined:', exp1.executionStats.totalDocsExamined);
    console.log('  Keys examined:', exp1.executionStats.totalKeysExamined);
    console.log('  nReturned:', exp1.executionStats.nReturned);
  } catch (err) {
    console.error('Test 1 error:', err.message);
  }

  // Test 2: Search by citation
  try {
    const t0 = Date.now();
    const exp2 = await coll.find({
      isDeleted: false,
      mapYearPage: '2023 SLD 90'
    })
    .hint({ isDeleted: 1, mapYearPage: 1 })
    .limit(25)
    .explain('executionStats');
    console.log('\nTest 2 (CITATION WITH HINT):');
    console.log('  Time ms:', Date.now() - t0);
    console.log('  Exec time ms:', exp2.executionStats.executionTimeMillis);
    console.log('  Docs examined:', exp2.executionStats.totalDocsExamined);
    console.log('  Keys examined:', exp2.executionStats.totalKeysExamined);
    console.log('  nReturned:', exp2.executionStats.nReturned);
  } catch (err) {
    console.error('Test 2 error:', err.message);
  }

  await mongoose.disconnect();
}

testPlans();
