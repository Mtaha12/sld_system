import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Case from '../src/models/Case.js';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ override: true });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Check SLD 1
  const case1 = await Case.findOne({ sldNumber: '1' }).lean();
  console.log('--- SLD 1 ---');
  console.log('sldNumber:', case1.sldNumber);
  console.log('mapYearPage:', case1.mapYearPage);
  console.log('publications:', case1.publications);
  console.log('judgment length:', case1.judgment?.length);
  console.log('judgment preview:', case1.judgment?.slice(0, 120));

  // 2. Check SLD 500
  const case500 = await Case.findOne({ sldNumber: '500' }).lean();
  console.log('\n--- SLD 500 ---');
  console.log('sldNumber:', case500.sldNumber);
  console.log('judgment length:', case500.judgment?.length);

  // 3. Check SLD 501 (should not have judgment)
  const case501 = await Case.findOne({ sldNumber: '501' }).lean();
  console.log('\n--- SLD 501 ---');
  console.log('sldNumber:', case501.sldNumber);
  console.log('judgment length:', case501.judgment?.length);

  // 4. Check Missing SLD (e.g. 14440)
  const case14440 = await Case.findOne({ sldNumber: '14440' }).lean();
  console.log('\n--- SLD 14440 (Missing Placeholder) ---');
  console.log('sldNumber:', case14440?.sldNumber);
  console.log('court:', case14440?.court);
  console.log('headNote:', case14440?.headNote);
  console.log('mapYearPage:', case14440?.mapYearPage);

  // 5. Test sorting numerically (first 10)
  const sorted = await Case.find({})
    .collation({ locale: 'en_US', numericOrdering: true })
    .sort({ sldNumber: 1 })
    .limit(10)
    .select('sldNumber mapYearPage court')
    .lean();

  console.log('\n--- First 10 sorted numerically ---');
  sorted.forEach(c => console.log(`SLD #${c.sldNumber}: ${c.mapYearPage?.join(' | ')} (${c.court})`));

  await mongoose.disconnect();
}

verify();
