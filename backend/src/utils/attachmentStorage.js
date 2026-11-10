import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Backend root directory (<repo>/backend)
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

/**
 * Returns all possible root `uploads` directories in priority order,
 * ensuring files stored via __dirname OR process.cwd() always resolve cleanly.
 */
export const getCandidateUploadRoots = () => {
  const dirs = [
    path.resolve(BACKEND_ROOT, 'uploads'),
    path.resolve(REPO_ROOT, 'uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'backend', 'uploads'),
    path.resolve(process.cwd(), '../uploads')
  ];
  return [...new Set(dirs)];
};

/**
 * Resolves a stored attachment path (e.g. '/uploads/reference_views/abc.pdf')
 * to an actual existing file path on disk, checking all upload roots & subdirs.
 */
export const resolveUploadFilePath = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const cleanRel = urlOrPath
    .trim()
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+/, '')
    .replace(/^uploads\/+/i, '');

  if (!cleanRel || cleanRel.includes('..')) return null;

  for (const root of getCandidateUploadRoots()) {
    const safePrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    const direct = path.resolve(root, cleanRel);
    if (direct.startsWith(safePrefix) && fs.existsSync(direct) && fs.statSync(direct).isFile()) {
      return direct;
    }
    const baseName = path.basename(cleanRel);
    for (const sub of ['reference_views', 'newsletters', 'payment_proofs', 'court_cache']) {
      const nested = path.resolve(root, sub, baseName);
      if (nested.startsWith(safePrefix) && fs.existsSync(nested) && fs.statSync(nested).isFile()) {
        return nested;
      }
    }
  }
  return null;
};

// Candidate upload directories for reference views (always prefers backend/uploads/reference_views)
const candidateDirs = [
  path.resolve(BACKEND_ROOT, 'uploads/reference_views'),
  path.resolve(process.cwd(), 'uploads/reference_views'),
  path.resolve(REPO_ROOT, 'uploads/reference_views')
];

let targetDir = candidateDirs[0];
for (const d of candidateDirs) {
  if (fs.existsSync(d)) {
    targetDir = d;
    break;
  }
}

if (!fs.existsSync(targetDir)) {
  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create reference_views directory:', err);
  }
}

/**
 * Automatically offloads base64 Data URLs to disk and returns a lightweight static URL.
 * Prevents multi-megabyte payloads from bloating MongoDB and degrading save performance.
 */
export const saveBase64ToFile = (dataUrlOrPath, fallbackName = '') => {
  if (!dataUrlOrPath || typeof dataUrlOrPath !== 'string') {
    return dataUrlOrPath;
  }
  const trimmed = dataUrlOrPath.trim();
  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }

  try {
    const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return trimmed;
    }

    const mime = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = '.pdf';
    if (fallbackName) {
      const pExt = path.extname(fallbackName).toLowerCase();
      if (['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.txt'].includes(pExt)) {
        ext = pExt;
      }
    }
    if (ext === '.pdf') {
      if (mime.includes('image/png')) ext = '.png';
      else if (mime.includes('image/jpeg')) ext = '.jpg';
      else if (mime.includes('image/webp')) ext = '.webp';
      else if (mime.includes('word') || mime.includes('officedocument')) ext = '.docx';
      else if (mime.includes('text/plain')) ext = '.txt';
    }

    const filename = `${crypto.randomUUID()}${ext}`;
    const targetPath = path.join(targetDir, filename);
    fs.writeFileSync(targetPath, buffer);
    return `/uploads/reference_views/${filename}`;
  } catch (err) {
    console.error('saveBase64ToFile offload error:', err);
    return dataUrlOrPath;
  }
};

/**
 * Normalizes attachment inputs to ensure every attachment object adheres to schema
 * and offloads any embedded base64 data to static storage.
 */
export const sanitizeAttachments = (attachments) => {
  if (!attachments) return [];
  const list = Array.isArray(attachments) ? attachments : [attachments];
  return list
    .filter(Boolean)
    .map((att, idx) => {
      if (typeof att === 'string') {
        const rawUrl = att.trim();
        const cleanUrl = saveBase64ToFile(rawUrl);
        let filename = cleanUrl.split(/[\/\\]/).pop() || `Attachment_${idx + 1}.pdf`;
        filename = filename.replace(/[\r\n\0]/g, '').trim();
        return {
          name: filename,
          url: cleanUrl,
          size: '',
          type: cleanUrl.endsWith('.docx') || cleanUrl.endsWith('.doc') ? 'word' : (cleanUrl.match(/\.(png|jpg|jpeg|webp)$/i) ? 'image' : 'pdf')
        };
      }
      const rawName = (att.name && String(att.name).trim()) || (att.originalName && String(att.originalName).trim()) || (att.filename && String(att.filename).trim());
      const rawUrl = att.url || att.path || '';
      const cleanUrl = saveBase64ToFile(rawUrl, rawName);
      let name = rawName || (cleanUrl ? cleanUrl.split(/[\/\\]/).pop() : `Attachment_${idx + 1}.pdf`);
      name = String(name).replace(/[\r\n\0]/g, '').trim();
      let size = att.size || '';
      if (typeof size === 'number') {
        size = `${(size / (1024 * 1024)).toFixed(2)} MB`;
      }
      const ext = String(name).split('.').pop()?.toLowerCase();
      const type = att.type || (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'image' : (['doc', 'docx'].includes(ext) ? 'word' : 'pdf'));
      return {
        name: name || `Attachment_${idx + 1}.pdf`,
        url: String(cleanUrl).trim(),
        size: String(size).trim(),
        type: String(type).trim()
      };
    })
    .filter(a => a.url || a.name);
};

/**
 * Recursively sanitizes attachments within multi-block structures (e.g., Statutes, Notifications)
 */
export const sanitizeBlocksAttachments = (blocks) => {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') return b;
    const blockCopy = { ...b };
    if (Array.isArray(blockCopy.attachments)) {
      blockCopy.attachments = sanitizeAttachments(blockCopy.attachments);
    }
    if (blockCopy.attachment) {
      const sanitized = sanitizeAttachments([blockCopy.attachment]);
      blockCopy.attachment = sanitized.length > 0 ? sanitized[0] : null;
    }
    return blockCopy;
  });
};

