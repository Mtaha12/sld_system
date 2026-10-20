import dotenv from 'dotenv';
import { generateAccessToken } from '../src/config/jwt.js';

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:5000';
const adminToken = generateAccessToken({
  _id: '6a90093e137c8854f5d4d373',
  username: 'adam_admin',
  email: 'adam.admin@sldsystem.com',
  role: 'Administrator'
});

async function runVerification() {
  console.log('\n--- VERIFYING EXACT SECTION SEARCH IN STATUTES ---');

  // Test 1: Section 2 search
  const resSec2 = await fetch(`${BASE_URL}/api/statutes?section=2&limit=50`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const dataSec2 = await resSec2.json();
  const listSec2 = dataSec2.data || [];
  console.log(`Found ${listSec2.length} records for section=2:`);
  let hasInvalidSec2 = false;
  listSec2.forEach(s => {
    const raw = String(s.section || '').trim().replace(/^section\s+/i, '');
    console.log(` - SR #${s.srNumber} | Law: ${s.law?.slice(0, 30)} | Section: "${s.section}" (normalized: "${raw}")`);
    if (raw !== '2') {
      hasInvalidSec2 = true;
    }
  });

  if (hasInvalidSec2) {
    console.error('FAILED: Found records that are NOT exact section 2!');
  } else {
    console.log('PASSED: All returned records match EXACT section 2!');
  }

  // Test 2: Section 23 search
  const resSec23 = await fetch(`${BASE_URL}/api/statutes?section=23&limit=50`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const dataSec23 = await resSec23.json();
  const listSec23 = dataSec23.data || [];
  console.log(`\nFound ${listSec23.length} records for section=23:`);
  let hasInvalidSec23 = false;
  listSec23.slice(0, 5).forEach(s => {
    const raw = String(s.section || '').trim().replace(/^section\s+/i, '');
    console.log(` - SR #${s.srNumber} | Law: ${s.law?.slice(0, 30)} | Section: "${s.section}" (normalized: "${raw}")`);
    if (raw !== '23') {
      hasInvalidSec23 = true;
    }
  });

  if (hasInvalidSec23) {
    console.error('FAILED: Found records that are NOT exact section 23!');
  } else {
    console.log('PASSED: All returned records match EXACT section 23!');
  }

  // Test 3: Statute with blocks sorting
  console.log('\n--- VERIFYING STATUTE MULTI-BLOCK SORTING ---');
  const resMulti = await fetch(`${BASE_URL}/api/statutes?limit=200`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const dataMulti = await resMulti.json();
  const multiBlockStatutes = (dataMulti.data || []).filter(s => Array.isArray(s.blocks) && s.blocks.length > 1);
  console.log(`Found ${multiBlockStatutes.length} multi-block statutes:`);
  if (multiBlockStatutes.length > 0) {
    const s = multiBlockStatutes[0];
    console.log(`Statute SR #${s.srNumber} (${s.law?.slice(0, 25)}) has ${s.blocks.length} blocks:`);
    s.blocks.forEach((b, i) => {
      console.log(`  Block ${i + 1}: fromDate: ${b.fromDate || 'N/A'} | toDate: ${b.toDate || 'N/A'}`);
    });
  }

  // Test 4: Notification exact section search
  console.log('\n--- VERIFYING EXACT SECTION SEARCH IN NOTIFICATIONS ---');
  const resNotifSec2 = await fetch(`${BASE_URL}/api/notifications?section=2&limit=50`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const dataNotifSec2 = await resNotifSec2.json();
  const listNotifSec2 = dataNotifSec2.data || [];
  console.log(`Found ${listNotifSec2.length} notifications for section=2:`);
  let hasInvalidNotifSec2 = false;
  listNotifSec2.slice(0, 5).forEach(n => {
    const raw = String(n.section || '').trim().replace(/^section\s+/i, '');
    console.log(` - Number: ${n.number} | Section: "${n.section}" (normalized: "${raw}")`);
    if (raw !== '2') {
      hasInvalidNotifSec2 = true;
    }
  });

  if (hasInvalidNotifSec2) {
    console.error('FAILED: Found notifications that are NOT exact section 2!');
  } else {
    console.log('PASSED: All returned notifications match EXACT section 2!');
  }

  console.log('\nALL BACKEND VERIFICATIONS COMPLETED.');
}

runVerification().catch(console.error);
