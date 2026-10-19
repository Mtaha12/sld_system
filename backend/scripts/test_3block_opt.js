import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function test3Block() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  const yv = '2026';
  const mg = 'SLD';
  const pg = '3418';

  const t0 = Date.now();
  const q = {
    isDeleted: false,
    'publications.page': pg,
    $or: [
      { mapYearPage: new RegExp(`(^|\\s)${yv}\\s+${mg}\\s+${pg}(\\s|$)`, 'i') },
      {
        publications: {
          $elemMatch: {
            mag: { $regex: `^${mg}$`, $options: 'i' },
            page: pg,
            $or: [{ year: yv }, { vol: yv }]
          }
        }
      }
    ]
  };

  const results = await coll.find(q).toArray();
  console.log('3-block search time:', Date.now() - t0, 'ms | Found:', results.length, 'cases:');
  results.forEach(r => console.log(' -', r.sldNumber, r.court, r.mapYearPage));
  process.exit(0);
}
test3Block();
