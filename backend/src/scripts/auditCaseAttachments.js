import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Case from '../models/Case.js';
import OtherCaseLaw from '../models/OtherCaseLaw.js';
import { getCandidateUploadRoots, resolveUploadFilePath } from '../utils/attachmentStorage.js';

async function auditCaseAttachments() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sld_system';
  console.log('Connecting to MongoDB:', mongoUri);
  await mongoose.connect(mongoUri);

  console.log('\n======================================================');
  console.log('       SLD CASE LAW ATTACHMENT AUDIT & SYNC');
  console.log('======================================================\n');

  // 1. Scan and normalize reference_views files on disk
  const roots = getCandidateUploadRoots();
  console.log(`Candidate upload directories searched (${roots.length}):`);
  roots.forEach(r => {
    if (fs.existsSync(r)) console.log(`  [OK] ${r}`);
  });

  const refDirs = [
    '/var/www/sld_system/backend/uploads/reference_views',
    '/var/www/sld_system/uploads/reference_views',
    path.resolve(process.cwd(), 'uploads/reference_views'),
    path.resolve(process.cwd(), 'backend/uploads/reference_views')
  ].filter(d => fs.existsSync(d));

  let normalizedCount = 0;
  for (const refDir of refDirs) {
    try {
      const files = fs.readdirSync(refDir);
      for (const file of files) {
        const fullPath = path.join(refDir, file);
        if (!fs.statSync(fullPath).isFile()) continue;

        // Create complementary aliases: hyphens <-> spaces
        if (file.includes('-')) {
          const spaceVariant = file.replace(/-/g, ' ');
          const target = path.join(refDir, spaceVariant);
          if (!fs.existsSync(target)) {
            try {
              fs.copyFileSync(fullPath, target);
              normalizedCount++;
            } catch (_) {}
          }
        }
        if (file.includes(' ')) {
          const dashVariant = file.replace(/\s+/g, '-');
          const target = path.join(refDir, dashVariant);
          if (!fs.existsSync(target)) {
            try {
              fs.copyFileSync(fullPath, target);
              normalizedCount++;
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }
  console.log(`\nNormalized filename aliases on disk: ${normalizedCount} variants created.\n`);

  // 2. Query all Case documents with attachments
  const casesWithAtts = await Case.find({
    isDeleted: false,
    $or: [
      { 'attachments.0': { $exists: true } },
      { attachments: { $exists: true, $ne: [] } }
    ]
  }).select('sldNumber court caseNumber publications attachments').sort({ sldNumberInt: -1 }).lean();

  console.log(`\n--- Cases with Attachments in Database: ${casesWithAtts.length} ---`);
  const verifiedCases = [];
  const missingCases = [];

  for (const c of casesWithAtts) {
    const atts = Array.isArray(c.attachments) ? c.attachments : [c.attachments];
    for (const a of atts) {
      if (!a) continue;
      const url = typeof a === 'string' ? a : (a.url || a.path || a.name || '');
      const name = typeof a === 'object' ? (a.name || a.originalName || '') : '';
      const resolvedPath = resolveUploadFilePath(url) || resolveUploadFilePath(name);

      const pub0 = c.publications?.[0] || {};
      const cit = pub0.year && pub0.mag && pub0.page ? `${pub0.year} ${pub0.mag} ${pub0.page}` : (c.caseNumber?.[0] || 'Case Record');

      if (resolvedPath && fs.existsSync(resolvedPath)) {
        const stats = fs.statSync(resolvedPath);
        verifiedCases.push({
          sldNumber: c.sldNumber,
          citation: cit,
          court: c.court,
          attachmentName: name || path.basename(url),
          fileSize: `${(stats.size / 1024).toFixed(1)} KB`,
          diskPath: resolvedPath
        });
      } else {
        missingCases.push({
          sldNumber: c.sldNumber,
          citation: cit,
          court: c.court,
          requestedUrl: url,
          attachmentName: name
        });
      }
    }
  }

  // 3. Query OtherCaseLaw attachments
  const otherCases = await OtherCaseLaw.find({
    isDeleted: false,
    $or: [
      { fileUrl: { $exists: true, $ne: '' } },
      { 'attachments.0': { $exists: true } }
    ]
  }).select('srNumber otherCaseId title court citation fileUrl attachments').lean();

  for (const ocl of otherCases) {
    const url = ocl.fileUrl || ocl.attachments?.[0]?.url || '';
    if (!url) continue;
    const resolvedPath = resolveUploadFilePath(url);
    if (resolvedPath && fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      verifiedCases.push({
        sldNumber: `OCL #${ocl.srNumber || ocl.otherCaseId}`,
        citation: ocl.citation || ocl.title || 'Other Case Law',
        court: ocl.court,
        attachmentName: ocl.attachmentName || path.basename(url),
        fileSize: `${(stats.size / 1024).toFixed(1)} KB`,
        diskPath: resolvedPath
      });
    } else {
      missingCases.push({
        sldNumber: `OCL #${ocl.srNumber || ocl.otherCaseId}`,
        citation: ocl.citation || ocl.title || 'Other Case Law',
        court: ocl.court,
        requestedUrl: url,
        attachmentName: ocl.attachmentName || ''
      });
    }
  }

  console.log(`\n======================================================`);
  console.log(`VERIFIED ATTACHMENTS (PROPERLY OPENING): ${verifiedCases.length}`);
  console.log(`======================================================`);
  if (verifiedCases.length > 0) {
    verifiedCases.forEach((vc, idx) => {
      console.log(`[${idx + 1}] SLD #${vc.sldNumber} | ${vc.citation} | ${vc.court}`);
      console.log(`     File: ${vc.attachmentName} (${vc.fileSize})`);
      console.log(`     Path: ${vc.diskPath}`);
    });
  } else {
    console.log('No attachments currently resolved on disk.');
  }

  console.log(`\n======================================================`);
  console.log(`MISSING ATTACHMENTS (NEED RE-UPLOAD / PATH FIX): ${missingCases.length}`);
  console.log(`======================================================`);
  if (missingCases.length > 0) {
    missingCases.forEach((mc, idx) => {
      console.log(`[${idx + 1}] SLD #${mc.sldNumber} | ${mc.citation}`);
      console.log(`     Requested: ${mc.requestedUrl || mc.attachmentName}`);
    });
  } else {
    console.log('All attachment records in the database exist on disk.');
  }

  console.log('\nAudit complete.');
  await mongoose.disconnect();
}

auditCaseAttachments().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

