import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import zlib from 'zlib';
import readline from 'readline';
import mongoose from 'mongoose';
import { EJSON, ObjectId } from 'bson';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BACKUP_DIR = path.resolve(__dirname, '../../database_backup');

const BATCH_SIZE = 1000;

async function importDatabase() {
  console.log('='.repeat(70));
  console.log('STARTING FULL MONGODB RESTORE / SEEDING ON VPS');
  console.log('='.repeat(70));

  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`Backup folder not found at: ${BACKUP_DIR}. Please ensure database_backup folder is copied.`);
  }

  const metaPath = path.join(BACKUP_DIR, 'metadata.json');
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Metadata file not found at: ${metaPath}`);
  }

  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  console.log(`Backup generated on: ${metadata.exportedAt}`);
  console.log(`Original database: ${metadata.databaseName}`);
  console.log(`Collections to restore: ${metadata.collections.length}\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`Connecting to VPS MongoDB: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
  await mongoose.connect(mongoUri);
  console.log('Connected successfully to MongoDB.\n');

  const db = mongoose.connection.db;

  for (let i = 0; i < metadata.collections.length; i++) {
    const collMeta = metadata.collections[i];
    const collName = collMeta.name;
    const gzFile = path.join(BACKUP_DIR, `${collName}.json.gz`);

    console.log(`[${i + 1}/${metadata.collections.length}] Restoring collection: "${collName}"...`);

    const coll = db.collection(collName);

    // If backup has 0 docs, just ensure indexes
    if (!fs.existsSync(gzFile) || collMeta.count === 0) {
      console.log(`  -> Collection "${collName}" is empty, skipping document restore.`);
      // Restore indexes if any
      if (collMeta.indexes && collMeta.indexes.length > 0) {
        for (const idx of collMeta.indexes) {
          try {
            await coll.createIndex(idx.key, { name: idx.name, ...idx });
          } catch (e) {
            // ignore index conflict
          }
        }
      }
      continue;
    }

    // Optional: Drop existing collection before restoring so there are no duplicate key errors
    try {
      await coll.drop();
      console.log(`  -> Cleared previous collection "${collName}" before fresh restore.`);
    } catch (e) {
      // Collection might not exist yet, ignore
    }

    const fileStream = fs.createReadStream(gzFile);
    const gunzip = zlib.createGunzip();
    const rl = readline.createInterface({
      input: fileStream.pipe(gunzip),
      crlfDelay: Infinity
    });

    let batch = [];
    let inserted = 0;

    for await (const line of rl) {
      if (!line || !line.trim()) continue;
      try {
        let doc;
        try {
          doc = EJSON.parse(line);
        } catch {
          doc = JSON.parse(line);
        }

        // If _id is a 24-character hex string, convert to ObjectId
        if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
          doc._id = new ObjectId(doc._id);
        }

        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
          await coll.insertMany(batch, { ordered: false });
          inserted += batch.length;
          process.stdout.write(`  ... Restored ${inserted.toLocaleString()} / ${collMeta.count.toLocaleString()} docs\r`);
          batch = [];
        }
      } catch (err) {
        console.error(`\n  [Parse/Insert Error in ${collName}]:`, err.message);
      }
    }

    if (batch.length > 0) {
      await coll.insertMany(batch, { ordered: false });
      inserted += batch.length;
    }

    console.log(`\n  -> Successfully restored "${collName}": ${inserted.toLocaleString()} documents.`);

    // Restore indexes
    if (collMeta.indexes && collMeta.indexes.length > 0) {
      console.log(`  -> Restoring ${collMeta.indexes.length} indexes for "${collName}"...`);
      for (const idx of collMeta.indexes) {
        try {
          const options = { ...idx };
          delete options.key;
          delete options.v;
          delete options.ns;
          await coll.createIndex(idx.key, options);
        } catch (idxErr) {
          console.warn(`     Warning creating index ${idx.name} on ${collName}:`, idxErr.message);
        }
      }
      console.log(`  -> Indexes restored.`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('ALL DATA & INDEXES SUCCESSFULLY RESTORED INTO VPS MONGODB!');
  console.log('='.repeat(70));

  process.exit(0);
}

importDatabase().catch(err => {
  console.error('[Restore Failed]:', err);
  process.exit(1);
});
