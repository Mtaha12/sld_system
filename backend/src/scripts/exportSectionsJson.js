import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import SectionSetting from '../models/SectionSetting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exportJson = async () => {
  await mongoose.connect('mongodb://localhost:27017/sld_system');
  console.log('Connected to MongoDB');

  const sections = await SectionSetting.find({ status: 'active' }).sort({ ordering: 1 }).lean();
  console.log(`Exporting ${sections.length} active sections...`);

  const allNames = sections.map(s => s.name);

  const jsContent = `/**
 * Pre-compiled statutory sections list (Generated from SectionSetting collection)
 * Contains all ${allNames.length} unique statutory sections.
 */

export const ALL_SECTIONS = ${JSON.stringify(allNames, null, 2)};

export const SECTION_OPTIONS = ALL_SECTIONS.map((name) => ({
  value: name,
  label: name
}));

export default ALL_SECTIONS;
`;

  const outputPath = path.resolve(__dirname, '../../../frontend/src/data/sections.js');
  fs.writeFileSync(outputPath, jsContent, 'utf8');
  console.log(`Saved ${allNames.length} clean sections to ${outputPath}`);

  await mongoose.disconnect();
};

exportJson().catch(err => {
  console.error(err);
  process.exit(1);
});
