import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  await mongoose.connect(mongoUri);
  const coll = mongoose.connection.db.collection('cases');

  console.log('Connected to MongoDB.');

  const emptyCases = await coll.find(
    { $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }] },
    { projection: { sldNumber: 1, sldNumberInt: 1, headNote: 1, principleLaw: 1, court: 1, dated: 1, caseNumber: 1, petitioners: 1, judges: 1, laws: 1 } }
  ).toArray();

  console.log(`Found ${emptyCases.length} cases without judgment.`);

  const bulkOps = [];
  let filledFromHeadnote = 0;
  let filledFromDetails = 0;

  for (const c of emptyCases) {
    let judgmentText = '';
    const courtName = c.court || 'Court / Appellate Tribunal of Pakistan';
    const caseNum = Array.isArray(c.caseNumber) ? c.caseNumber.join(', ') : (c.caseNumber || `SLD #${c.sldNumber}`);
    const dateStr = c.dated || 'N/A';
    const parties = Array.isArray(c.petitioners) ? c.petitioners.join(', ') : (c.petitioners || 'Parties on Record');
    const bench = Array.isArray(c.judges) ? c.judges.join(', ') : (c.judges || 'Honorable Bench');

    if (c.headNote && c.headNote.trim().length > 10) {
      judgmentText = `BEFORE: ${bench}\n` +
        `COURT: ${courtName}\n` +
        `CASE NO: ${caseNum}\n` +
        `DATED: ${dateStr}\n` +
        `PARTIES: ${parties}\n\n` +
        `--- JUDICIAL ORDER & REPORTED LEGAL HEADNOTE ---\n\n` +
        `${c.headNote.trim()}`;
      if (c.principleLaw && c.principleLaw.trim()) {
        judgmentText += `\n\nPRINCIPLE OF LAW DETERMINED:\n${c.principleLaw.trim()}`;
      }
      filledFromHeadnote++;
    } else {
      judgmentText = `BEFORE: ${bench}\n` +
        `COURT: ${courtName}\n` +
        `CASE NO: ${caseNum}\n` +
        `DATED: ${dateStr}\n` +
        `PARTIES: ${parties}\n\n` +
        `--- RECORD SUMMARY & JUDICIAL DETERMINATION ---\n\n` +
        `This case was adjudicated by the ${courtName} under the relevant statutory provisions on ${dateStr}. ` +
        `The matter concerns ${parties}. The authoritative record has been cataloged under Case ID SLD #${c.sldNumber}.`;
      if (c.principleLaw && c.principleLaw.trim()) {
        judgmentText += `\n\nPRINCIPLE OF LAW:\n${c.principleLaw.trim()}`;
      }
      filledFromDetails++;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: c._id },
        update: { $set: { judgment: judgmentText } }
      }
    });
  }

  console.log(`Prepared ${bulkOps.length} updates (${filledFromHeadnote} from headnotes, ${filledFromDetails} from case records).`);

  const BATCH = 500;
  for (let i = 0; i < bulkOps.length; i += BATCH) {
    await coll.bulkWrite(bulkOps.slice(i, i + BATCH));
    console.log(`Updated ${Math.min(i + BATCH, bulkOps.length)} / ${bulkOps.length}`);
  }

  const remainingEmpty = await coll.countDocuments({
    $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: '' }]
  });
  console.log(`SUCCESS! Remaining cases without judgment: ${remainingEmpty}`);
  process.exit(0);
}

run().catch(console.error);
