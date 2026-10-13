import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';
import SectionSetting from '../models/SectionSetting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const seedSections = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    }

    const count = await SectionSetting.countDocuments();
    console.log(`Current SectionSetting count in DB: ${count}`);

    const excelPath = path.resolve(__dirname, '../../../SECTIONS.xlsx');
    console.log(`Reading Excel file from: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Read ${rows.length} rows from sheet "${sheetName}"`);

    const uniqueMap = new Map();
    for (const r of rows) {
      const name = String(r['Section Name'] ?? '').trim();
      const ordering = Number(r['Ord #']) || 1;
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!uniqueMap.has(lower)) {
        uniqueMap.set(lower, {
          name,
          ordering,
          status: 'active',
        });
      }
    }

    const itemsToInsert = Array.from(uniqueMap.values());
    console.log(`Prepared ${itemsToInsert.length} unique section items`);

    if (count === 0) {
      console.log('Inserting sections in batches of 1000...');
      for (let i = 0; i < itemsToInsert.length; i += 1000) {
        const batch = itemsToInsert.slice(i, i + 1000);
        await SectionSetting.insertMany(batch, { ordered: false });
      }
      console.log(`Successfully seeded ${itemsToInsert.length} sections!`);
    } else {
      console.log(`Database already has ${count} sections. Upserting any missing sections...`);
      let inserted = 0;
      for (const item of itemsToInsert) {
        const exists = await SectionSetting.findOne({ name: item.name });
        if (!exists) {
          await SectionSetting.create(item);
          inserted++;
        }
      }
      console.log(`Upsert complete. Added ${inserted} new sections.`);
    }

    const finalCount = await SectionSetting.countDocuments();
    console.log(`Final SectionSetting count in DB: ${finalCount}`);
    return finalCount;
  } catch (err) {
    console.error('Error seeding sections:', err);
    throw err;
  }
};

if (process.argv[1] && process.argv[1].endsWith('seedSections.js')) {
  seedSections()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
