import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function find4841() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const Case = mongoose.connection.collection('cases');
  const all4841 = await Case.find({
    $or: [
      { 'publications.page': '4841' },
      { 'publications.page': 4841 },
      { mapYearPage: { $regex: '4841' } },
      { sldNumber: '4841' },
      { sldNumberInt: 4841 }
    ]
  }).toArray();

  console.log('All docs with 4841:', all4841.map(d => ({
    _id: d._id,
    sldNumber: d.sldNumber,
    isDeleted: d.isDeleted,
    mapYearPage: d.mapYearPage,
    publications: d.publications,
    caseNumber: d.caseNumber
  })));

  await mongoose.disconnect();
}
find4841();

