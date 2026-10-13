import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function check() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  await mongoose.connect(mongoUri);
  const coll = mongoose.connection.db.collection('cases');
  const total = await coll.countDocuments();
  const withJ = await coll.countDocuments({ judgment: { $exists: true, $nin: [null, ''] } });
  const withoutJ = await coll.countDocuments({ $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }] });
  console.log('Total cases in DB:', total);
  console.log('Cases with judgment:', withJ);
  console.log('Cases without judgment:', withoutJ);

  const minMax = await coll.aggregate([
    { $group: { _id: null, minSld: { $min: '$sldNumberInt' }, maxSld: { $max: '$sldNumberInt' } } }
  ]).toArray();
  console.log('Min/Max SLD:', minMax);

  const sampleNoJ = await coll.find(
    { $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }] },
    { projection: { sldNumber: 1, sldNumberInt: 1, title: 1, citation: 1 } }
  ).limit(10).toArray();
  console.log('Sample without judgment:', sampleNoJ);

  process.exit(0);
}
check().catch(console.error);
