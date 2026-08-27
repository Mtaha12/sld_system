import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Configure public DNS servers to resolve MongoDB Atlas SRV/TXT records securely
dns.setServers(['8.8.8.8', '1.1.1.1']);

// Models
import Case from '../models/Case.js';
import Statute from '../models/Statute.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Mock Data
import { MOCK_CASES } from '../../../frontend/src/features/cases/data/casesMockData.js';
import { MOCK_STATUTES } from '../../../frontend/src/features/statutes/data/statutesMockData.js';
import { MOCK_NOTIFICATIONS } from '../../../frontend/src/features/notifications/data/notificationsMockData.js';

const dotenvResult = dotenv.config({ override: true });
console.log('[Seeder] Dotenv Result:', dotenvResult);

const seedDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  console.log('[Seeder] Resolved MONGODB_URI:', mongoUri);

  if (!mongoUri) {
    console.error('[Seeding Error] MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('[Seeder] Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('[Seeder] Connected to MongoDB.');

    // 1. Seed Case Laws
    console.log('[Seeder] Clearing Cases collection...');
    await Case.deleteMany({});

    console.log('[Seeder] Mapping and seeding mock cases...');
    const casesToInsert = MOCK_CASES.map(c => {
      // Parse mapYearPage to create publication entries
      const publications = (c.mapYearPage || []).map((citation, idx) => {
        const parts = citation.split(' ');
        // E.g. "SLD 2025 8335" -> mag: "SLD", year: "2025", page: "8335"
        // E.g. "(2025) Tax 304 139" -> mag: "Tax", year: "2025", vol: "304", page: "139"
        let mag = 'sld';
        let year = '2025';
        let vol = '';
        let page = '';
        let month = c.month?.toLowerCase() || 'may';

        if (parts.length >= 3) {
          if (parts[0].includes('(')) {
            // (2025) Tax 304 139
            year = parts[0].replace(/[()]/g, '');
            mag = parts[1].toLowerCase();
            vol = parts[2];
            page = parts[3] || '';
          } else {
            // SLD 2025 8335
            mag = parts[0].toLowerCase();
            year = parts[1];
            page = parts[2] || '';
          }
        }

        return { id: idx + 1, year, vol, mag, page, month };
      });

      return {
        sldNumber: c.sldNumber,
        dated: c.dated || null,
        court: c.court || '',
        caseNumber: Array.isArray(c.caseNumber) ? c.caseNumber : [c.caseNumber],
        judges: Array.isArray(c.judges) ? c.judges : [c.judges],
        lawyers: Array.isArray(c.lawyers) ? c.lawyers : [c.lawyers],
        petitioners: Array.isArray(c.petitioners) ? c.petitioners : [c.petitioners],
        headNote: c.headNote || 'Constitutional review on statutory mandate under relevant procedural codes.',
        references: c.references || '2019 CLC 551, (2025) Tax 304 139',
        principleLaw: c.principleLaw || 'Income Tax Rules, 2002 - Section 231CB',
        judgment: c.judgment || '<p><strong>IN THE FEDERAL CONSTITUTIONAL COURT OF PAKISTAN</strong></p><p>Upon extensive deliberation and review of arguments presented by counsel, the Court observed that the statutory provisions must be interpreted in alignment with natural justice and constitutional guarantees.</p>',
        status: c.status || 'Active',
        publications,
        attachments: Array.from({ length: c.attachments || 1 }).map((_, i) => ({
          name: i === 0 ? `Order_Sheet_SLD_${c.sldNumber}.pdf` : `Certified_Judgment_${c.sldNumber}.docx`,
          size: i === 0 ? '1.84 MB' : '920 KB',
          type: i === 0 ? 'pdf' : 'word'
        })),
        mapYearPage: c.mapYearPage || []
      };
    });

    await Case.insertMany(casesToInsert);
    console.log(`[Seeder] Seeded ${casesToInsert.length} Case Law records.`);

    // 2. Seed Statutes
    console.log('[Seeder] Clearing Statutes collection...');
    await Statute.deleteMany({});

    console.log('[Seeder] Mapping and seeding mock statutes...');
    const statutesToInsert = MOCK_STATUTES.map(s => {
      // Create repeating block content
      const blocks = [
        {
          sectionHeading: s.sectionHeading || '',
          fromDate: s.dated || null,
          toDate: null,
          detail: `<p><strong>${s.sectionHeading || 'Statute Section'}</strong></p><p>Detailed statutory provisions, regulatory clauses, and compliance directives under ${s.law || 'Statutory Code'}.</p>`,
          attachments: []
        }
      ];

      return {
        srNumber: s.id.toString(), // MOCK_STATUTES uses id
        department: s.department?.toLowerCase() || 'tax',
        chapter: s.chapter || '',
        display: s.display?.toLowerCase() === 'no' ? 'no' : 'yes',
        status: s.display?.toLowerCase() === 'no' ? 'inactive' : 'active',
        law: s.law || '',
        section: s.section || '',
        heading: s.heading || '',
        blocks
      };
    });

    await Statute.insertMany(statutesToInsert);
    console.log(`[Seeder] Seeded ${statutesToInsert.length} Statute records.`);

    // 3. Seed Notifications
    console.log('[Seeder] Clearing Notifications collection...');
    await Notification.deleteMany({});

    console.log('[Seeder] Mapping and seeding mock notifications...');
    const notificationsToInsert = MOCK_NOTIFICATIONS.map(n => {
      const blocks = [
        {
          date: n.lawDate || null,
          detail: `<p><strong>${n.subject || 'Notification'}</strong></p><p>Official statutory notification details and circular directives issued under the applicable legal framework.</p>`,
          attachments: []
        }
      ];

      return {
        srNumber: n.srNumber.toString(),
        number: n.number?.toString() || '',
        year: n.year || new Date().getFullYear(),
        department: n.department || 'Notifications',
        sroNumber: n.sroNumber || '',
        subject: n.subject || '',
        lawStatute: n.lawStatute || '',
        section: n.section || '',
        status: n.status || 'Active',
        lawDate: n.lawDate || '',
        blocks
      };
    });

    await Notification.insertMany(notificationsToInsert);
    console.log(`[Seeder] Seeded ${notificationsToInsert.length} Notification records.`);

    // 4. Seed Default Admin User
    console.log('[Seeder] Checking for default Admin user...');
    const adminEmail = 'adam.admin@sldsystem.com';
    const adminExist = await User.findOne({ email: adminEmail });
    
    if (!adminExist) {
      const admin = new User({
        fullName: 'Adam Admin',
        username: 'adam_admin',
        email: adminEmail,
        password: 'admin123', // Will be hashed by pre-save hook
        role: 'Administrator',
        contactNumber: '+92 300 1234567',
        city: 'Karachi',
        companyName: 'SLD Law Firm',
        address: '123 Legal Street, Phase 4, Clifton',
        avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
        isVerified: true
      });
      await admin.save();
      console.log('[Seeder] Created default Administrator user: adam_admin / admin123');
    } else {
      console.log('[Seeder] Default Admin user already exists.');
    }

    console.log('[Seeder] Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`[Seeder Error] Failed to seed database: ${error.message}`, error);
    process.exit(1);
  }
};

seedDB();
