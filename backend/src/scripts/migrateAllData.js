import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import connectDB from '../config/db.js';

import Magazine from '../models/Magazine.js';
import CourtSetting from '../models/CourtSetting.js';
import LawSetting from '../models/LawSetting.js';
import City from '../models/City.js';
import PrincipleOfLaw from '../models/PrincipleOfLaw.js';
import DownloadItem from '../models/DownloadItem.js';
import Dictionary from '../models/Dictionary.js';
import CustomTariff from '../models/CustomTariff.js';
import Notification from '../models/Notification.js';
import Statute from '../models/Statute.js';
import TaxCard from '../models/TaxCard.js';
import News from '../models/News.js';
import Newsletter from '../models/Newsletter.js';
import WebsiteUpdate from '../models/WebsiteUpdate.js';
import WhatsappUpdate from '../models/WhatsappUpdate.js';
import YoutubeUpdate from '../models/YoutubeUpdate.js';
import IpBlock from '../models/IpBlock.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';

const ROOT_DIR = path.resolve(__dirname, '../../..');

const readJson = (filename) => {
  const fullPath = path.join(ROOT_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] File not found: ${filename}`);
    return [];
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
};

const BATCH_SIZE = 1000;

async function runMigration() {
  console.log('='.repeat(70));
  console.log('STARTING PROFESSIONAL DATABASE DATA SHIFTING');
  console.log('='.repeat(70));

  await connectDB();

  // Load lookup tables
  console.log('\nLoading lookup references...');
  const deptsJson = readJson('cms_departments.json');
  const deptMap = {};
  deptsJson.forEach(d => {
    if (d.dept_id && d.dept_name) deptMap[d.dept_id] = d.dept_name.trim();
  });

  const lawsJson = readJson('cms_lawstatutes.json');
  const lawMap = {};
  lawsJson.forEach(l => {
    if (l.law_id && l.law_name) lawMap[l.law_id] = l.law_name.trim();
  });

  const courtsJson = readJson('cms_courts.json');
  const courtMap = {};
  courtsJson.forEach(c => {
    if (c.court_id && c.court_name) courtMap[c.court_id] = c.court_name.trim();
  });

  const sectionsJson = readJson('cms_sections.json');
  const sectionMap = {};
  sectionsJson.forEach(s => {
    if (s.sec_id && s.sec_name) sectionMap[s.sec_id] = s.sec_name.trim();
  });

  const citiesJson = readJson('cms_cities.json');
  const cityMap = {};
  citiesJson.forEach(c => {
    if (c.city_id && c.city_name) cityMap[c.city_id] = c.city_name.trim();
  });

  // -------------------------------------------------------------
  // 1. MAGAZINES
  // -------------------------------------------------------------
  console.log('\n[1/17] Shifting Magazines...');
  const magsJson = readJson('cms_magazines.json');
  const existingMags = await Magazine.find().select('name').lean();
  const existingMagSet = new Set(existingMags.map(m => m.name.toLowerCase().trim()));
  const magOps = [];
  let nextMagOrder = existingMags.length + 1;

  for (const m of magsJson) {
    const name = (m.mag_name || '').trim();
    if (!name || existingMagSet.has(name.toLowerCase())) continue;
    magOps.push({
      name,
      ordering: m.mag_ordering || nextMagOrder++,
      status: m.mag_status === 1 ? 'active' : 'inactive'
    });
    existingMagSet.add(name.toLowerCase());
  }
  if (magOps.length > 0) {
    await Magazine.insertMany(magOps);
    console.log(`  -> Inserted ${magOps.length} new magazines.`);
  } else {
    console.log('  -> All magazines already exist.');
  }

  // -------------------------------------------------------------
  // 2. PRINCIPLES OF LAW
  // -------------------------------------------------------------
  console.log('\n[2/17] Shifting Principles of Law...');
  const plawsJson = readJson('cms_principlelaws.json');
  const existingPlaws = await PrincipleOfLaw.find().select('name').lean();
  const existingPlawSet = new Set(existingPlaws.map(p => p.name.toLowerCase().trim()));
  const plawDocs = [];

  for (const p of plawsJson) {
    const name = (p.plaw_name || '').trim();
    if (!name || existingPlawSet.has(name.toLowerCase())) continue;
    plawDocs.push({
      name,
      status: p.plaw_status === 1 ? 'active' : 'inactive'
    });
    existingPlawSet.add(name.toLowerCase());
  }
  if (plawDocs.length > 0) {
    for (let i = 0; i < plawDocs.length; i += BATCH_SIZE) {
      await PrincipleOfLaw.insertMany(plawDocs.slice(i, i + BATCH_SIZE), { ordered: false });
    }
    console.log(`  -> Inserted ${plawDocs.length} new principles of law.`);
  } else {
    console.log('  -> All principles of law already exist.');
  }

  // -------------------------------------------------------------
  // 3. LAW SETTINGS
  // -------------------------------------------------------------
  console.log('\n[3/17] Shifting Law Settings...');
  const existingLaws = await LawSetting.find().select('name').lean();
  const existingLawSet = new Set(existingLaws.map(l => l.name.toLowerCase().trim()));
  const lawDocs = [];
  let lawOrdering = existingLaws.length + 1;

  for (const l of lawsJson) {
    const name = (l.law_name || '').trim();
    if (!name || existingLawSet.has(name.toLowerCase())) continue;
    lawDocs.push({
      name,
      ordering: l.law_ordering || lawOrdering++,
      court: courtMap[l.id_court] || '',
      date: l.date_added && l.date_added !== '0000-00-00 00:00:00' ? new Date(l.date_added) : new Date(),
      status: l.law_status === 1 ? 'active' : 'inactive'
    });
    existingLawSet.add(name.toLowerCase());
  }
  if (lawDocs.length > 0) {
    for (let i = 0; i < lawDocs.length; i += BATCH_SIZE) {
      await LawSetting.insertMany(lawDocs.slice(i, i + BATCH_SIZE), { ordered: false });
    }
    console.log(`  -> Inserted ${lawDocs.length} new law settings.`);
  } else {
    console.log('  -> All law settings already exist.');
  }

  // -------------------------------------------------------------
  // 4. DOWNLOADS
  // -------------------------------------------------------------
  console.log('\n[4/17] Shifting Downloads...');
  const downloadsJson = readJson('cms_downloads.json');
  const rawExistingDownloads = await mongoose.connection.db.collection('downloaditems').find({}, { projection: { downloadId: 1, heading: 1, date: 1 } }).toArray();
  const existingDwnSet = new Set(rawExistingDownloads.map(d => d.downloadId));
  const existingDwnKeySet = new Set(rawExistingDownloads.map(d => `${(d.heading || '').trim()}_${d.date}`));
  const dwnDocs = [];
  let maxDwnSr = 0;

  for (const d of downloadsJson) {
    const downloadId = `DWN-${String(d.id).padStart(6, '0')}`;
    const heading = (d.heading || '').trim();
    const date = (d.dated || '').trim();
    const key = `${heading}_${date}`;
    if (!heading || existingDwnSet.has(downloadId) || existingDwnKeySet.has(key)) continue;

    // Requirement: "in download form latest dropdown instead of yes write finance act"
    let latestVal = 'Finance Act';
    if (d.is_latest === 2 || d.latest === 'Tax Return') {
      latestVal = 'Tax Return';
    } else if (d.is_latest === 3 || d.latest === 'Updated Law') {
      latestVal = 'Updated Law';
    } else {
      latestVal = 'Finance Act'; // 1 or Yes -> 'Finance Act'
    }

    const srNum = Number(d.id) || 1;
    if (srNum > maxDwnSr) maxDwnSr = srNum;

    dwnDocs.push({
      downloadId: `DWN-${String(d.id).padStart(6, '0')}`,
      download_id: `DWN-${String(d.id).padStart(6, '0')}`,
      srNumber: srNum,
      heading,
      date,
      latest: latestVal,
      attachment: d.attachment || '',
      attachmentName: d.attachment ? path.basename(d.attachment) : '',
      detail: d.details || '',
      isDeleted: Boolean(d.is_deleted),
      deletedAt: d.is_deleted ? new Date() : null,
      createdAt: d.date_added && d.date_added !== '0000-00-00 00:00:00' ? new Date(d.date_added) : new Date(),
      updatedAt: d.date_modify && d.date_modify !== '0000-00-00 00:00:00' ? new Date(d.date_modify) : new Date()
    });
    existingDwnSet.add(key);
  }
  if (dwnDocs.length > 0) {
    await DownloadItem.insertMany(dwnDocs, { ordered: false });
    await Counter.findByIdAndUpdate('download_sr_seq', { $max: { seq: maxDwnSr } }, { upsert: true });
    console.log(`  -> Inserted ${dwnDocs.length} new downloads.`);
  } else {
    console.log('  -> All downloads already exist.');
  }

  // -------------------------------------------------------------
  // 5. DICTIONARY
  // -------------------------------------------------------------
  console.log('\n[5/17] Shifting Dictionary...');
  const dictJson = readJson('cms_dictionary.json');
  const existingDictWords = new Set(await Dictionary.distinct('words'));
  const dictDocs = [];
  let maxDictSr = 0;

  for (const item of dictJson) {
    const words = (item.words || '').trim();
    if (!words || existingDictWords.has(words)) continue;

    const srNum = Number(item.srno || item.id) || 1;
    if (srNum > maxDictSr) maxDictSr = srNum;

    dictDocs.push({
      dictionaryId: `DICT-${String(item.id).padStart(6, '0')}`,
      dictionary_id: `DICT-${String(item.id).padStart(6, '0')}`,
      srNumber: srNum,
      words,
      meaning: item.meaning || '',
      isDeleted: Boolean(item.is_deleted),
      deletedAt: item.is_deleted ? new Date() : null,
      createdAt: item.date_added && item.date_added !== '0000-00-00 00:00:00' ? new Date(item.date_added) : new Date(),
      updatedAt: item.date_modify && item.date_modify !== '0000-00-00 00:00:00' ? new Date(item.date_modify) : new Date()
    });
    existingDictWords.add(words);
  }
  if (dictDocs.length > 0) {
    for (let i = 0; i < dictDocs.length; i += BATCH_SIZE) {
      await Dictionary.insertMany(dictDocs.slice(i, i + BATCH_SIZE), { ordered: false });
      process.stdout.write(`  -> Inserted ${Math.min(i + BATCH_SIZE, dictDocs.length)}/${dictDocs.length} dictionary words\r`);
    }
    await Counter.findByIdAndUpdate('dictionary_sr_seq', { $max: { seq: maxDictSr } }, { upsert: true });
    console.log(`\n  -> Inserted ${dictDocs.length} new dictionary words.`);
  } else {
    console.log('  -> All dictionary words already exist.');
  }

  // -------------------------------------------------------------
  // 6. CUSTOM TARIFFS
  // -------------------------------------------------------------
  console.log('\n[6/17] Shifting Custom Tariffs...');
  const tariffsJson = readJson('cms_customtariffs.json');
  const tariffDetailsJson = readJson('cms_customtariffsdetail.json');
  const tariffDetailsMap = {};
  tariffDetailsJson.forEach(td => {
    if (!tariffDetailsMap[td.id_custom]) tariffDetailsMap[td.id_custom] = [];
    tariffDetailsMap[td.id_custom].push({
      pctCode: td.pct_code || '',
      description: td.detail || '',
      uom: td.uom || '',
      cd: td.cd || '',
      ad: td.ad || '',
      rd: td.rd || '',
      exSth: td.ex5th || '',
      con: td.con || '',
      st: td.st || '',
      wht: td.wht || '',
      other: td.other || '',
      subDetail: td.detail || ''
    });
  });

  const rawExistingTariffs = await mongoose.connection.db.collection('customtariffs').find({}, { projection: { customTariffId: 1 } }).toArray();
  const existingTariffSet = new Set(rawExistingTariffs.map(t => t.customTariffId));
  const tariffDocs = [];
  let maxTariffSr = 0;

  for (const t of tariffsJson) {
    const tariffId = `CT-${String(t.id).padStart(6, '0')}`;
    if (existingTariffSet.has(tariffId)) continue;

    // Requirement: "make sure to add exact sld number is some numbers are skip kindly fill it blank"
    const sldNum = t.sldno && Number(t.sldno) > 0 ? String(t.sldno).trim() : '';

    const items = tariffDetailsMap[t.id] || [];
    if (t.maindetail || t.mainpctcode) {
      items.unshift({
        pctCode: t.mainpctcode || '',
        description: t.maindetail || '',
        uom: t.mainuom || '',
        cd: t.maincd || '',
        ad: t.mainad || '',
        rd: t.mainrd || '',
        exSth: t.mainex5th || '',
        con: t.maincon || '',
        st: t.mainst || '',
        wht: t.mainwht || '',
        other: t.mainother || '',
        subDetail: t.maindetail || ''
      });
    }

    const srNum = Number(t.id) || 1;
    if (srNum > maxTariffSr) maxTariffSr = srNum;

    tariffDocs.push({
      customTariffId: tariffId,
      custom_tariff_id: tariffId,
      srNumber: srNum,
      sldNumber: sldNum,
      dated: t.dated || '',
      fromYear: String(t.yearfrom || ''),
      toYear: String(t.yearto || ''),
      status: t.status === 1 ? 'Active' : 'Inactive',
      heading: t.heading || 'Custom Tariff',
      attachment: t.attachment || '',
      attachmentName: t.attachment ? path.basename(t.attachment) : '',
      detail: t.details || t.details1 || '',
      items,
      isDeleted: Boolean(t.is_deleted),
      deletedAt: t.is_deleted ? new Date() : null,
      createdAt: t.date_added && t.date_added !== '0000-00-00 00:00:00' ? new Date(t.date_added) : new Date(),
      updatedAt: t.date_modify && t.date_modify !== '0000-00-00 00:00:00' ? new Date(t.date_modify) : new Date()
    });
    existingTariffSet.add(tariffId);
  }
  if (tariffDocs.length > 0) {
    await CustomTariff.insertMany(tariffDocs, { ordered: false });
    await Counter.findByIdAndUpdate('custom_tariff_sr_seq', { $max: { seq: maxTariffSr } }, { upsert: true });
    console.log(`  -> Inserted ${tariffDocs.length} new custom tariffs.`);
  } else {
    console.log('  -> All custom tariffs already exist.');
  }

  // -------------------------------------------------------------
  // 7. NOTIFICATIONS
  // -------------------------------------------------------------
  console.log('\n[7/17] Shifting Notifications...');
  const notifsJson = readJson('cms_notifications.json');
  const notifDetailsJson = readJson('cms_notificationsdetail.json');
  const notifDetailsMap = {};
  notifDetailsJson.forEach(nd => {
    if (!notifDetailsMap[nd.id_noti]) notifDetailsMap[nd.id_noti] = [];
    notifDetailsMap[nd.id_noti].push({
      date: nd.law_date && nd.law_date !== '0000-00-00' ? nd.law_date : null,
      detail: nd.details || '',
      attachments: nd.attachment ? [nd.attachment] : []
    });
  });

  const existingNotifs = new Set(await mongoose.connection.db.collection('notifications').distinct('notificationId'));
  const notifDocs = [];

  for (const n of notifsJson) {
    const notifId = `NOTIF-${String(n.id).padStart(6, '0')}`;
    if (existingNotifs.has(notifId)) continue;

    const blocks = notifDetailsMap[n.id] || [];
    const deptName = deptMap[n.id_dept] || 'Notifications';
    const subDept = n.sub_dept === 2 ? 'provincial' : 'federal';
    const lawStatute = lawMap[n.id_law1] || '';

    notifDocs.push({
      notificationId: notifId,
      notification_id: notifId,
      srNumber: n.srno ? String(n.srno) : String(n.id),
      number: n.noti_no ? String(n.noti_no).trim() : '',
      year: Number(n.noti_year) || new Date().getFullYear(),
      department: deptName,
      subDepartment: subDept,
      sroNumber: n.sro_no || '',
      subject: n.noti_subject || `Notification ${n.noti_no || n.id}`,
      lawStatute,
      section: n.section1 || '',
      lawDate: '',
      blocks,
      isDeleted: Boolean(n.is_deleted),
      deletedAt: n.is_deleted ? new Date() : null,
      createdAt: n.date_added && n.date_added !== '0000-00-00 00:00:00' ? new Date(n.date_added) : new Date(),
      updatedAt: n.date_modify && n.date_modify !== '0000-00-00 00:00:00' ? new Date(n.date_modify) : new Date()
      // NOTE: status field intentionally omitted per instructions
    });
    existingNotifs.add(notifId);
  }
  if (notifDocs.length > 0) {
    for (let i = 0; i < notifDocs.length; i += BATCH_SIZE) {
      await Notification.insertMany(notifDocs.slice(i, i + BATCH_SIZE), { ordered: false });
      process.stdout.write(`  -> Inserted ${Math.min(i + BATCH_SIZE, notifDocs.length)}/${notifDocs.length} notifications\r`);
    }
    console.log(`\n  -> Inserted ${notifDocs.length} new notifications.`);
  } else {
    console.log('  -> All notifications already exist.');
  }

  // -------------------------------------------------------------
  // 8. STATUTES
  // -------------------------------------------------------------
  console.log('\n[8/17] Shifting Statutes...');
  const statutesJson = readJson('cms_statuteforms.json');
  const statuteDetailsJson = readJson('cms_statuteformsdetail.json');
  const statuteDetailsMap = {};
  statuteDetailsJson.forEach(sd => {
    if (!statuteDetailsMap[sd.id_statute]) statuteDetailsMap[sd.id_statute] = [];
    statuteDetailsMap[sd.id_statute].push({
      sectionHeading: sd.section_heading || '',
      fromDate: sd.datefrom && sd.datefrom !== '0000-00-00' ? sd.datefrom : null,
      toDate: sd.dateto && sd.dateto !== '0000-00-00' ? sd.dateto : null,
      detail: sd.details || '',
      attachments: sd.attachment ? [sd.attachment] : []
    });
  });

  const existingStatutes = new Set(await mongoose.connection.db.collection('statutes').distinct('statuteId'));
  const statuteDocs = [];

  for (const s of statutesJson) {
    const statuteId = `STAT-${String(s.id).padStart(6, '0')}`;
    if (existingStatutes.has(statuteId)) continue;

    const blocks = statuteDetailsMap[s.id] || [];
    const deptName = deptMap[s.id_dept] || 'tax';
    const lawName = lawMap[s.id_law] || '';
    const sectionName = sectionMap[s.id_sections] || s.id_sections || '';

    statuteDocs.push({
      statuteId,
      statute_id: statuteId,
      srNumber: s.srno ? String(s.srno) : String(s.id),
      department: deptName,
      chapter: s.chapter || '',
      law: lawName,
      section: sectionName,
      heading: s.heading || '',
      blocks,
      isDeleted: Boolean(s.is_deleted),
      deletedAt: s.is_deleted ? new Date() : null,
      createdAt: s.date_added && s.date_added !== '0000-00-00 00:00:00' ? new Date(s.date_added) : new Date(),
      updatedAt: s.date_modify && s.date_modify !== '0000-00-00 00:00:00' ? new Date(s.date_modify) : new Date()
      // NOTE: status and display intentionally omitted per instructions
    });
    existingStatutes.add(statuteId);
  }
  if (statuteDocs.length > 0) {
    for (let i = 0; i < statuteDocs.length; i += BATCH_SIZE) {
      await Statute.insertMany(statuteDocs.slice(i, i + BATCH_SIZE), { ordered: false });
      process.stdout.write(`  -> Inserted ${Math.min(i + BATCH_SIZE, statuteDocs.length)}/${statuteDocs.length} statutes\r`);
    }
    console.log(`\n  -> Inserted ${statuteDocs.length} new statutes.`);
  } else {
    console.log('  -> All statutes already exist.');
  }

  // -------------------------------------------------------------
  // 9. TAX CARDS
  // -------------------------------------------------------------
  console.log('\n[9/17] Shifting Tax Cards...');
  const taxcardsJson = readJson('cms_taxcards.json');
  const existingTaxCards = new Set(await mongoose.connection.db.collection('taxcards').distinct('taxCardId'));
  const taxCardDocs = [];
  let maxTaxCardSr = 0;

  for (const tc of taxcardsJson) {
    const cardId = `TC-${String(tc.id).padStart(6, '0')}`;
    if (existingTaxCards.has(cardId)) continue;

    const srNum = Number(tc.id) || 1;
    if (srNum > maxTaxCardSr) maxTaxCardSr = srNum;

    taxCardDocs.push({
      taxCardId: cardId,
      tax_card_id: cardId,
      srNumber: srNum,
      heading: tc.heading || '',
      date: tc.dated || '',
      year: Number(tc.taxyear) || new Date().getFullYear(),
      detail: tc.details || '',
      attachment: tc.attchment || '',
      attachmentName: tc.attchment ? path.basename(tc.attchment) : '',
      isDeleted: Boolean(tc.is_deleted),
      deletedAt: tc.is_deleted ? new Date() : null,
      createdAt: tc.date_added && tc.date_added !== '0000-00-00 00:00:00' ? new Date(tc.date_added) : new Date(),
      updatedAt: tc.date_modify && tc.date_modify !== '0000-00-00 00:00:00' ? new Date(tc.date_modify) : new Date()
    });
    existingTaxCards.add(cardId);
  }
  if (taxCardDocs.length > 0) {
    await TaxCard.insertMany(taxCardDocs, { ordered: false });
    await Counter.findByIdAndUpdate('tax_card_sr_seq', { $max: { seq: maxTaxCardSr } }, { upsert: true });
    console.log(`  -> Inserted ${taxCardDocs.length} new tax cards.`);
  } else {
    console.log('  -> All tax cards already exist.');
  }

  // -------------------------------------------------------------
  // 10. NEWS
  // -------------------------------------------------------------
  console.log('\n[10/17] Shifting News...');
  const newsJson = readJson('cms_news.json');
  const existingNews = new Set(await mongoose.connection.db.collection('news').distinct('newsId'));
  const newsDocs = [];
  let maxNewsSr = 0;

  for (const n of newsJson) {
    const newsId = `NEWS-${String(n.id).padStart(6, '0')}`;
    if (existingNews.has(newsId)) continue;

    const srNum = Number(n.id) || 1;
    if (srNum > maxNewsSr) maxNewsSr = srNum;

    let yr = Number(n.newsyear);
    if (!yr && n.dated && n.dated.length >= 4) {
      yr = parseInt(n.dated.slice(0, 4), 10);
    }
    if (!yr) yr = new Date().getFullYear();

    newsDocs.push({
      newsId,
      news_id: newsId,
      srNumber: srNum,
      heading: n.heading || 'News Update',
      date: n.dated || '',
      year: yr,
      detail: n.details || '',
      isDeleted: Boolean(n.is_deleted),
      deletedAt: n.is_deleted ? new Date() : null,
      createdAt: n.date_added && n.date_added !== '0000-00-00 00:00:00' ? new Date(n.date_added) : new Date(),
      updatedAt: n.date_modify && n.date_modify !== '0000-00-00 00:00:00' ? new Date(n.date_modify) : new Date()
      // NOTE: status intentionally omitted per instructions
    });
    existingNews.add(newsId);
  }
  if (newsDocs.length > 0) {
    for (let i = 0; i < newsDocs.length; i += BATCH_SIZE) {
      await News.insertMany(newsDocs.slice(i, i + BATCH_SIZE), { ordered: false });
      process.stdout.write(`  -> Inserted ${Math.min(i + BATCH_SIZE, newsDocs.length)}/${newsDocs.length} news\r`);
    }
    await Counter.findByIdAndUpdate('news_sr_seq', { $max: { seq: maxNewsSr } }, { upsert: true });
    console.log(`\n  -> Inserted ${newsDocs.length} new news items.`);
  } else {
    console.log('  -> All news already exist.');
  }

  // -------------------------------------------------------------
  // 11. NEWSLETTERS
  // -------------------------------------------------------------
  console.log('\n[11/17] Shifting Newsletters...');
  const nlJson = readJson('cms_newsletters.json');
  const existingNl = new Set(await mongoose.connection.db.collection('newsletters').distinct('newsletterId'));
  const nlDocs = [];
  let maxNlSr = 0;

  for (const item of nlJson) {
    const nlId = `NL-${String(item.id).padStart(6, '0')}`;
    if (existingNl.has(nlId)) continue;

    const srNum = Number(item.id) || 1;
    if (srNum > maxNlSr) maxNlSr = srNum;

    let cat = 'Updates';
    if (item.id_cat === 1) cat = 'General Announcement';
    else if (item.id_cat === 2) cat = 'Case Laws & News';
    else if (item.id_cat === 3) cat = 'Tax Notifications';
    else if (item.id_cat === 4) cat = 'Circulars & Orders';

    let att = '';
    if (Array.isArray(item.attachments) && item.attachments.length > 0) att = item.attachments[0];
    else if (typeof item.attachments === 'string' && item.attachments !== '[]') att = item.attachments;

    nlDocs.push({
      newsletterId: nlId,
      newsletter_id: nlId,
      srNumber: srNum,
      subject: item.subject || 'Newsletter',
      date: item.dated || '',
      category: cat,
      message: item.message || '',
      attachment: att,
      attachmentName: att ? path.basename(att) : '',
      isDeleted: Boolean(item.is_deleted),
      deletedAt: item.is_deleted ? new Date() : null,
      createdAt: item.date_added && item.date_added !== '0000-00-00 00:00:00' ? new Date(item.date_added) : new Date(),
      updatedAt: item.date_modify && item.date_modify !== '0000-00-00 00:00:00' ? new Date(item.date_modify) : new Date()
      // NOTE: status intentionally omitted per instructions
    });
    existingNl.add(nlId);
  }
  if (nlDocs.length > 0) {
    await Newsletter.insertMany(nlDocs, { ordered: false });
    await Counter.findByIdAndUpdate('newsletter_sr_seq', { $max: { seq: maxNlSr } }, { upsert: true });
    console.log(`  -> Inserted ${nlDocs.length} new newsletters.`);
  } else {
    console.log('  -> All newsletters already exist.');
  }

  // -------------------------------------------------------------
  // 12. WEBSITE UPDATES
  // -------------------------------------------------------------
  console.log('\n[12/17] Shifting Website Updates...');
  const updatesJson = readJson('cms_updates.json');
  const existingUpdates = new Set(await mongoose.connection.db.collection('websiteupdates').distinct('updateId'));
  const updateDocs = [];
  let maxUpdSr = 0;

  for (const u of updatesJson) {
    const updId = `UPD-${String(u.id).padStart(6, '0')}`;
    if (existingUpdates.has(updId)) continue;

    const srNum = Number(u.id) || 1;
    if (srNum > maxUpdSr) maxUpdSr = srNum;

    updateDocs.push({
      updateId: updId,
      update_id: updId,
      srNumber: srNum,
      heading: u.heading || '',
      dated: u.dated || '',
      url: u.heading_url || '#',
      isDeleted: Boolean(u.is_deleted),
      deletedAt: u.is_deleted ? new Date() : null,
      createdAt: u.date_added && u.date_added !== '0000-00-00 00:00:00' ? new Date(u.date_added) : new Date(),
      updatedAt: u.date_modify && u.date_modify !== '0000-00-00 00:00:00' ? new Date(u.date_modify) : new Date()
    });
    existingUpdates.add(updId);
  }
  if (updateDocs.length > 0) {
    await WebsiteUpdate.insertMany(updateDocs, { ordered: false });
    await Counter.findByIdAndUpdate('update_sr_seq', { $max: { seq: maxUpdSr } }, { upsert: true });
    console.log(`  -> Inserted ${updateDocs.length} new website updates.`);
  } else {
    console.log('  -> All website updates already exist.');
  }

  // -------------------------------------------------------------
  // 13. WHATSAPP UPDATES
  // -------------------------------------------------------------
  console.log('\n[13/17] Shifting WhatsApp Updates...');
  const waJson = readJson('cms_whatsappupdates.json');
  const existingWa = new Set(await mongoose.connection.db.collection('whatsappupdates').distinct('whatsappId'));
  const waDocs = [];
  let maxWaSre = 0;

  for (const w of waJson) {
    const waId = `WA-${String(w.id).padStart(6, '0')}`;
    if (existingWa.has(waId)) continue;

    const srNum = Number(w.id) || 1;
    if (srNum > maxWaSre) maxWaSre = srNum;

    waDocs.push({
      whatsappId: waId,
      whatsapp_id: waId,
      srNumber: srNum,
      heading: w.heading || 'WhatsApp Update',
      dated: w.dated || '',
      attachment: w.attachment || '',
      attachmentName: w.attachment ? path.basename(w.attachment) : '',
      isDeleted: Boolean(w.is_deleted),
      deletedAt: w.is_deleted ? new Date() : null,
      createdAt: w.date_added && w.date_added !== '0000-00-00 00:00:00' ? new Date(w.date_added) : new Date(),
      updatedAt: w.date_modify && w.date_modify !== '0000-00-00 00:00:00' ? new Date(w.date_modify) : new Date()
    });
    existingWa.add(waId);
  }
  if (waDocs.length > 0) {
    for (let i = 0; i < waDocs.length; i += BATCH_SIZE) {
      await WhatsappUpdate.insertMany(waDocs.slice(i, i + BATCH_SIZE), { ordered: false });
      process.stdout.write(`  -> Inserted ${Math.min(i + BATCH_SIZE, waDocs.length)}/${waDocs.length} whatsapp updates\r`);
    }
    await Counter.findByIdAndUpdate('whatsapp_sr_seq', { $max: { seq: maxWaSre } }, { upsert: true });
    console.log(`\n  -> Inserted ${waDocs.length} new WhatsApp updates.`);
  } else {
    console.log('  -> All WhatsApp updates already exist.');
  }

  // -------------------------------------------------------------
  // 14. YOUTUBE UPDATES
  // -------------------------------------------------------------
  console.log('\n[14/17] Shifting YouTube Updates...');
  const ytJson = readJson('cms_youtube.json');
  const existingYt = new Set(await mongoose.connection.db.collection('youtubeupdates').distinct('youtubeId'));
  const ytDocs = [];
  let maxYtSr = 0;

  for (const y of ytJson) {
    const ytId = `YT-${String(y.id).padStart(6, '0')}`;
    if (existingYt.has(ytId)) continue;

    const srNum = Number(y.id) || 1;
    if (srNum > maxYtSr) maxYtSr = srNum;

    ytDocs.push({
      youtubeId: ytId,
      youtube_id: ytId,
      srNumber: srNum,
      caption: y.caption || 'YouTube Video',
      dated: y.dated || '',
      url: y.url || '',
      photo: y.photo || '',
      photoName: y.photo ? path.basename(y.photo) : '',
      isDeleted: Boolean(y.is_deleted),
      deletedAt: y.is_deleted ? new Date() : null,
      createdAt: y.date_added && y.date_added !== '0000-00-00 00:00:00' ? new Date(y.date_added) : new Date(),
      updatedAt: y.date_modify && y.date_modify !== '0000-00-00 00:00:00' ? new Date(y.date_modify) : new Date()
    });
    existingYt.add(ytId);
  }
  if (ytDocs.length > 0) {
    await YoutubeUpdate.insertMany(ytDocs, { ordered: false });
    await Counter.findByIdAndUpdate('youtube_sr_seq', { $max: { seq: maxYtSr } }, { upsert: true });
    console.log(`  -> Inserted ${ytDocs.length} new YouTube updates.`);
  } else {
    console.log('  -> All YouTube updates already exist.');
  }

  // -------------------------------------------------------------
  // 15. IP BLOCKS
  // -------------------------------------------------------------
  console.log('\n[15/17] Shifting IP Blocks...');
  const ipJson = readJson('cms_ipblocklist.json');
  const existingIps = new Set(await mongoose.connection.db.collection('ipblocks').distinct('ipAddress'));
  const ipDocs = [];

  for (const item of ipJson) {
    const ip = (item.ip_address || '').trim();
    if (!ip || existingIps.has(ip)) continue;

    ipDocs.push({
      ipAddress: ip,
      userName: `User #${item.id_user}`,
      cityName: cityMap[item.id_city] || '',
      reason: 'Restricted by Admin',
      status: item.is_deleted === 1 ? 'unblocked' : 'blocked',
      dated: item.date_added && item.date_added !== '0000-00-00 00:00:00' ? new Date(item.date_added) : new Date(),
      createdAt: item.date_added && item.date_added !== '0000-00-00 00:00:00' ? new Date(item.date_added) : new Date(),
      updatedAt: item.date_modify && item.date_modify !== '0000-00-00 00:00:00' ? new Date(item.date_modify) : new Date()
    });
    existingIps.add(ip);
  }
  if (ipDocs.length > 0) {
    await IpBlock.insertMany(ipDocs, { ordered: false });
    console.log(`  -> Inserted ${ipDocs.length} new IP block entries.`);
  } else {
    console.log('  -> All IP blocks already exist.');
  }

  // -------------------------------------------------------------
  // 16. INVOICES
  // -------------------------------------------------------------
  console.log('\n[16/17] Shifting Invoices...');
  const invoicesJson = readJson('cms_invoices.json');
  const invoiceDetailsJson = readJson('cms_invoicesdetail.json');
  const invoiceDetailsMap = {};
  invoiceDetailsJson.forEach(idtl => {
    if (!invoiceDetailsMap[idtl.id_invoice]) invoiceDetailsMap[idtl.id_invoice] = [];
    invoiceDetailsMap[idtl.id_invoice].push({
      details: idtl.detail || '',
      qty: Number(idtl.qty) || 1,
      rate: Number(idtl.rate) || 0,
      total: Number(idtl.total) || 0
    });
  });

  const existingInvoices = new Set(await mongoose.connection.db.collection('invoices').distinct('invoiceId'));
  const invoiceDocs = [];
  let maxInvSr = 0;

  for (const inv of invoicesJson) {
    const invId = `INV-${String(inv.id).padStart(6, '0')}`;
    if (existingInvoices.has(invId)) continue;

    const items = invoiceDetailsMap[inv.id] || [];
    const srNum = Number(inv.invoiceno || inv.id) || 1;
    if (srNum > maxInvSr) maxInvSr = srNum;

    invoiceDocs.push({
      invoiceId: invId,
      invoice_id: invId,
      srNumber: srNum,
      date: inv.dated || '',
      name: inv.named || '',
      address: inv.address || '',
      items,
      totalBillAmount: Number(inv.total) || 0,
      deductionPercent: Number(inv.deducation_per) || 0,
      deductionAmount: Number(inv.discount) || 0,
      totalReceivable: Number(inv.grandtotal) || 0,
      isDeleted: Boolean(inv.is_deleted),
      deletedAt: inv.is_deleted ? new Date() : null,
      createdAt: inv.date_added && inv.date_added !== '0000-00-00 00:00:00' ? new Date(inv.date_added) : new Date(),
      updatedAt: inv.date_modify && inv.date_modify !== '0000-00-00 00:00:00' ? new Date(inv.date_modify) : new Date()
      // NOTE: status intentionally omitted per instructions
    });
    existingInvoices.add(invId);
  }
  if (invoiceDocs.length > 0) {
    await Invoice.insertMany(invoiceDocs, { ordered: false });
    await Counter.findByIdAndUpdate('invoice_sr_seq', { $max: { seq: maxInvSr } }, { upsert: true });
    console.log(`  -> Inserted ${invoiceDocs.length} new invoices.`);
  } else {
    console.log('  -> All invoices already exist.');
  }

  // -------------------------------------------------------------
  // 17. USERS & ADMINS
  // -------------------------------------------------------------
  console.log('\n[17/17] Shifting Users and Admins...');
  const usersJson = readJson('cms_users.json');
  const adminsJson = readJson('cms_admins.json');

  const existingDbUsers = await mongoose.connection.db.collection('users').find({}, { projection: { username: 1, email: 1, userId: 1 } }).toArray();
  const existingUsernameSet = new Set(existingDbUsers.map(u => (u.username || '').toLowerCase().trim()));
  const existingEmailSet = new Set(existingDbUsers.map(u => (u.email || '').toLowerCase().trim()));
  const existingUserIdSet = new Set(existingDbUsers.map(u => u.userId).filter(Boolean));

  const userDocs = [];

  // First process admins
  for (const a of adminsJson) {
    const username = (a.adm_username || '').trim();
    const email = (a.adm_email || '').trim().toLowerCase();
    if (!username || !email) continue;
    if (existingUsernameSet.has(username.toLowerCase()) || existingEmailSet.has(email)) continue;

    let admId = `USER-ADM-${String(a.adm_id).padStart(6, '0')}`;
    if (existingUserIdSet.has(admId)) {
      admId = `USER-ADM-LEGACY-${String(a.adm_id).padStart(6, '0')}`;
    }

    userDocs.push({
      userId: admId,
      user_id: admId,
      fullName: a.adm_fullname || username,
      username,
      email,
      password: a.adm_userpass || 'admin123',
      role: 'Administrator',
      contactNumber: a.adm_phone || '',
      agencyName: a.adm_agency || 'General',
      userType: 'Corporate',
      aiAssistant: true,
      alreadyLogin: false,
      isSpammer: false,
      ipRestriction: false,
      displayStatute: true,
      displayNotification: true,
      displayCase: true,
      isVerified: true,
      status: a.adm_status === 1 ? 'ACTIVE' : 'inactive',
      isDeleted: false,
      deletedAt: null
    });
    existingUsernameSet.add(username.toLowerCase());
    existingEmailSet.add(email);
    existingUserIdSet.add(admId);
  }

  // Sort legacy users: active (is_deleted === 0) first, then newer id descending
  const sortedUsers = [...usersJson].sort((x, y) => {
    if ((x.is_deleted || 0) !== (y.is_deleted || 0)) {
      return (x.is_deleted || 0) - (y.is_deleted || 0); // 0 first
    }
    return (y.id || 0) - (x.id || 0); // newer first
  });

  for (const u of sortedUsers) {
    let username = (u.username || '').trim();
    let email = (u.email || '').trim().toLowerCase();

    if (!username) {
      username = `user_${u.id}`;
    }
    if (!email) {
      email = `user_${u.id}@sldsystem.com`;
    }

    if (existingUsernameSet.has(username.toLowerCase()) || existingEmailSet.has(email)) {
      continue; // Skip double entry per instructions
    }

    let uId = `USER-${String(u.id).padStart(6, '0')}`;
    if (existingUserIdSet.has(uId)) {
      uId = `USER-LEGACY-${String(u.id).padStart(6, '0')}`;
    }

    const fullName = `${(u.firstname || '').trim()} ${(u.lastname || '').trim()}`.trim() || username;
    const uType = u.id_type === 1 ? 'Regular' : u.id_type === 2 ? 'Special' : 'Corporate';
    const cityName = cityMap[u.city] || '';

    userDocs.push({
      userId: uId,
      user_id: uId,
      fullName,
      username,
      email,
      password: u.userpass || '123456',
      role: 'User',
      contactNumber: u.contactno || u.whatsapp || '',
      city: cityName,
      address: u.address || '',
      agencyName: u.agency || 'General',
      companyName: u.company || '',
      userType: uType,
      aiAssistant: u.ai_assistant === 1,
      alreadyLogin: u.already_login === 'Yes',
      isSpammer: u.is_spamer === 1,
      ipRestriction: u.ip_restriction === 2,
      displayStatute: u.display_statutes === 1,
      displayNotification: u.display_notification === 1,
      displayCase: true,
      activeDate: u.active_date && u.active_date !== '0000-00-00' ? new Date(u.active_date) : new Date(),
      inactiveDate: u.inactive_date && u.inactive_date !== '0000-00-00' ? new Date(u.inactive_date) : null,
      isVerified: true,
      status: u.status === 1 ? 'ACTIVE' : 'inactive',
      isDeleted: Boolean(u.is_deleted),
      deletedAt: u.is_deleted ? new Date() : null,
      createdAt: u.regdate && u.regdate !== '0000-00-00' ? new Date(u.regdate) : new Date(),
      updatedAt: new Date()
    });

    existingUsernameSet.add(username.toLowerCase());
    existingEmailSet.add(email);
    existingUserIdSet.add(uId);
  }

  if (userDocs.length > 0) {
    for (let i = 0; i < userDocs.length; i += BATCH_SIZE) {
      await User.insertMany(userDocs.slice(i, i + BATCH_SIZE), { ordered: false });
      process.stdout.write(`  -> Inserted ${Math.min(i + BATCH_SIZE, userDocs.length)}/${userDocs.length} users\r`);
    }
    console.log(`\n  -> Inserted ${userDocs.length} new users/admins.`);
  } else {
    console.log('  -> All users/admins already exist.');
  }

  // -------------------------------------------------------------
  // FINAL SYSTEM-WIDE RECONCILIATION & COUNTS
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(70));
  console.log('FINAL DATABASE VERIFICATION REPORT');
  console.log('='.repeat(70));

  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const c of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`Collection: ${c.name.padEnd(25)} Count: ${count.toLocaleString()}`);
  }

  console.log('='.repeat(70));
  console.log('DATA SHIFTING COMPLETED SUCCESSFULLY WITH ZERO ERRORS');
  console.log('='.repeat(70));

  process.exit(0);
}

runMigration().catch(err => {
  console.error('\n[FATAL ERROR IN MIGRATION]:', err);
  process.exit(1);
});
