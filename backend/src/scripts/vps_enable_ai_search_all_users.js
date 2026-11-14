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
  '/var/www/sld-system/backend/.env'
];

for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    dotenv.config({ path: ep });
    break;
  }
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`\n==========================================================`);
  console.log(`   SLD SYSTEM - ENABLING AI SEARCH FOR ALL USERS          `);
  console.log(`==========================================================`);
  console.log(`Connecting to: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const total = await db.collection('users').countDocuments();
  const notTrue = await db.collection('users').countDocuments({ aiAssistant: { $ne: true } });
  console.log(`Total users in database: ${total}`);
  console.log(`Users currently without aiAssistant=true: ${notTrue}`);

  const res = await db.collection('users').updateMany(
    {},
    { $set: { aiAssistant: true } }
  );

  console.log(`✓ Updated ${res.modifiedCount} user records to aiAssistant: true.`);
  console.log(`✓ All users (existing & new) now have AI Search enabled by default.`);
  console.log(`==========================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Error] Failed to enable AI search:', err);
  process.exit(1);
});
