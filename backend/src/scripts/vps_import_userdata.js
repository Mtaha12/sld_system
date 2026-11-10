#!/usr/bin/env node
/**
 * SLD System - Import/Sync Users from USER DATA.xlsx & Assign Password
 *
 * - Reads Sheet2 & Sheet3 from USER DATA.xlsx (skips Sheet1 which contains Statutes)
 * - Deduplicates records cleanly by login ID (retaining richest/latest profile data)
 * - Preserves all Administrator accounts untouched (never modifies Admin passwords)
 * - For all non-admin users listed in USER DATA.xlsx:
 *     - Inserts missing users with authentic dates, agency, contact, address, and status
 *     - Updates existing non-admin users (restoring if soft-deleted)
 *     - Assigns password "SLD@systems521" stored both bcrypt-hashed (`password`)
 *       and readable (`plainPassword`) so Admin can view passwords in Manage Users
 *
 * Usage:
 *   node backend/src/scripts/vps_import_userdata.js
 *   (or from backend/: node src/scripts/vps_import_userdata.js)
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import Counter from '../models/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate backend/.env or root .env
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env')
];
for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    dotenv.config({ path: ep });
    break;
  }
}

const TARGET_PASSWORD = String.raw`SLD@systems521`;

/**
 * Converts an Excel serial date or YYYY-MM-DD string into a JS Date, or null if placeholder/empty.
 */
function parseExcelDate(val) {
  if (val === null || val === undefined || val === '' || val === '0000-00-00') return null;

  if (typeof val === 'number') {
    // 25569 = 1970-01-01 (often exported as empty placeholder); valid modern dates are well above 25569
    if (!Number.isFinite(val) || val <= 25569) return null;
    const ms = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(val).trim();
  if (!str || str === '0000-00-00' || str.toLowerCase() === 'null') return null;

  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num <= 25569) return null;
    const ms = Math.round((num - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Scores a row so duplicate login entries keep the most complete/recent active record.
 */
function scoreRow(row) {
  let score = 0;
  if (row.profileUpdated === 'Yes') score += 20;
  if (row.activeDate) score += 10;
  if (row.inactiveDate) score += 10;
  if (row.agencyName && row.agencyName !== 'General') score += 4;
  if (row.fullName && row.fullName !== row.loginId) score += 2;
  if (row.email && row.email.includes('@') && row.email.toLowerCase() !== 'a@gmail.com') score += 2;
  if (row.contactNumber) score += 1;
  if (row.address) score += 1;
  return score;
}

function locateExcelFile() {
  const candidates = [
    path.resolve(process.cwd(), 'USER DATA.xlsx'),
    path.resolve(process.cwd(), '../USER DATA.xlsx'),
    path.resolve(__dirname, '../../../USER DATA.xlsx'),
    path.resolve(__dirname, '../../../../USER DATA.xlsx'),
    '/var/www/sld_system/USER DATA.xlsx',
    '/var/www/sld-system/USER DATA.xlsx'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function sanitizeContact(val) {
  const s = String(val ?? '').trim();
  if (!s || s === '0') return '';
  return s;
}

function sanitizeEmailCandidate(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || !s.includes('@') || s.includes(' ') || s === 'a@gmail.com') return '';
  return s;
}

function buildUniqueSyntheticEmail(loginId, usedEmailsLower) {
  const slug = String(loginId)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'user';

  let candidate = `${slug}@sldsystem.com`;
  let n = 1;
  while (usedEmailsLower.has(candidate)) {
    candidate = `${slug}_${n}@sldsystem.com`;
    n++;
  }
  usedEmailsLower.add(candidate);
  return candidate;
}

export async function run() {
  console.log('\n==========================================================');
  console.log('   SLD SYSTEM - USER DATA IMPORT & PASSWORD SYNC SCRIPT   ');
  console.log('==========================================================\n');

  const excelPath = locateExcelFile();
  if (!excelPath) {
    console.error('[ERROR] Could not locate "USER DATA.xlsx". Place it in the repository root.');
    process.exit(1);
  }
  console.log(`[INFO] Reading Excel workbook: ${excelPath}`);

  const wb = xlsx.readFile(excelPath);
  const userMap = new Map();

  // Sheet2 has no header row (row 0 is actual data); Sheet3 has a header row at index 0
  const sheetConfigs = [
    { name: 'Sheet2', skipHeader: false },
    { name: 'Sheet3', skipHeader: true }
  ];

  let totalRawRows = 0;
  for (const cfg of sheetConfigs) {
    const sheet = wb.Sheets[cfg.name];
    if (!sheet) {
      console.warn(`[WARN] Sheet "${cfg.name}" not found in workbook, skipping.`);
      continue;
    }
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const dataRows = cfg.skipHeader ? rawRows.slice(1) : rawRows;
    console.log(`[INFO] Parsed ${dataRows.length} rows from ${cfg.name}.`);

    for (const r of dataRows) {
      if (!Array.isArray(r) || r.length < 2) continue;
      const loginId = String(r[1] ?? '').trim();
      if (!loginId || loginId.toLowerCase() === 'login id/ password') continue;

      totalRawRows++;
      const lowerLogin = loginId.toLowerCase();
      const parsed = {
        loginId,
        lowerLogin,
        fullName: String(r[2] ?? '').trim() || loginId,
        contactNumber: sanitizeContact(r[3]),
        address: String(r[4] ?? '').trim(),
        email: sanitizeEmailCandidate(r[5]),
        agencyName: String(r[6] ?? '').trim() || 'Haroon',
        activeDate: parseExcelDate(r[7]),
        inactiveDate: parseExcelDate(r[8]),
        profileUpdated: String(r[9] ?? '').trim().toLowerCase() === 'yes' ? 'Yes' : 'No',
        rawStatus: String(r[10] ?? '').trim()
      };
      parsed.score = scoreRow(parsed);

      const existingEntry = userMap.get(lowerLogin);
      if (!existingEntry || parsed.score > existingEntry.score) {
        userMap.set(lowerLogin, parsed);
      }
    }
  }

  const uniqueRecords = Array.from(userMap.values());
  console.log(`[OK] Deduplicated ${totalRawRows} raw rows into ${uniqueRecords.length} unique user accounts.\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`[INFO] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('[OK] Connected to MongoDB.\n');

  const usersCol = mongoose.connection.db.collection('users');
  const existingUsers = await usersCol.find(
    {},
    {
      projection: {
        _id: 1,
        username: 1,
        loginId: 1,
        email: 1,
        role: 1,
        status: 1,
        isDeleted: 1,
        userId: 1,
        user_id: 1
      }
    }
  ).toArray();

  const adminKeys = new Set();
  const nonAdminByLogin = new Map();
  const usedUsernamesExact = new Set();
  const usedEmailsLower = new Set();
  const usedUserIds = new Set();

  for (const u of existingUsers) {
    if (u.username) usedUsernamesExact.add(String(u.username).trim());
    if (u.email) usedEmailsLower.add(String(u.email).trim().toLowerCase());
    if (u.userId) usedUserIds.add(u.userId);
    if (u.user_id) usedUserIds.add(u.user_id);

    const loginKeys = [u.username, u.loginId]
      .map(v => String(v || '').trim().toLowerCase())
      .filter(Boolean);

    if (u.role === 'Administrator') {
      [...loginKeys, String(u.email || '').trim().toLowerCase()].filter(Boolean).forEach(k => adminKeys.add(k));
    } else {
      for (const k of loginKeys) {
        const prev = nonAdminByLogin.get(k);
        // Prefer active (non-deleted) document if multiple match
        if (!prev || (prev.isDeleted && !u.isDeleted)) {
          nonAdminByLogin.set(k, u);
        }
      }
      // Also allow email-as-login lookup ONLY when user's email matches an incoming loginId directly
      const emailKey = String(u.email || '').trim().toLowerCase();
      if (emailKey && emailKey !== 'a@gmail.com' && !nonAdminByLogin.has(emailKey)) {
        nonAdminByLogin.set(emailKey, u);
      }
    }
  }

  console.log('[INFO] Hashing assigned password with bcrypt (cost factor 12)...');
  const hashedPassword = await bcrypt.hash(TARGET_PASSWORD, 12);
  console.log('[OK] Password hash ready.\n');

  const now = new Date();
  const updateOps = [];
  const toInsert = [];
  const processedDbIds = new Set();

  let skippedAdmins = 0;
  let updatedExisting = 0;
  let restoredDeleted = 0;

  for (const rec of uniqueRecords) {
    if (adminKeys.has(rec.lowerLogin)) {
      skippedAdmins++;
      continue;
    }

    const matchedDbUser = nonAdminByLogin.get(rec.lowerLogin);

    if (matchedDbUser) {
      const idStr = String(matchedDbUser._id);
      if (processedDbIds.has(idStr)) continue;
      processedDbIds.add(idStr);

      const updateFields = {
        password: hashedPassword,
        plainPassword: TARGET_PASSWORD,
        isVerified: true,
        updatedAt: now
      };
      if (!matchedDbUser.loginId) {
        updateFields.loginId = rec.loginId;
      }
      if (matchedDbUser.isDeleted) {
        updateFields.isDeleted = false;
        updateFields.deletedAt = null;
        restoredDeleted++;
      }

      updateOps.push({
        updateOne: {
          filter: { _id: matchedDbUser._id },
          update: { $set: updateFields }
        }
      });
      updatedExisting++;
    } else {
      let assignedEmail = '';
      if (rec.email && !usedEmailsLower.has(rec.email)) {
        assignedEmail = rec.email;
        usedEmailsLower.add(assignedEmail);
      } else if (rec.loginId.includes('@') && !rec.loginId.includes(' ') && !usedEmailsLower.has(rec.lowerLogin)) {
        assignedEmail = rec.lowerLogin;
        usedEmailsLower.add(assignedEmail);
      } else {
        assignedEmail = buildUniqueSyntheticEmail(rec.loginId, usedEmailsLower);
      }

      // Compute clean initial status from Excel expiry & activation metadata
      let status = 'inactive';
      if (rec.rawStatus && rec.rawStatus.toLowerCase() === 'active') {
        status = 'ACTIVE';
      } else if (rec.rawStatus && rec.rawStatus.toLowerCase() === 'inactive') {
        status = 'inactive';
      } else if (rec.inactiveDate && rec.inactiveDate < now) {
        status = 'inactive';
      } else if (rec.profileUpdated === 'Yes' || (rec.activeDate && (!rec.inactiveDate || rec.inactiveDate >= now))) {
        status = 'ACTIVE';
      }

      toInsert.push({
        rec,
        assignedEmail,
        status
      });
    }
  }

  // Allocate sequential USER-XXXXXX unique IDs cleanly from Counter
  let nextUserSeq = 1;
  if (toInsert.length > 0) {
    const existingCounter = await Counter.findById('user').lean();
    const startSeq = existingCounter ? existingCounter.seq + 1 : 1;
    // Also probe existing max USER-NNNNNN in case DB has higher IDs than counter
    let probeSeq = startSeq;
    for (const item of toInsert) {
      let formattedId;
      do {
        formattedId = `USER-${String(probeSeq).padStart(6, '0')}`;
        probeSeq++;
      } while (usedUserIds.has(formattedId));
      usedUserIds.add(formattedId);
      item.userId = formattedId;
      item.user_id = formattedId;
    }
    nextUserSeq = probeSeq - 1;
    await Counter.findByIdAndUpdate(
      'user',
      { $set: { seq: nextUserSeq } },
      { upsert: true }
    );
  }

  const insertDocs = toInsert.map(({ rec, assignedEmail, status, userId, user_id }) => ({
    userId,
    user_id,
    fullName: rec.fullName,
    username: rec.loginId,
    loginId: rec.loginId,
    email: assignedEmail,
    password: hashedPassword,
    plainPassword: TARGET_PASSWORD,
    role: 'User',
    contactNumber: rec.contactNumber,
    address: rec.address,
    city: '',
    companyName: '',
    agencyName: rec.agencyName || 'Haroon',
    userType: 'Special',
    aiAssistant: true,
    alreadyLogin: false,
    isSpammer: false,
    ipRestriction: false,
    displayStatute: true,
    displayNotification: true,
    displayCase: true,
    allowAllForms: false,
    downloadLimitStatute: 25,
    downloadLimitNotification: 25,
    downloadLimitCaseLaw: 50,
    sequentialDownloadBlockThreshold: 10,
    activeDate: rec.activeDate || now,
    inactiveDate: rec.inactiveDate || null,
    avatarUrl: '/sld-logo.jpeg',
    isVerified: true,
    status,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now
  }));

  if (updateOps.length > 0) {
    console.log(`>>> Updating ${updateOps.length} existing users with assigned password...`);
    const BATCH = 500;
    for (let i = 0; i < updateOps.length; i += BATCH) {
      await usersCol.bulkWrite(updateOps.slice(i, i + BATCH), { ordered: false });
    }
    console.log(`[OK] Updated ${updateOps.length} existing users (restored ${restoredDeleted} soft-deleted).`);
  }

  let insertedCount = 0;
  if (insertDocs.length > 0) {
    console.log(`>>> Inserting ${insertDocs.length} new users from USER DATA.xlsx...`);
    const BATCH = 500;
    for (let i = 0; i < insertDocs.length; i += BATCH) {
      const batch = insertDocs.slice(i, i + BATCH);
      const res = await usersCol.insertMany(batch, { ordered: false });
      insertedCount += res.insertedCount || batch.length;
    }
    console.log(`[OK] Inserted ${insertedCount} new users.`);
  }

  // Final verification counts
  const [totalNonAdmin, totalActive, totalInactive, missingPlain] = await Promise.all([
    usersCol.countDocuments({ role: { $ne: 'Administrator' }, isDeleted: { $ne: true } }),
    usersCol.countDocuments({ role: { $ne: 'Administrator' }, isDeleted: { $ne: true }, status: { $in: ['ACTIVE', 'active', 'Active'] } }),
    usersCol.countDocuments({ role: { $ne: 'Administrator' }, isDeleted: { $ne: true }, status: { $in: ['INACTIVE', 'inactive', 'Inactive'] } }),
    usersCol.countDocuments({ role: { $ne: 'Administrator' }, isDeleted: { $ne: true }, $or: [{ plainPassword: '' }, { plainPassword: null }, { plainPassword: { $exists: false } }] })
  ]);

  console.log('\n==========================================================');
  console.log('              FINAL USER DATA IMPORT SUMMARY              ');
  console.log('==========================================================');
  console.log(`Unique logins in USER DATA.xlsx : ${uniqueRecords.length}`);
  console.log(`Admins safely skipped           : ${skippedAdmins}`);
  console.log(`Existing users updated          : ${updatedExisting} (Restored deleted: ${restoredDeleted})`);
  console.log(`New users inserted              : ${insertedCount}`);
  console.log(`Total Users now in Manage Users : ${totalNonAdmin}`);
  console.log(`  - Active Users                : ${totalActive}`);
  console.log(`  - Inactive Users              : ${totalInactive}`);
  console.log(`Users missing viewable password : ${missingPlain}`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
  console.log('[OK] MongoDB disconnected. Script completed successfully!\n');
}

run().catch(err => {
  console.error('[ERROR] User data import failed:', err);
  process.exit(1);
});
