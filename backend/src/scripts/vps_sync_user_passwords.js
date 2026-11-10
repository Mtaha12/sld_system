#!/usr/bin/env node
/**
 * SLD System - Sync User Passwords from USER DATA.xlsx
 *
 * - Reads "USER DATA.xlsx" from the repository root (Sheet3, falling back cleanly).
 * - Updates BOTH bcrypt-hashed `password` and viewable `plainPassword` ONLY for rows
 *   with a non-blank password in column 3 (index 2).
 * - Preserves the existing DB password untouched whenever the Excel password is blank,
 *   or when a user is not listed in the Excel file.
 * - Strictly skips all Administrator accounts so Admin credentials are never altered.
 * - Inserts any non-admin users that do not yet exist in the target DB (e.g., on VPS).
 *
 * Usage (from repository root):
 *   node backend/src/scripts/vps_sync_user_passwords.js
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

const DEFAULT_FALLBACK_NEW_USER_PW = String.raw`SLD@systems521`;

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

function parseExcelDate(val) {
  if (val === null || val === undefined || val === '' || val === '0000-00-00') return null;
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val <= 25569) return null;
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(val).trim();
  if (!str || str === '0000-00-00' || str.toLowerCase() === 'null') return null;
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = Number(str);
    if (num <= 25569) return null;
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
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

async function hashPasswordsInParallel(uniquePasswords) {
  const pwHashMap = new Map();
  const list = Array.from(uniquePasswords);
  const CONCURRENCY = 8;

  for (let i = 0; i < list.length; i += CONCURRENCY) {
    const slice = list.slice(i, i + CONCURRENCY);
    const hashes = await Promise.all(slice.map(pw => bcrypt.hash(pw, 12)));
    slice.forEach((pw, idx) => pwHashMap.set(pw, hashes[idx]));
  }
  return pwHashMap;
}

export async function run() {
  console.log('\n==========================================================');
  console.log('   SLD SYSTEM - SYNC USER PASSWORDS FROM USER DATA.xlsx   ');
  console.log('==========================================================\n');

  const excelPath = locateExcelFile();
  if (!excelPath) {
    console.error('[ERROR] Could not locate "USER DATA.xlsx". Place it in the repository root.');
    process.exit(1);
  }
  console.log(`[INFO] Reading Excel workbook: ${excelPath}`);

  const wb = xlsx.read(fs.readFileSync(excelPath));
  const candidateSheets = wb.SheetNames.includes('Sheet3')
    ? ['Sheet3']
    : wb.SheetNames.filter(n => n !== 'Sheet1');

  const userMap = new Map();
  let totalDataRows = 0;

  for (const sheetName of candidateSheets) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawRows.length === 0) continue;

    const firstRowLogin = String(rawRows[0]?.[1] ?? '').trim().toLowerCase();
    const hasHeader = firstRowLogin.includes('login id');
    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
    console.log(`[INFO] Sheet "${sheetName}": processing ${dataRows.length} rows.`);

    for (const r of dataRows) {
      if (!Array.isArray(r) || r.length < 2) continue;
      const loginId = String(r[1] ?? '').trim();
      if (!loginId || loginId.toLowerCase().includes('login id')) continue;

      totalDataRows++;
      const lowerLogin = loginId.toLowerCase();
      const srNum = Number(r[0]) || 0;
      const pw = (r[2] !== null && r[2] !== undefined) ? String(r[2]).trim() : '';

      const candidate = {
        srNum,
        loginId,
        lowerLogin,
        password: pw,
        fullName: String(r[3] ?? '').trim() || loginId,
        contactNumber: sanitizeContact(r[4]),
        address: String(r[5] ?? '').trim(),
        email: sanitizeEmailCandidate(r[6]),
        agencyName: String(r[7] ?? '').trim() || 'Haroon',
        activeDate: parseExcelDate(r[8]),
        inactiveDate: parseExcelDate(r[9]),
        profileUpdated: String(r[10] ?? '').trim().toLowerCase() === 'yes' ? 'Yes' : 'No',
        rawStatus: String(r[11] ?? '').trim()
      };

      const prev = userMap.get(lowerLogin);
      if (!prev) {
        userMap.set(lowerLogin, candidate);
      } else {
        // Prefer non-blank password; break ties by highest Sr #
        const candHasPw = Boolean(candidate.password);
        const prevHasPw = Boolean(prev.password);

        const keepMetadata = candidate.srNum >= prev.srNum ? candidate : prev;
        let resolvedPassword = prev.password;
        if (candHasPw && !prevHasPw) {
          resolvedPassword = candidate.password;
        } else if (candHasPw && prevHasPw && candidate.srNum >= prev.srNum) {
          resolvedPassword = candidate.password;
        }

        userMap.set(lowerLogin, {
          ...keepMetadata,
          password: resolvedPassword
        });
      }
    }
  }

  const uniqueRecords = Array.from(userMap.values());
  console.log(`[OK] Parsed ${totalDataRows} rows -> ${uniqueRecords.length} unique login accounts.\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log(`[INFO] Connecting to MongoDB: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000, family: 4 });
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
  const usedEmailsLower = new Set();
  const usedUserIds = new Set();

  for (const u of existingUsers) {
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
        if (!prev || (prev.isDeleted && !u.isDeleted)) {
          nonAdminByLogin.set(k, u);
        }
      }
      const emailKey = String(u.email || '').trim().toLowerCase();
      if (emailKey && emailKey !== 'a@gmail.com' && !nonAdminByLogin.has(emailKey)) {
        nonAdminByLogin.set(emailKey, u);
      }
    }
  }

  // Collect distinct non-blank passwords to hash (plus fallback for any brand-new blank-pw insert)
  const uniquePasswordsToHash = new Set();
  for (const rec of uniqueRecords) {
    if (adminKeys.has(rec.lowerLogin)) continue;
    if (rec.password) {
      uniquePasswordsToHash.add(rec.password);
    } else if (!nonAdminByLogin.has(rec.lowerLogin)) {
      uniquePasswordsToHash.add(DEFAULT_FALLBACK_NEW_USER_PW);
    }
  }

  console.log(`[INFO] Hashing ${uniquePasswordsToHash.size} distinct passwords (bcrypt cost 12)...`);
  const pwHashMap = await hashPasswordsInParallel(uniquePasswordsToHash);
  console.log('[OK] Password hashes generated.\n');

  const now = new Date();
  const updateOps = [];
  const toInsert = [];
  const processedDbIds = new Set();

  let skippedAdmins = 0;
  let updatedPasswords = 0;
  let keptPreviousPasswords = 0;

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

      if (!rec.password) {
        // Password cell is blank in Excel -> keep previous DB password untouched
        keptPreviousPasswords++;
        continue;
      }

      const updateFields = {
        password: pwHashMap.get(rec.password),
        plainPassword: rec.password,
        updatedAt: now
      };
      if (!matchedDbUser.loginId) {
        updateFields.loginId = rec.loginId;
      }

      updateOps.push({
        updateOne: {
          filter: { _id: matchedDbUser._id },
          update: { $set: updateFields }
        }
      });
      updatedPasswords++;
    } else {
      // Brand-new non-admin user from Excel not yet present in DB
      const assignedPassword = rec.password || DEFAULT_FALLBACK_NEW_USER_PW;
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

      toInsert.push({ rec, assignedEmail, assignedPassword, status });
    }
  }

  if (toInsert.length > 0) {
    const existingCounter = await Counter.findById('user').lean();
    let probeSeq = existingCounter ? existingCounter.seq + 1 : 1;
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
    await Counter.findByIdAndUpdate('user', { $set: { seq: probeSeq - 1 } }, { upsert: true });
  }

  if (updateOps.length > 0) {
    console.log(`>>> Updating passwords for ${updateOps.length} existing users...`);
    const BATCH = 500;
    for (let i = 0; i < updateOps.length; i += BATCH) {
      await usersCol.bulkWrite(updateOps.slice(i, i + BATCH), { ordered: false });
    }
    console.log(`[OK] Updated ${updateOps.length} user passwords.`);
  }

  let insertedCount = 0;
  if (toInsert.length > 0) {
    const insertDocs = toInsert.map(({ rec, assignedEmail, assignedPassword, status, userId, user_id }) => ({
      userId,
      user_id,
      fullName: rec.fullName,
      username: rec.loginId,
      loginId: rec.loginId,
      email: assignedEmail,
      password: pwHashMap.get(assignedPassword),
      plainPassword: assignedPassword,
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

    const BATCH = 500;
    for (let i = 0; i < insertDocs.length; i += BATCH) {
      const batch = insertDocs.slice(i, i + BATCH);
      const res = await usersCol.insertMany(batch, { ordered: false });
      insertedCount += res.insertedCount || batch.length;
    }
    console.log(`[OK] Inserted ${insertedCount} new users.`);
  }

  const totalNonAdmin = await usersCol.countDocuments({ role: { $ne: 'Administrator' }, isDeleted: { $ne: true } });

  console.log('\n==========================================================');
  console.log('         FINAL USER PASSWORD SYNC SUMMARY                 ');
  console.log('==========================================================');
  console.log(`Excel rows parsed               : ${totalDataRows}`);
  console.log(`Unique logins in Excel          : ${uniqueRecords.length}`);
  console.log(`Admins safely skipped           : ${skippedAdmins}`);
  console.log(`Passwords updated from Excel    : ${updatedPasswords}`);
  console.log(`Blank passwords kept unchanged  : ${keptPreviousPasswords}`);
  console.log(`New users inserted              : ${insertedCount}`);
  console.log(`Total Non-Admin DB Users        : ${totalNonAdmin}`);
  console.log('==========================================================\n');

  await mongoose.disconnect();
  console.log('[OK] MongoDB disconnected.\n');
}

run().catch(async (err) => {
  console.error('[ERROR] User password sync failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
