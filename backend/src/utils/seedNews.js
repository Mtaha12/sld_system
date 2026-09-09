import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import News from '../models/News.js';

const initialNewsData = [
  {
    srNumber: 1,
    date: '2026-08-31',
    year: 2026,
    heading: 'Sec 7E, Super tax under Sec 4C: FBR yet to devise mechanism for refunding taxes: Butt',
    detail: '<p>Federal Board of Revenue (FBR) is yet to formulate an operational mechanism for refunding taxes collected under Section 7E and Super Tax under Section 4C following high court rulings and appellate determinations.</p>'
  },
  {
    srNumber: 2,
    date: '2026-08-31',
    year: 2026,
    heading: 'IDEAS Expo Centre revenue loss: AGP settles audit para of TDAP',
    detail: '<p>The Auditor General of Pakistan (AGP) has formally settled the long-standing audit observation regarding revenue allocation and event management audits for the Karachi Expo Centre under the Trade Development Authority of Pakistan (TDAP).</p>'
  },
  {
    srNumber: 3,
    date: '2026-08-31',
    year: 2026,
    heading: 'President rejects FBR presentation against FTO order',
    detail: '<p>The President of Pakistan has turned down a representation filed by the FBR against the findings of the Federal Tax Ombudsman (FTO) pertaining to maladministration in taxpayer refund release.</p>'
  },
  {
    srNumber: 4,
    date: '2026-08-31',
    year: 2026,
    heading: 'FBR explains amortisation deductions for intangibles in Tax Year 2027',
    detail: '<p>Detailed guidance notes have been released regarding amortisation schedules and valid depreciation deductions for intangible assets under the updated income tax framework for Tax Year 2027.</p>'
  },
  {
    srNumber: 5,
    date: '2026-08-31',
    year: 2026,
    heading: 'FBR explains tax deduction for scientific research in Tax Year 2027',
    detail: '<p>Clarification has been issued regarding legitimate research expenditures, laboratory certifications, and tax deduction thresholds allowable under scientific innovation provisions.</p>'
  },
  {
    srNumber: 6,
    date: '2026-08-31',
    year: 2026,
    heading: 'FBR allows employee training tax deductions for Tax Year 2027',
    detail: '<p>Corporate taxpayers will be eligible for specified tax deductions on professional workforce development, skills training, and technical skill enhancement expenses.</p>'
  },
  {
    srNumber: 7,
    date: '2026-08-31',
    year: 2026,
    heading: 'Indus Motor crosses Rs1 trillion in cumulative tax contributions',
    detail: '<p>Indus Motor Company has announced reaching an aggregate milestone of Rs1 trillion deposited into the national exchequer via custom duties, sales tax, and federal excise.</p>'
  },
  {
    srNumber: 8,
    date: '2026-08-30',
    year: 2026,
    heading: 'RTO Hyderabad intercepts poultry feed over missing digital invoice',
    detail: '<p>Regional Tax Office (RTO) Hyderabad intelligence teams intercepted commercial shipments failing to produce active Point of Sale (POS) digital verifiable invoices.</p>'
  },
  {
    srNumber: 9,
    date: '2026-08-30',
    year: 2026,
    heading: 'FBR lists business expenses not deductible for Tax Year 2027',
    detail: '<p>A comprehensive notification outlining non-deductible expenditure categories including non-banking financial transactions and unregistered supplier invoices.</p>'
  },
  {
    srNumber: 10,
    date: '2026-08-30',
    year: 2026,
    heading: 'FBR sets depreciation rules for Tax Year 2027',
    detail: '<p>Updated asset classes and standardized depreciation amortization percentages for commercial industrial equipment and digital hardware assets.</p>'
  }
];

const seedNews = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('No MONGODB_URI in environment.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const count = await News.countDocuments();
    if (count === 0) {
      console.log('No news records found. Seeding initial news...');
      for (const item of initialNewsData) {
        const newsDoc = new News(item);
        await newsDoc.save();
      }
      console.log(`Successfully seeded ${initialNewsData.length} news items!`);
    } else {
      console.log(`News collection already has ${count} records. No seeding needed.`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed News failed:', error);
    process.exit(1);
  }
};

seedNews();
