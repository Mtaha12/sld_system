import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  const c = { vol: '134', mag: 'TAX', page: '1' };
  const cleanMag = c.mag;
  const cleanPage = String(c.page).trim();
  const cleanVol = String(c.vol).trim();

  const or = [
    { mapYearPage: { $regex: `(?:\\(\\d{4}\\)\\s+)?${cleanVol}\\s+${cleanMag}\\s+${cleanPage}(?:$|\\b)`, $options: 'i' } },
    { publications: { $elemMatch: { mag: { $regex: `^${cleanMag}$`, $options: 'i' }, vol: cleanVol, page: cleanPage } } }
  ];

  const qOpt = {
    isDeleted: false,
    'publications.page': cleanPage,
    $or: or
  };

  const t0 = Date.now();
  const results = await coll.find(qOpt).toArray();
  const time = Date.now() - t0;
  console.log('Results count:', results.length, 'Time ms:', time);
  results.forEach(r => console.log(' - Case:', r.sldNumber, r.court, r.mapYearPage));
  process.exit(0);
}
verify();
