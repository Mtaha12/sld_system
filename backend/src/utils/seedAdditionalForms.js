import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

import WhatsappUpdate from '../models/WhatsappUpdate.js';
import WebsiteUpdate from '../models/WebsiteUpdate.js';
import DownloadItem from '../models/DownloadItem.js';
import YoutubeUpdate from '../models/YoutubeUpdate.js';

const initialWhatsapp = [
  { srNumber: 1, dated: '2026-06-17', heading: '1. Overview of the evolution of corporate law in Pakistan by Mr. Rahat Aziz', attachmentName: 'Corporate_Law_Overview.pdf' },
  { srNumber: 2, dated: '2026-06-17', heading: '2. Ultimate Beneficial Ownership (UBO) requirements by Mr. Kashif Mahmood (SECP)', attachmentName: 'UBO_Requirements_SECP.pdf' },
  { srNumber: 3, dated: '2026-06-17', heading: 'Anomalies & Recommendations By Razi Ahsan dt 17th June 2026', attachmentName: 'Recommendations_Razi.pdf' },
  { srNumber: 4, dated: '2026-06-17', heading: '3. Conversion of physical shares into book-entry form by Mr. Farooq Ahmed (CDC)', attachmentName: 'CDC_Share_Conversion.pdf' },
  { srNumber: 5, dated: '2026-06-17', heading: 'News Updates, June 17, 2026', attachmentName: 'News_Updates_June17.pdf' },
  { srNumber: 6, dated: '2026-06-17', heading: 'Punjab Finance Bill, 2026', attachmentName: 'Punjab_Finance_Bill_2026.pdf' }
];

const initialUpdates = [
  { srNumber: 1, dated: '2026-09-08', heading: 'FBR Portal System Upgrade: Digital Tax Filing Version 4.2', url: 'https://iris.fbr.gov.pk' },
  { srNumber: 2, dated: '2026-09-07', heading: 'Securities and Exchange Commission Online Services Portal Revision', url: 'https://eservices.secp.gov.pk' },
  { srNumber: 3, dated: '2026-09-05', heading: 'Sindh Revenue Board: Electronic Sales Tax Invoicing Guideline', url: 'https://srb.gos.pk' },
  { srNumber: 4, dated: '2026-09-02', heading: 'State Bank of Pakistan Foreign Exchange Manual 2026 Amendment', url: 'https://sbp.org.pk' }
];

const initialDownloads = [
  {
    srNumber: 1,
    date: '2026-09-08',
    heading: 'Federal Finance Act 2026 - Comprehensive Explanatory Guide',
    latest: 'Finance Act',
    attachmentName: 'Finance_Act_2026_Explanatory.pdf',
    detail: '<p>Official comprehensive explanatory guidelines and changes introduced via the Finance Act 2026 covering corporate tax brackets, super tax calculations, and revised sales tax rates.</p>'
  },
  {
    srNumber: 2,
    date: '2026-09-06',
    heading: 'Salaried Individual & AOP Income Tax Return Form - Tax Year 2026',
    latest: 'Tax Return',
    attachmentName: 'Tax_Return_Form_2026.xlsx',
    detail: '<p>Standardized Excel and PDF offline computation templates for individual salaried taxpayers and Association of Persons (AOP) for Tax Year 2026.</p>'
  },
  {
    srNumber: 3,
    date: '2026-09-04',
    heading: 'Income Tax Ordinance, 2001 (Updated up to 31st August 2026)',
    latest: 'Updated Law',
    attachmentName: 'Income_Tax_Ordinance_Updated_2026.pdf',
    detail: '<p>The complete, indexed, and cross-referenced text of the Income Tax Ordinance 2001 incorporating all statutory amendments, case precedents, and SRO notifications.</p>'
  }
];

const initialYoutube = [
  {
    srNumber: 1,
    dated: '2026-03-27',
    caption: 'Lahore Tax Bar Annual Dinner 2026 | Election Result, Asif Rana Team Victory',
    url: 'https://www.youtube.com/watch?v=T9sAnLmEJFA',
    photoName: 'tax_bar_dinner_2026.jpg'
  },
  {
    srNumber: 2,
    dated: '2026-03-15',
    caption: 'Mastering Super Tax Section 4C Computations & High Court Judgments Analysis',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    photoName: 'super_tax_analysis.jpg'
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    if (await WhatsappUpdate.countDocuments() === 0) {
      for (const item of initialWhatsapp) await new WhatsappUpdate(item).save();
      console.log('Seeded Whatsapp updates.');
    }
    if (await WebsiteUpdate.countDocuments() === 0) {
      for (const item of initialUpdates) await new WebsiteUpdate(item).save();
      console.log('Seeded Website updates.');
    }
    if (await DownloadItem.countDocuments() === 0) {
      for (const item of initialDownloads) await new DownloadItem(item).save();
      console.log('Seeded Downloads.');
    }
    if (await YoutubeUpdate.countDocuments() === 0) {
      for (const item of initialYoutube) await new YoutubeUpdate(item).save();
      console.log('Seeded Youtube updates.');
    }

    await mongoose.disconnect();
    console.log('Finished seeding additional forms.');
  } catch (err) {
    console.error(err);
  }
};

seed();
