import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import zlib from 'zlib';
import mongoose from 'mongoose';
import { EJSON } from 'bson';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BACKUP_DIR = path.resolve(__dirname, '../../database_backup');

async function exportDatabase() {
  console.log('='.repeat(70));
  console.log('STARTING FULL MONGODB EXPORT FOR VPS DEPLOYMENT');
  console.log('='.repeat(70));

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
  await mongoose.connect(mongoUri);
  console.log('Connected successfully.\n');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  const metadata = {
    exportedAt: new Date().toISOString(),
    databaseName: db.databaseName,
    collections: []
  };

  console.log(`Found ${collections.length} collections to export.\n`);

  for (let i = 0; i < collections.length; i++) {
    const collInfo = collections[i];
    const collName = collInfo.name;
    const coll = db.collection(collName);
    const count = await coll.countDocuments();

    console.log(`[${i + 1}/${collections.length}] Exporting "${collName}" (${count.toLocaleString()} docs)...`);

    // Fetch indexes
    let indexes = [];
    try {
      indexes = await coll.indexes();
    } catch (e) {
      console.warn(`  Could not read indexes for ${collName}`);
    }

    metadata.collections.push({
      name: collName,
      count,
      indexes: indexes.filter(idx => idx.name !== '_id_') // exclude default _id
    });

    if (count === 0) {
      console.log(`  -> Empty collection, saved metadata only.`);
      continue;
    }

    // Export with Gzip compression for high speed and minimal file size
    const outFilePath = path.join(BACKUP_DIR, `${collName}.json.gz`);
    const writeStream = fs.createWriteStream(outFilePath);
    const gzipStream = zlib.createGzip({ level: 6 });

    writeStream.on('error', (err) => console.error(`Write error for ${collName}:`, err));
    gzipStream.on('error', (err) => console.error(`Gzip error for ${collName}:`, err));

    gzipStream.pipe(writeStream);

    const cursor = coll.find({});
    let written = 0;

    for await (const doc of cursor) {
      gzipStream.write(EJSON.stringify(doc) + '\n');
      written++;
      if (written % 20000 === 0) {
        process.stdout.write(`  ... ${written.toLocaleString()} / ${count.toLocaleString()} written\r`);
      }
    }

    gzipStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    const stats = fs.statSync(outFilePath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  -> Finished "${collName}": ${written.toLocaleString()} docs -> ${sizeMb} MB compressed (${collName}.json.gz)`);
  }

  // Save metadata file
  const metaPath = path.join(BACKUP_DIR, 'metadata.json');
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`\nMetadata saved to: ${metaPath}`);

  console.log('\n' + '='.repeat(70));
  console.log('DATABASE EXPORT COMPLETED SUCCESSFULLY!');
  console.log(`Backup Location: ${BACKUP_DIR}`);
  console.log('='.repeat(70));

  process.exit(0);
}

exportDatabase().catch(err => {
  console.error('[Export Failed]:', err);
  process.exit(1);
});
