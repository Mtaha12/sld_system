import mongoose from 'mongoose';

async function checkRanges() {
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  console.log('Auditing judgment counts per 10,000 block:');
  for (let s = 1; s <= 165000; s += 10000) {
    const e = Math.min(s + 9999, 165278);
    const total = await coll.countDocuments({ sldNumberInt: { $gte: s, $lte: e } });
    const withJ = await coll.countDocuments({ sldNumberInt: { $gte: s, $lte: e }, judgment: { $exists: true, $ne: '' } });
    console.log(`SLD ${s} .. ${e} -> Total: ${total}, With Judgment: ${withJ} (${Math.round(withJ/total*100)}%)`);
  }

  process.exit(0);
}

checkRanges().catch(console.error);
