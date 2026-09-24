import 'dotenv/config';
import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import connectDB from './src/config/db.js';
import Magazine from './src/models/Magazine.js';
import CourtSetting from './src/models/CourtSetting.js';
import LawSetting from './src/models/LawSetting.js';

import { COURT_OPTIONS } from '../frontend/src/data/courts.js';
import { LAW_OPTIONS } from '../frontend/src/data/laws.js';

const HARDCODED_MAGAZINES = [
  'SLD', 'PTD', 'TAX', 'CTR', 'PTCL', 'SCMR', 'CLD', 'PLD',
  'PLC', 'PCRLJ', 'MLD', 'CLC', 'PLJ', 'ITR', 'AIR', 'SCC',
  'YLR', 'NLR', 'KLR', 'TAXMAN', 'SBLR', 'PTR'
];

const ADDITIONAL_COURTS = [
  'Supreme Court of Pakistan',
  'Federal Constitutional Court of Pakistan',
  'Lahore High Court',
  'Sindh High Court',
  'Peshawar High Court',
  'Islamabad High Court',
  'Balochistan High Court',
  'High Court of Balochistan',
  'Federal Shariat Court',
  'Appellate Tribunal Inland Revenue',
  'Appellate Tribunal Inland Revenue, Islamabad',
  'Appellate Tribunal Inland Revenue, Karachi',
  'Appellate Tribunal Inland Revenue, Lahore',
  'Appellate Tribunal Inland Revenue, Peshawar',
  'Income Tax Appellate Tribunal',
  'Income Tax Appellate Tribunal, Karachi',
  'Income Tax Appellate Tribunal, Lahore',
  'Income Tax Appellate Tribunal, Islamabad',
  'Customs Appellate Tribunal',
  'Federal Tax Ombudsman',
  'Federal Service Tribunal, Islamabad',
  'Lahore High Court, Multan Bench, Multan',
  'Lahore High Court, Rawalpindi Bench, Rawalpindi',
  'Sindh High Court, Hyderabad Bench',
  'Peshawar High Court, Abbottabad Bench',
  'High Court (AJ&K)',
  'Supreme Court (AJ&K)',
  'Gilgit Baltistan Chief Court',
  'Competition Commission of Pakistan',
  'House of Lord',
  'Privy Council',
  'Supreme Court of India',
  'Supreme Court of the United States',
  'High Court of Australia',
  'Tax / FBR'
];

const determineUnderCourt = (courtName = '') => {
  const name = courtName.toLowerCase();
  if (name.includes('supreme court') || name.includes('supreme appellate') || name.includes('house of lord') || name.includes('privy council')) {
    return 'Supreme Court';
  }
  if (name.includes('high court') || name.includes('chief court')) {
    return 'High Court';
  }
  if (name.includes('tribunal') || name.includes('board') || name.includes('commission') || name.includes('ombudsman') || name.includes('authority') || name.includes('fbr') || name.includes('institution') || name.includes('union')) {
    return 'Tribunal';
  }
  if (name.includes('federal') || name.includes('secretariat') || name.includes('central')) {
    return 'Federal Court';
  }
  if (name.includes('special') || name.includes('banking') || name.includes('anti-smuggling') || name.includes('anti-corruption') || name.includes('labour') || name.includes('election') || name.includes('shariat') || name.includes('environmental') || name.includes('settlement')) {
    return 'Special Court';
  }
  return 'Other';
};

const runSeed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    // 1. SEED MAGAZINES
    console.log('\n--- Seeding Magazines ---');
    const existingMags = await Magazine.find({}, 'name');
    const existingMagSet = new Set(existingMags.map(m => m.name.toLowerCase().trim()));

    const magOps = [];
    let magOrdering = existingMags.length + 1;

    for (const mag of HARDCODED_MAGAZINES) {
      const cleanName = mag.trim();
      if (!existingMagSet.has(cleanName.toLowerCase())) {
        magOps.push({
          insertOne: {
            document: {
              name: cleanName,
              ordering: magOrdering++,
              status: 'active'
            }
          }
        });
        existingMagSet.add(cleanName.toLowerCase());
      }
    }

    if (magOps.length > 0) {
      const res = await Magazine.bulkWrite(magOps);
      console.log(`Inserted ${res.insertedCount} new magazines.`);
    } else {
      console.log('All magazines already exist.');
    }
    const totalMagazines = await Magazine.countDocuments();
    console.log(`Total magazines in DB: ${totalMagazines}`);

    // 2. SEED COURTS
    console.log('\n--- Seeding Courts ---');
    const allCourtNames = new Set();
    COURT_OPTIONS.forEach(c => {
      const val = (c?.value || c?.label || '').trim();
      if (val && val !== 'Select Court') allCourtNames.add(val);
    });
    ADDITIONAL_COURTS.forEach(c => {
      const val = (c || '').trim();
      if (val && val !== 'Select Court') allCourtNames.add(val);
    });

    const existingCourts = await CourtSetting.find({}, 'name');
    const existingCourtSet = new Set(existingCourts.map(c => c.name.toLowerCase().trim()));

    const courtOps = [];
    let courtOrdering = existingCourts.length + 1;

    for (const court of allCourtNames) {
      if (!existingCourtSet.has(court.toLowerCase())) {
        courtOps.push({
          insertOne: {
            document: {
              name: court,
              underCourt: determineUnderCourt(court),
              ordering: courtOrdering++,
              status: 'active'
            }
          }
        });
        existingCourtSet.add(court.toLowerCase());
      }
    }

    if (courtOps.length > 0) {
      const res = await CourtSetting.bulkWrite(courtOps);
      console.log(`Inserted ${res.insertedCount} new courts.`);
    } else {
      console.log('All courts already exist.');
    }
    const totalCourts = await CourtSetting.countDocuments();
    console.log(`Total courts in DB: ${totalCourts}`);

    // 3. SEED LAWS / STATUTES
    console.log('\n--- Seeding Laws ---');
    const allLawNames = new Set();
    LAW_OPTIONS.forEach(l => {
      const val = (l?.label || l?.value || '').trim();
      if (val && val !== 'Choose a law') allLawNames.add(val);
    });

    const existingLaws = await LawSetting.find({}, 'name');
    const existingLawSet = new Set(existingLaws.map(l => l.name.toLowerCase().trim()));

    const lawOps = [];
    let lawOrdering = existingLaws.length + 1;

    for (const lawName of allLawNames) {
      if (!existingLawSet.has(lawName.toLowerCase())) {
        lawOps.push({
          insertOne: {
            document: {
              name: lawName,
              ordering: lawOrdering++,
              date: new Date(),
              court: '',
              status: 'active'
            }
          }
        });
        existingLawSet.add(lawName.toLowerCase());
      }
    }

    if (lawOps.length > 0) {
      // Chunk bulkWrite by 1000
      let inserted = 0;
      for (let i = 0; i < lawOps.length; i += 1000) {
        const chunk = lawOps.slice(i, i + 1000);
        const res = await LawSetting.bulkWrite(chunk);
        inserted += res.insertedCount;
      }
      console.log(`Inserted ${inserted} new laws.`);
    } else {
      console.log('All laws already exist.');
    }
    const totalLaws = await LawSetting.countDocuments();
    console.log(`Total laws in DB: ${totalLaws}`);

    console.log('\nSeeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

runSeed();
