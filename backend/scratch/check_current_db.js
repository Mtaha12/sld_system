import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Case from '../src/models/Case.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Case.countDocuments({});
    const totalWithDeleted = await Case.countDocuments({}).setOptions({ sanitizeFilter: false });
    // Also direct collection count
    const rawCount = await mongoose.connection.collection('cases').countDocuments({});
    console.log('Case collection raw count:', rawCount);
    const sample = await Case.find({}).limit(3).lean();
    console.log('Sample cases:', sample.map(c => ({ id: c._id, sldNumber: c.sldNumber, caseId: c.caseId })));
  } catch (err) {
    console.error('DB error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDb();
