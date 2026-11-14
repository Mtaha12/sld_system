#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
  '/var/www/sld_system/backend/.env',
  '/var/www/sld-system/backend/.env',
  '/var/www/sldsystem.com/backend/.env',
  '/var/www/api.sldsystem.com/backend/.env',
  '/var/www/sldsystemspk.com/backend/.env',
  '/var/www/api.sldsystemspk.com/backend/.env'
];

for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    dotenv.config({ path: ep });
    break;
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`\n================================================================`);
  console.log(`   SLD SYSTEM - MONGODB ATTACHMENT DIAGNOSTICS                 `);
  console.log(`================================================================`);
  console.log(`Connecting to: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = ['cases', 'statutes', 'notifications', 'newsletters', 'downloads', 'othercaselaws'];

  for (const colName of collections) {
    console.log(`\n--- Collection: [${colName}] ---`);
    const total = await db.collection(colName).countDocuments();
    console.log(`Total records: ${total}`);

    // Check for different domain patterns
    const spkCount = await db.collection(colName).countDocuments({
      $or: [
        { 'attachments.url': { $regex: /sldsystemspk\.com/i } },
        { 'attachments': { $regex: /sldsystemspk\.com/i } },
        { 'attachment': { $regex: /sldsystemspk\.com/i } },
        { 'attachment.url': { $regex: /sldsystemspk\.com/i } },
        { 'blocks.attachments.url': { $regex: /sldsystemspk\.com/i } },
        { 'downloadLink': { $regex: /sldsystemspk\.com/i } }
      ]
    });

    const pkCount = await db.collection(colName).countDocuments({
      $or: [
        { 'attachments.url': { $regex: /sldsystempk\.com/i } },
        { 'attachments': { $regex: /sldsystempk\.com/i } },
        { 'attachment': { $regex: /sldsystempk\.com/i } },
        { 'attachment.url': { $regex: /sldsystempk\.com/i } },
        { 'blocks.attachments.url': { $regex: /sldsystempk\.com/i } },
        { 'downloadLink': { $regex: /sldsystempk\.com/i } }
      ]
    });

    const newDomainCount = await db.collection(colName).countDocuments({
      $or: [
        { 'attachments.url': { $regex: /api\.sldsystem\.com/i } },
        { 'attachments': { $regex: /api\.sldsystem\.com/i } },
        { 'attachment': { $regex: /api\.sldsystem\.com/i } },
        { 'attachment.url': { $regex: /api\.sldsystem\.com/i } },
        { 'blocks.attachments.url': { $regex: /api\.sldsystem\.com/i } },
        { 'downloadLink': { $regex: /api\.sldsystem\.com/i } }
      ]
    });

    const relativeCount = await db.collection(colName).countDocuments({
      $or: [
        { 'attachments.url': { $regex: /^\/uploads\//i } },
        { 'attachments': { $regex: /^\/uploads\//i } },
        { 'attachment': { $regex: /^\/uploads\//i } },
        { 'attachment.url': { $regex: /^\/uploads\//i } },
        { 'blocks.attachments.url': { $regex: /^\/uploads\//i } },
        { 'downloadLink': { $regex: /^\/uploads\//i } }
      ]
    });

    console.log(`  - With 'sldsystemspk.com': ${spkCount}`);
    console.log(`  - With 'sldsystempk.com':  ${pkCount}`);
    console.log(`  - With 'api.sldsystem.com': ${newDomainCount}`);
    console.log(`  - With relative '/uploads/': ${relativeCount}`);

    // Fetch sample records
    const sample = await db.collection(colName).find({
      $or: [
        { attachments: { $exists: true, $not: { $size: 0 } } },
        { attachment: { $exists: true, $nin: ['', null] } },
        { 'blocks.attachments': { $exists: true, $not: { $size: 0 } } },
        { downloadLink: { $exists: true, $nin: ['', null] } }
      ]
    }).limit(3).toArray();

    if (sample.length > 0) {
      console.log(`  Sample attachments:`);
      for (const s of sample) {
        const id = s.sldNumber || s.srNumber || s._id;
        const att = s.attachments || s.attachment || s.downloadLink || s.blocks?.[0]?.attachments;
        console.log(`    [#${id}]:`, JSON.stringify(att).slice(0, 140));
      }
    }
  }

  await mongoose.disconnect();
  console.log(`\n================================================================\n`);
  process.exit(0);
}

run().catch(err => {
  console.error('[Error]', err);
  process.exit(1);
});

