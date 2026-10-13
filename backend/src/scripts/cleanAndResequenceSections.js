import mongoose from 'mongoose';
import SectionSetting from '../models/SectionSetting.js';

const run = async () => {
  await mongoose.connect('mongodb://localhost:27017/sld_system');
  console.log('Connected to MongoDB');

  // Fix typo names like '(1A)', '(1B)', '(5ABA)'
  await SectionSetting.updateOne({ name: '(1A)' }, { $set: { name: '1(A)' } });
  await SectionSetting.updateOne({ name: '(1B)' }, { $set: { name: '1(B)' } });
  await SectionSetting.updateOne({ name: '(5ABA)' }, { $set: { name: '5(ABA)' } });

  // Resequence all sections cleanly
  const all = await SectionSetting.find().sort({ ordering: 1, _id: 1 });
  console.log(`Resequencing ${all.length} sections...`);

  const bulkOps = [];
  for (let i = 0; i < all.length; i++) {
    const sec = all[i];
    let cleanName = sec.name.replace(/^\s*(?:section|sec\.?|s\.)\s*/i, '').trim();
    if (cleanName.startsWith('(') && cleanName.endsWith(')')) {
      const inner = cleanName.slice(1, -1);
      if (/^[0-9]+[A-Za-z0-9]*$/.test(inner)) {
        cleanName = inner;
      }
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: sec._id },
        update: {
          $set: {
            name: cleanName,
            ordering: i + 1
          }
        }
      }
    });
  }

  if (bulkOps.length > 0) {
    await SectionSetting.bulkWrite(bulkOps);
  }

  console.log('All sections cleaned and resequenced successfully!');
  const check1B = await SectionSetting.findOne({ name: '1(B)' }).lean();
  console.log('Check 1(B):', check1B);

  await mongoose.disconnect();
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
