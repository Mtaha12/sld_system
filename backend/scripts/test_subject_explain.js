import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testExplain() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  const exp = await coll.find({
    isDeleted: false,
    'publications.page': '1',
    $or: [
      { mapYearPage: /(?:\(\d{4}\)\s+)?134\s+TAX\s+1(?:$|\b)/i },
      { publications: { $elemMatch: { mag: /^TAX$/i, vol: '134', page: '1' } } }
    ]
  })
  .hint({ 'publications.page': 1, 'publications.year': 1 })
  .project({ caseId: 1, sldNumber: 1, court: 1, sldNumberInt: 1, mapYearPage: 1 })
  .sort({ sldNumberInt: -1 })
  .explain('executionStats');

  console.log('Exec time WITH HINT & PROJECT:', exp.executionStats.executionTimeMillis, 'ms');
  console.log('Docs examined:', exp.executionStats.totalDocsExamined);
  console.log('Keys examined:', exp.executionStats.totalKeysExamined);
  console.log('Stage:', exp.executionStats.executionStages.stage);
  process.exit(0);
}
testExplain();
