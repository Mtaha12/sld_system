import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').toLowerCase();
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').toLowerCase();

async function runCracker() {
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  console.log('Connected to MongoDB');

  const usersCol = mongoose.connection.collection('users');
  const allUsers = await usersCol.find({}).toArray();
  console.log(`Found ${allUsers.length} total users in MongoDB.`);

  // Load legacy users from data-sld if available
  let cmsUsers = [];
  try {
    const raw = fs.readFileSync('C:\\Users\\HP\\Desktop\\data-sld\\tables\\cms_users.json', 'utf8');
    cmsUsers = JSON.parse(raw);
    console.log(`Loaded ${cmsUsers.length} users from cms_users.json`);
  } catch (e) {
    console.log('cms_users.json not loaded:', e.message);
  }

  // Load cms_admins if available
  let cmsAdmins = [];
  try {
    const rawA = fs.readFileSync('C:\\Users\\HP\\Desktop\\data-sld\\tables\\cms_admins.json', 'utf8');
    cmsAdmins = JSON.parse(rawA);
    console.log(`Loaded ${cmsAdmins.length} admins from cms_admins.json`);
  } catch (e) {}

  // Build lookup by username/email from legacy data
  const legacyMap = new Map();
  for (const cu of cmsUsers) {
    if (cu.username) legacyMap.set(cu.username.toLowerCase(), cu);
    if (cu.email) legacyMap.set(cu.email.toLowerCase(), cu);
  }
  for (const ca of cmsAdmins) {
    if (ca.adm_username) legacyMap.set(ca.adm_username.toLowerCase(), ca);
    if (ca.adm_email) legacyMap.set(ca.adm_email.toLowerCase(), ca);
  }

  // Common Pakistani and worldwide passwords
  const baseWords = [
    '123456', '12345678', '123456789', '12345', '1234', '1234567', '1234567890',
    'admin', 'admin123', 'admin@123', 'admin1234', 'administrator', 'password', 'pass123',
    'pakistan', 'pakistan123', 'pakistan786', 'pakistan1', 'lahore', 'karachi', 'islamabad',
    'rawalpindi', 'peshawar', 'multan', 'faisalabad', 'quetta', 'gujranwala', 'sialkot',
    'sld123', 'sld12345', 'sld786', 'law123', 'lawyer', 'advocate', 'welcome', 'welcome1',
    'bismillah', 'bismillah786', '786786', '78692', '000000', '111111', '112233', '123123',
    '654321', '0987654321', 'secret', 'superlaw', 'haroon', 'haroon123', 'shahzad', 'shahzad123',
    'ahmad', 'ahmad123', 'malik', 'malik123', 'khan', 'khan123', 'chaudhry', 'chaudhry123',
    'asif', 'asif123', 'tariq', 'tariq123', 'iqbal', 'iqbal123', 'ali', 'ali123', 'raza',
    'raza123', 'naveed', 'naveed123', 'usman', 'usman123', 'bilal', 'bilal123', 'saeed',
    'saeed123', 'zahid', 'zahid123', 'shahid', 'shahid123', 'hamza', 'hamza123', 'kamran',
    'kamran123', 'salman', 'salman123', 'imran', 'imran123', 'imrankhan', 'farhan', 'farhan123',
    'qazi', 'qazi123', 'pildat', 'pildat123', 'pildat@123', 'corporate', 'general', 'client',
    'superlawdata', 'tax123', 'fbr123', 'fbr@123'
  ];

  // Years from 1950 to 2026
  const years = [];
  for (let y = 1950; y <= 2026; y++) {
    years.push(String(y));
  }

  // Precompute hashes for common words
  const hashMap = new Map();
  for (const w of [...baseWords, ...years]) {
    hashMap.set(md5(w), w);
    hashMap.set(sha1(w), w);
  }

  let crackedCount = 0;
  let skippedBcrypt = 0;
  let remainingCount = 0;
  const updates = [];

  for (const u of allUsers) {
    const rawPass = (u.password || '').trim();
    const isMd5 = rawPass.length === 32 && /^[a-f0-9]{32}$/i.test(rawPass);
    const isSha1 = rawPass.length === 40 && /^[a-f0-9]{40}$/i.test(rawPass);

    if (!isMd5 && !isSha1) {
      // It's bcrypt or plain
      if (rawPass.startsWith('$2b$') || rawPass.startsWith('$2a$')) {
        skippedBcrypt++;
      }
      continue;
    }

    const h = rawPass.toLowerCase();

    // 1. Direct dictionary match
    if (hashMap.has(h)) {
      const plain = hashMap.get(h);
      updates.push({ id: u._id, username: u.username, plainPassword: plain });
      crackedCount++;
      continue;
    }

    // 2. Extract context from MongoDB doc & legacy doc
    const leg = legacyMap.get(u.username?.toLowerCase()) || legacyMap.get(u.email?.toLowerCase()) || {};
    
    // Check lastname / company for embedded passwords like "Pass: Qazi123", "pass arshad75"
    let embeddedCandidate = null;
    const notesStr = `${leg.lastname || ''} ${leg.company || ''} ${u.fullName || ''} ${u.address || ''}`;
    const passMatch = notesStr.match(/pass(?:word)?\s*[:\-]?\s*([a-zA-Z0-9@_!#]+)/i);
    if (passMatch && passMatch[1]) {
      const cand = passMatch[1].trim();
      if (md5(cand) === h || sha1(cand) === h) {
        embeddedCandidate = cand;
      }
    }

    if (embeddedCandidate) {
      updates.push({ id: u._id, username: u.username, plainPassword: embeddedCandidate });
      crackedCount++;
      continue;
    }

    // 3. User-specific candidate generation
    const candidates = new Set();
    const addCand = (str) => {
      if (!str || typeof str !== 'string') return;
      const clean = str.trim();
      if (clean.length < 2) return;
      candidates.add(clean);
      candidates.add(clean.toLowerCase());
      candidates.add(clean.toUpperCase());
      candidates.add(clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase());

      // Add common suffixes
      candidates.add(`${clean}123`);
      candidates.add(`${clean}1234`);
      candidates.add(`${clean}@123`);
      candidates.add(`${clean}786`);
      candidates.add(`${clean}1`);
      candidates.add(`${clean}12`);
      candidates.add(`${clean.toLowerCase()}123`);
      candidates.add(`${clean.toLowerCase()}786`);
      candidates.add(`${clean.toLowerCase()}@123`);
      candidates.add(`${clean.toLowerCase()}1`);
    };

    // User details
    addCand(u.username);
    addCand(u.email?.split('@')[0]);
    addCand(u.fullName);
    (u.fullName || '').split(/\s+/).forEach(addCand);
    addCand(u.city);
    addCand(u.agencyName);
    addCand(u.contactNumber?.replace(/[^0-9]/g, ''));
    if (u.contactNumber) {
      const digits = u.contactNumber.replace(/[^0-9]/g, '');
      if (digits.length >= 7) {
        addCand(digits);
        addCand(digits.slice(-7));
        addCand(digits.replace(/^0+/, ''));
        addCand(digits.replace(/^92/, '0'));
        addCand(digits.replace(/^92/, ''));
      }
    }

    // Legacy details
    addCand(leg.username);
    addCand(leg.firstname);
    (leg.firstname || '').split(/\s+/).forEach(addCand);
    addCand(leg.lastname);
    (leg.lastname || '').split(/\s+/).forEach(addCand);
    addCand(leg.agency);
    addCand(leg.company);
    if (leg.contactno) {
      const digits = String(leg.contactno).replace(/[^0-9]/g, '');
      if (digits.length >= 7) {
        addCand(digits);
        addCand(digits.slice(-7));
        addCand(digits.replace(/^0+/, ''));
      }
    }
    if (leg.whatsapp) {
      const digits = String(leg.whatsapp).replace(/[^0-9]/g, '');
      if (digits.length >= 7) {
        addCand(digits);
        addCand(digits.slice(-7));
      }
    }

    let found = null;
    for (const c of candidates) {
      if (md5(c) === h || sha1(c) === h) {
        found = c;
        break;
      }
    }

    if (found) {
      updates.push({ id: u._id, username: u.username, plainPassword: found });
      crackedCount++;
    } else {
      remainingCount++;
    }
  }

  console.log(`Results: ${crackedCount} passwords cracked successfully!`);
  console.log(`Skipped bcrypt: ${skippedBcrypt}`);
  console.log(`Remaining uncracked: ${remainingCount}`);

  // Apply updates to MongoDB
  if (updates.length > 0) {
    const bulkOps = updates.map(up => ({
      updateOne: {
        filter: { _id: up.id },
        update: { $set: { plainPassword: up.plainPassword } }
      }
    }));

    for (let i = 0; i < bulkOps.length; i += 500) {
      await usersCol.bulkWrite(bulkOps.slice(i, i + 500));
    }
    console.log(`Successfully updated ${updates.length} users with exact verified passwords.`);
  }

  process.exit(0);
}

runCracker().catch(err => {
  console.error(err);
  process.exit(1);
});
