import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function testSubjectNum() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  const q = '146232';
  const num = parseInt(q, 10);

  const t0 = Date.now();
  const res = await coll.find({
    isDeleted: false,
    $or: [
      { sldNumberInt: num },
      { sldNumber: q },
      { caseId: 'CASE-' + q }
    ]
  }).toArray();
  const time = Date.now() - t0;
  console.log('Numeric subject lookup time ms:', time, 'Found:', res.length);
  process.exit(0);
}
testSubjectNum();
