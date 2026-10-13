import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Case = mongoose.connection.collection('cases');
  const result = await Case.aggregate([
    { $match: { isDeleted: { $ne: true } } },
    { $unwind: '$publications' },
    {
      $match: {
        'publications.year': '2026',
        'publications.mag': { $regex: '^sld$', $options: 'i' }
      }
    },
    {
      $group: {
        _id: null,
        maxPage: {
          $max: {
            $convert: {
              input: '$publications.page',
              to: 'int',
              onError: 0,
              onNull: 0
            }
          }
        }
      }
    }
  ]).toArray();
  console.log('Result for 2026 SLD:', result);
  await mongoose.disconnect();
}
run();
