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

/**
 * Normalizes legacy domain URLs (both sldsystemspk.com and sldsystempk.com)
 * and fixes spaced/malformed UUID filenames
 */
const normalizeUrlString = (str) => {
  if (!str || typeof str !== 'string') return str;
  let s = str.trim();

  // 1. Domain normalization:
  // Matches sldsystemspk.com, api.sldsystemspk.com, www.sldsystemspk.com,
  // sldsystempk.com, api.sldsystempk.com, portal.sldsystem.com -> https://api.sldsystem.com
  s = s.replace(/https?:\/\/(?:[a-zA-Z0-9_-]+\.)?sldsystems?pk\.com(?::\d+)?/gi, 'https://api.sldsystem.com');
  s = s.replace(/https?:\/\/portal\.sldsystem\.com(?::\d+)?/gi, 'https://api.sldsystem.com');
  s = s.replace(/http:\/\/api\.sldsystem\.com(?::\d+)?/gi, 'https://api.sldsystem.com');

  // 2. Fix spaces or %20 inside UUID attachment filenames
  // e.g. "af951f65 7866 44ab 82e0 a9a513364e12.pdf" -> "af951f65-7866-44ab-82e0-a9a513364e12.pdf"
  s = s.replace(
    /\/uploads\/reference_views\/([0-9a-f]{8})(?:%20|[ +_\-])([0-9a-f]{4})(?:%20|[ +_\-])([0-9a-f]{4})(?:%20|[ +_\-])([0-9a-f]{4})(?:%20|[ +_\-])([0-9a-f]{12})\.([a-z0-9]+)/gi,
    '/uploads/reference_views/$1-$2-$3-$4-$5.$6'
  );

  return s;
};

const normalizeAttachmentItem = (att) => {
  if (!att) return att;
  if (typeof att === 'string') {
    return normalizeUrlString(att);
  }
  if (typeof att === 'object') {
    const copy = { ...att };
    if (copy.url) copy.url = normalizeUrlString(copy.url);
    if (copy.path) copy.path = normalizeUrlString(copy.path);
    if (copy.raw) {
      if (typeof copy.raw === 'string') {
        copy.raw = normalizeUrlString(copy.raw);
      } else if (typeof copy.raw === 'object' && copy.raw.url) {
        copy.raw = { ...copy.raw, url: normalizeUrlString(copy.raw.url) };
      }
    }
    // Also clean name if it had spaced UUID
    if (copy.name && /^[0-9a-f]{8}[ +_\-][0-9a-f]{4}/i.test(copy.name)) {
      copy.name = copy.name.replace(
        /^([0-9a-f]{8})(?:%20|[ +_\-])([0-9a-f]{4})(?:%20|[ +_\-])([0-9a-f]{4})(?:%20|[ +_\-])([0-9a-f]{4})(?:%20|[ +_\-])([0-9a-f]{12})\.([a-z0-9]+)$/i,
        '$1-$2-$3-$4-$5.$6'
      );
    }
    return copy;
  }
  return att;
};

const normalizeAttachmentList = (list) => {
  if (!Array.isArray(list)) return list;
  return list.map(normalizeAttachmentItem);
};

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`\n================================================================`);
  console.log(`   SLD SYSTEM - MIGRATING ATTACHMENT URLS TO NEW DOMAIN         `);
  console.log(`   sldsystemspk.com / sldsystempk.com -> https://api.sldsystem.com `);
  console.log(`================================================================`);
  console.log(`Connecting to: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const legacyDomainRegex = /sldsystems?pk\.com|portal\.sldsystem/i;

  // 1. Migrate Cases
  console.log(`\n[1/8] Checking 'cases' collection...`);
  const casesCursor = db.collection('cases').find({
    $or: [
      { 'attachments.url': { $regex: /sldsystems?pk\.com|portal\.sldsystem|reference_views\/[0-9a-f]{8}\s+/i } },
      { 'attachments': { $regex: legacyDomainRegex } },
      { 'attachmentsData.url': { $regex: legacyDomainRegex } },
      { 'reference': { $regex: legacyDomainRegex } },
      { 'references': { $regex: legacyDomainRegex } }
    ]
  });

  let caseCount = 0;
  for await (const doc of casesCursor) {
    const updateObj = {};
    if (Array.isArray(doc.attachments)) {
      updateObj.attachments = normalizeAttachmentList(doc.attachments);
    }
    if (Array.isArray(doc.attachmentsData)) {
      updateObj.attachmentsData = normalizeAttachmentList(doc.attachmentsData);
    }
    if (typeof doc.reference === 'string' && doc.reference) {
      updateObj.reference = normalizeUrlString(doc.reference);
    }
    if (Array.isArray(doc.references)) {
      updateObj.references = doc.references.map(normalizeUrlString);
    }
    await db.collection('cases').updateOne({ _id: doc._id }, { $set: updateObj });
    caseCount++;
  }
  console.log(`✓ Migrated ${caseCount} cases with legacy or spaced attachment URLs.`);

  // 2. Migrate Statutes
  console.log(`\n[2/8] Checking 'statutes' collection...`);
  const statuteCursor = db.collection('statutes').find({
    $or: [
      { 'blocks.attachments.url': { $regex: /sldsystems?pk\.com|portal\.sldsystem|reference_views\/[0-9a-f]{8}\s+/i } },
      { 'blocks.attachment.url': { $regex: legacyDomainRegex } },
      { 'blocks.attachments': { $regex: legacyDomainRegex } }
    ]
  });
  let statuteCount = 0;
  for await (const doc of statuteCursor) {
    if (Array.isArray(doc.blocks)) {
      const updatedBlocks = doc.blocks.map(b => {
        const copy = { ...b };
        if (Array.isArray(copy.attachments)) {
          copy.attachments = normalizeAttachmentList(copy.attachments);
        }
        if (copy.attachment) {
          copy.attachment = normalizeAttachmentItem(copy.attachment);
        }
        return copy;
      });
      await db.collection('statutes').updateOne({ _id: doc._id }, { $set: { blocks: updatedBlocks } });
      statuteCount++;
    }
  }
  console.log(`✓ Migrated ${statuteCount} statutes.`);

  // 3. Migrate Notifications
  console.log(`\n[3/8] Checking 'notifications' collection...`);
  const notifCursor = db.collection('notifications').find({
    $or: [
      { 'attachments.url': { $regex: legacyDomainRegex } },
      { 'attachment.url': { $regex: legacyDomainRegex } },
      { 'attachment': { $regex: legacyDomainRegex } },
      { 'blocks.attachments.url': { $regex: legacyDomainRegex } }
    ]
  });
  let notifCount = 0;
  for await (const doc of notifCursor) {
    const updateObj = {};
    if (Array.isArray(doc.attachments)) {
      updateObj.attachments = normalizeAttachmentList(doc.attachments);
    }
    if (doc.attachment) {
      updateObj.attachment = normalizeAttachmentItem(doc.attachment);
    }
    if (Array.isArray(doc.blocks)) {
      updateObj.blocks = doc.blocks.map(b => {
        const copy = { ...b };
        if (Array.isArray(copy.attachments)) copy.attachments = normalizeAttachmentList(copy.attachments);
        if (copy.attachment) copy.attachment = normalizeAttachmentItem(copy.attachment);
        return copy;
      });
    }
    await db.collection('notifications').updateOne({ _id: doc._id }, { $set: updateObj });
    notifCount++;
  }
  console.log(`✓ Migrated ${notifCount} notifications.`);

  // 4. Migrate Newsletters
  console.log(`\n[4/8] Checking 'newsletters' collection...`);
  const newsCursor = db.collection('newsletters').find({
    $or: [
      { attachment: { $regex: legacyDomainRegex } },
      { pdfUrl: { $regex: legacyDomainRegex } },
      { 'attachments.url': { $regex: legacyDomainRegex } }
    ]
  });
  let newsCount = 0;
  for await (const doc of newsCursor) {
    const updateObj = {};
    if (doc.attachment) updateObj.attachment = normalizeUrlString(doc.attachment);
    if (doc.pdfUrl) updateObj.pdfUrl = normalizeUrlString(doc.pdfUrl);
    if (Array.isArray(doc.attachments)) updateObj.attachments = normalizeAttachmentList(doc.attachments);
    await db.collection('newsletters').updateOne({ _id: doc._id }, { $set: updateObj });
    newsCount++;
  }
  console.log(`✓ Migrated ${newsCount} newsletters.`);

  // 5. Migrate Downloads
  console.log(`\n[5/8] Checking 'downloads' collection...`);
  const dlCursor = db.collection('downloads').find({
    $or: [
      { attachment: { $regex: legacyDomainRegex } },
      { attachmentUrl: { $regex: legacyDomainRegex } }
    ]
  });
  let dlCount = 0;
  for await (const doc of dlCursor) {
    const updateObj = {};
    if (doc.attachment) updateObj.attachment = normalizeUrlString(doc.attachment);
    if (doc.attachmentUrl) updateObj.attachmentUrl = normalizeUrlString(doc.attachmentUrl);
    await db.collection('downloads').updateOne({ _id: doc._id }, { $set: updateObj });
    dlCount++;
  }
  console.log(`✓ Migrated ${dlCount} downloads.`);

  // 6. Migrate CustomTariffs & TaxCards
  console.log(`\n[6/8] Checking 'customtariffs' and 'taxcards' collections...`);
  const ctRes = await db.collection('customtariffs').find({ attachment: { $regex: legacyDomainRegex } }).toArray();
  for (const doc of ctRes) {
    await db.collection('customtariffs').updateOne({ _id: doc._id }, { $set: { attachment: normalizeUrlString(doc.attachment) } });
  }
  const tcRes = await db.collection('taxcards').find({ attachment: { $regex: legacyDomainRegex } }).toArray();
  for (const doc of tcRes) {
    await db.collection('taxcards').updateOne({ _id: doc._id }, { $set: { attachment: normalizeUrlString(doc.attachment) } });
  }
  console.log(`✓ Migrated ${ctRes.length} custom tariffs and ${tcRes.length} tax cards.`);

  // 7. Migrate OtherCaseLaws
  console.log(`\n[7/8] Checking 'othercaselaws' collection...`);
  const oclCursor = db.collection('othercaselaws').find({
    $or: [
      { attachment: { $regex: legacyDomainRegex } },
      { downloadLink: { $regex: legacyDomainRegex } },
      { caseNoLink: { $regex: legacyDomainRegex } }
    ]
  });
  let oclCount = 0;
  for await (const doc of oclCursor) {
    const updateObj = {};
    if (doc.attachment) updateObj.attachment = normalizeUrlString(doc.attachment);
    if (doc.downloadLink) updateObj.downloadLink = normalizeUrlString(doc.downloadLink);
    if (doc.caseNoLink) updateObj.caseNoLink = normalizeUrlString(doc.caseNoLink);
    await db.collection('othercaselaws').updateOne({ _id: doc._id }, { $set: updateObj });
    oclCount++;
  }
  console.log(`✓ Migrated ${oclCount} othercaselaws.`);

  // 8. Migrate WhatsApp updates
  console.log(`\n[8/8] Checking 'whatsappupdates' collection...`);
  const waRes = await db.collection('whatsappupdates').find({ attachment: { $regex: legacyDomainRegex } }).toArray();
  for (const doc of waRes) {
    await db.collection('whatsappupdates').updateOne({ _id: doc._id }, { $set: { attachment: normalizeUrlString(doc.attachment) } });
  }
  console.log(`✓ Migrated ${waRes.length} whatsapp updates.`);

  console.log(`\n================================================================`);
  console.log(`✓ ALL DATABASE ATTACHMENT PATHS MIGRATED SUCCESSFULLY!          `);
  console.log(`================================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Error] Failed to migrate attachment URLs:', err);
  process.exit(1);
});
