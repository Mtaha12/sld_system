/**
 * Database Index Synchronization Script
 * Builds missing compound and search indexes across collections safely.
 */

import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Case from '../models/Case.js';
import OtherCaseLaw from '../models/OtherCaseLaw.js';
import Notification from '../models/Notification.js';
import Statute from '../models/Statute.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';

async function syncIndexes() {
  console.log(`Connecting to ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.\n');

  console.log('Syncing Case indexes...');
  await Case.syncIndexes();
  console.log('Case indexes synchronized.');

  console.log('Syncing OtherCaseLaw indexes...');
  await OtherCaseLaw.syncIndexes();
  console.log('OtherCaseLaw indexes synchronized.');

  console.log('Syncing Notification indexes...');
  await Notification.syncIndexes();
  console.log('Notification indexes synchronized.');

  console.log('Syncing Statute indexes...');
  await Statute.syncIndexes();
  console.log('Statute indexes synchronized.');

  console.log('\nAll database indexes synchronized successfully.');
  await mongoose.disconnect();
}

syncIndexes().catch(err => {
  console.error('Error syncing indexes:', err);
  process.exit(1);
});
