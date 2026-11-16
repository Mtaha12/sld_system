import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { default: mongoose } = await import('mongoose');
const { default: Case } = await import('../models/Case.js');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system');

  const indexes = await Case.collection.getIndexes();
  console.log('Case collection indexes:');
  for (const [name, spec] of Object.entries(indexes)) {
    console.log(`  - ${name}:`, JSON.stringify(spec));
  }

  await mongoose.disconnect();
}

run();

