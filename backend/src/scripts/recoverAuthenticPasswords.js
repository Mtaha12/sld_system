import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex').toLowerCase();
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex').toLowerCase();

async function runCleanAndRecover() {
  await mongoose.connect('mongodb://127.0.0.1:27017/sld_system');
  console.log('Connected to MongoDB');

  const usersCol = mongoose.connection.collection('users');
  const allMongoUsers = await usersCol.find({}).toArray();
  console.log(`Found ${allMongoUsers.length} total users in MongoDB.`);

  // 1. Wipe out any dummy 'sld@...' or 'sld12345' or fake passwords
  const wipeResult = await usersCol.updateMany(
    { 
      $or: [
        { plainPassword: { $regex: '^sld@' } },
        { plainPassword: 'sld12345' },
        { plainPassword: 'admin123' }
      ]
    },
    { $unset: { plainPassword: '' } }
  );
  console.log(`Wiped fake/dummy passwords from ${wipeResult.modifiedCount} users.`);

  // Load legacy tables
  let cmsUsers = [];
  try {
    cmsUsers = JSON.parse(fs.readFileSync('C:\\Users\\HP\\Desktop\\data-sld\\tables\\cms_users.json', 'utf8'));
    console.log(`Loaded ${cmsUsers.length} users from cms_users.json`);
  } catch (e) {
    console.log('Error reading cms_users.json:', e.message);
  }

  let lh = [];
  try {
    lh = JSON.parse(fs.readFileSync('C:\\Users\\HP\\Desktop\\data-sld\\tables\\cms_users_loginhistory.json', 'utf8'));
    console.log(`Loaded ${lh.length} entries from cms_users_loginhistory.json`);
  } catch (e) {
    console.log('Error reading loginhistory:', e.message);
  }

  let cmsAdmins = [];
  try {
    cmsAdmins = JSON.parse(fs.readFileSync('C:\\Users\\HP\\Desktop\\data-sld\\tables\\cms_admins.json', 'utf8'));
  } catch (e) {}

  // Build candidate set of real passwords
  const candidateSet = new Set();

  // A. Actual passwords recorded from real logins in loginhistory
  for (const entry of lh) {
    if (entry.login_password && typeof entry.login_password === 'string') {
      const p = entry.login_password.trim();
      if (p.length > 0 && p.length < 50) candidateSet.add(p);
    }
  }
  console.log(`Loaded ${candidateSet.size} authentic passwords from login history.`);

  // B. Common numbers and PINs (0000 - 99999, plus padding)
  for (let i = 0; i <= 99999; i++) {
    const s = String(i);
    candidateSet.add(s);
    if (s.length < 4) candidateSet.add(s.padStart(4, '0'));
    if (s.length < 5) candidateSet.add(s.padStart(5, '0'));
  }

  // Sequences and repeats
  for (let d = 0; d <= 9; d++) {
    candidateSet.add(String(d).repeat(4));
    candidateSet.add(String(d).repeat(5));
    candidateSet.add(String(d).repeat(6));
  }
  const sequences = [
    '1234', '12345', '123456', '1234567', '12345678', '123456789', '1234567890',
    '654321', '123123', '112233', '786786', '78692', '0987654321'
  ];
  sequences.forEach(s => candidateSet.add(s));

  // C. Dictionary words & names from cms_users and MongoDB users
  const addWord = (w) => {
    if (!w || typeof w !== 'string') return;
    const str = w.trim();
    if (str.length < 2 || str.length > 30) return;
    candidateSet.add(str);
    candidateSet.add(str.toLowerCase());
    candidateSet.add(str.toUpperCase());
    candidateSet.add(str + '123');
    candidateSet.add(str.toLowerCase() + '123');
    candidateSet.add(str + '786');
    candidateSet.add(str.toLowerCase() + '786');
    candidateSet.add(str + '1');
    candidateSet.add(str.toLowerCase() + '1');
    candidateSet.add(str + '@123');
    candidateSet.add(str.toLowerCase() + '@123');
  };

  for (const u of cmsUsers) {
    addWord(u.username);
    addWord(u.firstname);
    addWord(u.lastname);
    addWord(u.company);
    addWord(u.agency);
    if (u.contactno) {
      const digits = String(u.contactno).replace(/[^0-9]/g, '');
      if (digits.length >= 7) {
        candidateSet.add(digits);
        candidateSet.add(digits.slice(-7));
        candidateSet.add(digits.slice(-6));
        candidateSet.add(digits.slice(-5));
        candidateSet.add(digits.slice(-4));
      }
    }
    const combined = `${u.lastname || ''} ${u.company || ''}`;
    const tokens = combined.split(/[\s,;:\/\\-]+/);
    for (const t of tokens) {
      if (t.length >= 3 && t.length <= 25) {
        addWord(t);
      }
    }
  }

  for (const u of allMongoUsers) {
    addWord(u.username);
    addWord(u.fullName);
    addWord(u.companyName);
    addWord(u.city);
    addWord(u.agencyName);
  }

  for (const ca of cmsAdmins) {
    addWord(ca.adm_username);
    addWord(ca.adm_fullname);
    addWord(ca.adm_email?.split('@')[0]);
  }

  console.log(`Total candidate dictionary size: ${candidateSet.size}. Building hash maps...`);

  const md5Map = new Map();
  const sha1Map = new Map();

  for (const cand of candidateSet) {
    const m = md5(cand);
    if (!md5Map.has(m)) md5Map.set(m, cand);
    const s = sha1(cand);
    if (!sha1Map.has(s)) sha1Map.set(s, cand);
  }

  console.log('Hash maps built. Now matching users in MongoDB...');

  let verifiedCount = 0;
  const updates = [];

  for (const u of allMongoUsers) {
    const rawPass = (u.password || '').trim();
    if (!rawPass) continue;

    // Check if user already has an authentic plainPassword that hashes to rawPass
    if (u.plainPassword) {
      const pp = u.plainPassword.trim();
      if (md5(pp) === rawPass.toLowerCase() || sha1(pp) === rawPass.toLowerCase()) {
        verifiedCount++;
        continue;
      }
    }

    const h = rawPass.toLowerCase();
    let authenticPlain = null;

    if (md5Map.has(h)) {
      authenticPlain = md5Map.get(h);
    } else if (sha1Map.has(h)) {
      authenticPlain = sha1Map.get(h);
    }

    if (authenticPlain) {
      updates.push({
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { plainPassword: authenticPlain } }
        }
      });
      verifiedCount++;
    }
  }

  console.log(`Found verified authentic passwords for ${verifiedCount} out of ${allMongoUsers.length} users.`);

  if (updates.length > 0) {
    console.log(`Writing ${updates.length} updates to MongoDB in batches...`);
    for (let i = 0; i < updates.length; i += 500) {
      await usersCol.bulkWrite(updates.slice(i, i + 500));
    }
    console.log('All authentic password updates successfully written!');
  }

  // Also check admin accounts:
  // Find admin user(s) and set their plain passwords if known
  const adminUsers = await usersCol.find({ role: 'admin' }).toArray();
  console.log(`Found ${adminUsers.length} admin accounts in MongoDB:`);
  for (const a of adminUsers) {
    console.log(`- Admin: ${a.username} (${a.email}), plainPassword: ${a.plainPassword || '(none)'}`);
  }

  await mongoose.disconnect();
  console.log('Done!');
  process.exit(0);
}

runCleanAndRecover().catch(err => {
  console.error(err);
  process.exit(1);
});
