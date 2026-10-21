import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

export async function resequenceArticles() {
  const isConnectedHere = mongoose.connection.readyState !== 1;
  if (isConnectedHere) {
    await mongoose.connect(MONGO_URI);
  }

  const articles = await mongoose.connection.db.collection('articles').find().toArray();
  console.log(`[Resequence Articles] Found ${articles.length} total articles.`);

  // Sort articles strictly by year descending (2026, 2025, ...), then by previous srNumber or title
  articles.sort((a, b) => {
    const yA = parseInt(String(a.year || '').replace(/\D/g, ''), 10) || 0;
    const yB = parseInt(String(b.year || '').replace(/\D/g, ''), 10) || 0;
    if (yB !== yA) return yB - yA;
    const srA = typeof a.srNumber === 'number' ? a.srNumber : 0;
    const srB = typeof b.srNumber === 'number' ? b.srNumber : 0;
    if (srA !== srB) return srA - srB;
    return (a.title || '').localeCompare(b.title || '');
  });

  const bulkOps = articles.map((art, idx) => ({
    updateOne: {
      filter: { _id: art._id },
      update: {
        $set: {
          srNumber: idx + 1
        }
      }
    }
  }));

  if (bulkOps.length > 0) {
    const res = await mongoose.connection.db.collection('articles').bulkWrite(bulkOps);
    console.log(`[Resequence Articles] Matched ${res.matchedCount}, modified ${res.modifiedCount} articles.`);
  }

  const sample = await mongoose.connection.db.collection('articles')
    .find()
    .sort({ srNumber: 1 })
    .limit(10)
    .project({ srNumber: 1, year: 1, title: 1 })
    .toArray();

  console.log('\nTop 10 Resequenced Articles (Year Descending):');
  sample.forEach(s => console.log(`  SR# ${s.srNumber} [${s.year}] - ${s.title?.slice(0, 45)}`));

  const bottom = await mongoose.connection.db.collection('articles')
    .find()
    .sort({ srNumber: -1 })
    .limit(5)
    .project({ srNumber: 1, year: 1, title: 1 })
    .toArray();

  console.log('\nBottom 5 Resequenced Articles:');
  bottom.reverse().forEach(s => console.log(`  SR# ${s.srNumber} [${s.year}] - ${s.title?.slice(0, 45)}`));

  if (isConnectedHere) {
    await mongoose.disconnect();
  }
}

// If run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('resequenceArticles.js')) {
  resequenceArticles()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error resequencing articles:', err);
      process.exit(1);
    });
}
