import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import OtherCaseLaw from '../models/OtherCaseLaw.js';
import { buildSupremeCourtCandidateUrls } from '../utils/supremeCourtUrlResolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
const CONCURRENCY = 20;

const verifyCandidatePdf = async (url) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Range': 'bytes=0-64',
        'Referer': 'https://www.supremecourt.gov.pk/'
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return false;
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    const sig = buf.subarray(0, 5).toString('utf8');
    return sig === '%PDF-' || (ct.includes('pdf') && !ct.includes('html'));
  } catch {
    return false;
  }
};

const run = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('[SCP Link Backfill] Connected to MongoDB.');

  const missingDocs = await OtherCaseLaw.find({
    isDeleted: { $ne: true },
    caseNo: { $exists: true, $nin: ['', null] },
    $and: [
      { $or: [{ caseNoLink: '' }, { caseNoLink: null }, { caseNoLink: 'Nil' }] },
      { $or: [{ downloadLink: '' }, { downloadLink: null }, { downloadLink: 'Nil' }] },
      { $or: [{ attachment: '' }, { attachment: null }, { attachment: 'Nil' }] }
    ]
  }).select('_id caseNo citation scCitation').lean();

  const resolvable = [];
  for (const d of missingDocs) {
    const candidates = buildSupremeCourtCandidateUrls(d);
    if (candidates.length > 0) resolvable.push({ doc: d, candidates });
  }

  console.log(`[SCP Link Backfill] Found ${missingDocs.length} missing-link rows, ${resolvable.length} resolvable Supreme Court candidates.`);

  let updated = 0;
  let unresolved = 0;

  for (let i = 0; i < resolvable.length; i += CONCURRENCY) {
    const slice = resolvable.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async ({ doc, candidates }) => {
        for (const url of candidates) {
          if (await verifyCandidatePdf(url)) {
            return { _id: doc._id, url };
          }
        }
        return null;
      })
    );

    const ops = results.filter(Boolean).map((hit) => ({
      updateOne: {
        filter: { _id: hit._id },
        update: { $set: { caseNoLink: hit.url, downloadLink: hit.url, attachment: hit.url } }
      }
    }));

    if (ops.length > 0) {
      await OtherCaseLaw.bulkWrite(ops, { ordered: false });
      updated += ops.length;
    }
    unresolved += slice.length - ops.length;
    console.log(`[SCP Link Backfill] Progress ${Math.min(i + CONCURRENCY, resolvable.length)}/${resolvable.length} | Verified & Updated: ${updated} | Not on SCP server: ${unresolved}`);
  }

  console.log(`[SCP Link Backfill] Finished! Updated ${updated} records cleanly.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('[SCP Link Backfill] Fatal error:', err);
  process.exit(1);
});

