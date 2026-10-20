import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function checkBlocks() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('statutes');
  const sample = await coll.find({ 'blocks.1': { $exists: true } }, { projection: { srNumber: 1, law: 1, section: 1, blocks: 1 } }).limit(5).toArray();
  sample.forEach(s => {
    console.log('Statute:', s.srNumber, 'Sec:', s.section, 'Blocks count:', s.blocks?.length);
    s.blocks?.forEach((b, i) => console.log('  Block', i, 'fromDate:', b.fromDate, 'toDate:', b.toDate, 'heading:', b.sectionHeading?.slice(0, 30)));
  });
  await mongoose.disconnect();
}
checkBlocks();
