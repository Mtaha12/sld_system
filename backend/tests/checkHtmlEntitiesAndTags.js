import mongoose from 'mongoose';

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  const coll = mongoose.connection.db.collection('cases');

  const withLt = await coll.countDocuments({ judgment: { $regex: /&lt;|&gt;/i } });
  const withHnLt = await coll.countDocuments({ headNote: { $regex: /&lt;|&gt;/i } });
  const withDoctype = await coll.countDocuments({ judgment: { $regex: /<!DOCTYPE|<html|<head|<body/i } });
  const withAnyTag = await coll.countDocuments({ judgment: { $regex: /<[^>]+>/ } });
  const hnWithAnyTag = await coll.countDocuments({ headNote: { $regex: /<[^>]+>/ } });

  console.log('Judgment with &lt; or &gt;:', withLt);
  console.log('HeadNote with &lt; or &gt;:', withHnLt);
  console.log('Judgment with <!DOCTYPE or <html or <head:', withDoctype);
  console.log('Judgment with any <...>: ', withAnyTag);
  console.log('HeadNote with any <...>: ', hnWithAnyTag);

  if (withLt > 0) {
    const doc = await coll.findOne({ judgment: { $regex: /&lt;|&gt;/i } });
    const idx = doc.judgment.indexOf('&lt;');
    console.log('Sample &lt; in judgment (SLD ' + doc.sldNumber + '):', doc.judgment.slice(Math.max(0, idx - 50), idx + 100));
  }

  if (withAnyTag > 0) {
    const doc = await coll.findOne({ judgment: { $regex: /<[^>]+>/ } });
    const match = doc.judgment.match(/<[^>]+>/);
    console.log('Sample <...> in judgment (SLD ' + doc.sldNumber + '):', match ? match[0] : 'none');
  }

  process.exit(0);
}

check().catch(console.error);
