import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testTextVsRegex() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  console.log('--- TEST: TEXT INDEX SEARCH VS REGEX SCAN ---');

  // Text index search (headnote, principleLaw, etc.)
  const t0 = Date.now();
  const textExplain = await coll.find({
    isDeleted: false,
    $text: { $search: 'sales tax exemption' }
  })
  .limit(25)
  .explain('executionStats');
  const textTime = Date.now() - t0;

  console.log('Text Index Search:');
  console.log('  Total Wall Time ms:', textTime);
  console.log('  DB Exec Time ms:', textExplain.executionStats.executionTimeMillis);
  console.log('  Docs Examined:', textExplain.executionStats.totalDocsExamined);
  console.log('  Keys Examined:', textExplain.executionStats.totalKeysExamined);
  console.log('  Stage:', textExplain.executionStats.executionStages.stage);
  console.log('  nReturned:', textExplain.executionStats.nReturned);

  await mongoose.disconnect();
}

testTextVsRegex();
