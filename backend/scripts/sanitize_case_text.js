import mongoose from 'mongoose';
import Case from '../src/models/Case.js';

const decodeEntities = (value) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'");

const sanitize = (value) => {
  if (typeof value !== 'string') return value || '';
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system');
  let processed = 0;
  let changed = 0;
  const operations = [];

  for await (const record of Case.find({}).select('_id headNote judgment references principleLaw legalMaxim').lean().cursor()) {
    const set = {};
    for (const field of ['headNote', 'judgment', 'references', 'principleLaw', 'legalMaxim']) {
      const original = record[field] || '';
      const cleaned = sanitize(original);
      if (cleaned !== original) set[field] = cleaned;
    }
    processed += 1;
    if (Object.keys(set).length) {
      changed += 1;
      operations.push({ updateOne: { filter: { _id: record._id }, update: { $set: set } } });
    }
    if (operations.length >= 500) {
      await Case.bulkWrite(operations, { ordered: false });
      operations.length = 0;
    }
  }
  if (operations.length) await Case.bulkWrite(operations, { ordered: false });
  console.log(JSON.stringify({ processed, changed }));
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
