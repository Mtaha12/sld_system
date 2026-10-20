import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import Case from '../src/models/Case.js';

const csv = (value) => `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
const output = path.resolve(process.cwd(), '..', 'missing-judgments.csv');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system');
  const stream = fs.createWriteStream(output, { encoding: 'utf8' });
  stream.write('SLD Number,Case ID,Court,Case Number,Citation,Headnote\r\n');
  let count = 0;
  for await (const record of Case.find({
    isDeleted: { $ne: true },
    $or: [{ judgment: { $exists: false } }, { judgment: null }, { judgment: /^\s*$/ }]
  }).select('sldNumber caseId court caseNumber mapYearPage headNote').sort({ sldNumberInt: 1 }).lean().cursor()) {
    stream.write([
      csv(record.sldNumber),
      csv(record.caseId),
      csv(record.court),
      csv(Array.isArray(record.caseNumber) ? record.caseNumber.join('; ') : record.caseNumber),
      csv(Array.isArray(record.mapYearPage) ? record.mapYearPage.join('; ') : record.mapYearPage),
      csv(record.headNote)
    ].join(',') + '\r\n');
    count += 1;
  }
  await new Promise((resolve, reject) => {
    stream.once('finish', resolve);
    stream.once('error', reject);
    stream.end();
  });
  await mongoose.disconnect();
  console.log(JSON.stringify({ count, output }));
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
