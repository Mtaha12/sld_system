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
    process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null,
    path.resolve(BACKEND_ROOT, 'uploads'),
    path.resolve(REPO_ROOT, 'uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'backend', 'uploads'),
    path.resolve(process.cwd(), '../uploads'),
    ...(path.sep === '/'
      ? [
          '/var/www/sld_system/backend/uploads',
          '/var/www/sld_system/uploads',
          '/var/www/sld-system/backend/uploads',
          '/var/www/sld-system/uploads',
          '/var/www/sldsystem/sld_system/backend/uploads',
          '/var/www/sldsystem/uploads',
          '/var/www/sldsystem/backend/uploads',
          '/root/sld_system/backend/uploads',
          '/root/sld_system/uploads',
          '/root/sld-system/backend/uploads',
          '/root/sld-system/uploads',
          '/var/www/uploads',
          '/tmp/uploads'
        ]
      : [])
  ].filter(Boolean);
  return [...new Set(dirs)];
};

const isExistingRegularFile = (rootDir, candidatePath) => {
  try {
    const safePrefix = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
    if (!candidatePath.startsWith(safePrefix)) return false;
    return fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile();
  } catch {
    return false;
  }
};

/**
 * High-speed in-memory LRU cache for resolved upload file paths
 */
const resolvedPathCache = new Map();
const RESOLVE_CACHE_MAX = 2000;

const getCachedPath = (key) => {
  const cached = resolvedPathCache.get(key);
  if (cached && fs.existsSync(cached)) {
    return cached;
  }
  if (cached) {
    resolvedPathCache.delete(key);
  }
  return null;
};

const setCachedPath = (key, val) => {
  if (resolvedPathCache.size >= RESOLVE_CACHE_MAX) {
    const firstKey = resolvedPathCache.keys().next().value;
    resolvedPathCache.delete(firstKey);
  }
  resolvedPathCache.set(key, val);
};

/**
 * Recursively searches a directory up to maxDepth levels deep,
 * matching files case-insensitively and decoded.
 */
const findFileRecursively = (dir, targetBaseName, maxDepth = 4, currentDepth = 0) => {
  if (!dir || currentDepth > maxDepth || !fs.existsSync(dir)) return null;

  const direct = path.join(dir, targetBaseName);
  try {
    if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
      return direct;
    }
  } catch (_) {}

  const targetLower = targetBaseName.toLowerCase();
  const targetNormalized = targetLower.replace(/[%20+_\-\s]/g, '');

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const subdirs = [];

    // 1. Check immediate files first for fast hit
    for (const entry of entries) {
      if (entry.isFile()) {
        const entryLower = entry.name.toLowerCase();
        if (entryLower === targetLower) {
          return path.join(dir, entry.name);
        }
        if (entryLower.replace(/[%20+_\-\s]/g, '') === targetNormalized) {
          return path.join(dir, entry.name);
        }
      } else if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        subdirs.push(entry.name);
      }
    }

    // 2. Recursively inspect subdirectories (e.g. newsletters/2026/, reference_views/archive/)
    for (const subdir of subdirs) {
      const match = findFileRecursively(path.join(dir, subdir), targetBaseName, maxDepth, currentDepth + 1);
      if (match) return match;
    }
  } catch (_) {
    return null;
  }

  return null;
};

/**
 * Normalizes and validates an incoming /uploads relative path or URL,
 * decoding safe path segments while blocking traversal or null-byte injection.
 */
export const sanitizeUploadRelPath = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== 'string') return '';
  let raw = urlOrPath.trim();
  if (!raw) return '';

  if (/^https?:\/\//i.test(raw)) {
    try {
      raw = new URL(raw).pathname || '';
    } catch {
      return '';
    }
  }

  raw = raw
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^uploads\/+/i, '');

  if (!raw || raw.includes('\0')) return '';

  const decodedSegments = [];
  for (const seg of raw.split('/')) {
    if (!seg || seg === '.') continue;
    let decoded = seg;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      decoded = seg;
    }
    if (
      !decoded ||
      decoded === '.' ||
      decoded === '..' ||
      decoded.includes('\0') ||
      decoded.includes('/') ||
      decoded.includes('\\')
    ) {
      return '';
    }
    decodedSegments.push(decoded);
  }

  return decodedSegments.join('/');
};

/**
 * Resolves a stored attachment path (e.g. '/uploads/reference_views/abc.pdf'
 * or '/uploads/newsletters/2026/123.pdf') to an actual existing file on disk,
 * checking all candidate upload roots, category folders, and recursive subdirectories.
 */
export const resolveUploadFilePath = (urlOrPath) => {
  const cleanRel = sanitizeUploadRelPath(urlOrPath);
  if (!cleanRel) return null;

  const cached = getCachedPath(cleanRel);
  if (cached) return cached;

  const baseName = path.basename(cleanRel);
  const knownFolders = ['reference_views', 'newsletters', 'payment_proofs', 'court_cache'];

  for (const root of getCandidateUploadRoots()) {
    if (!fs.existsSync(root)) continue;

    // 1. Direct path check
    const direct = path.resolve(root, cleanRel);
    if (isExistingRegularFile(root, direct)) {
      setCachedPath(cleanRel, direct);
      return direct;
    }

    // 2. Known category folders with recursive traversal
    for (const sub of knownFolders) {
      const folderPath = path.resolve(root, sub);
      const match = findFileRecursively(folderPath, baseName, 4);
      if (match && isExistingRegularFile(root, match)) {
        setCachedPath(cleanRel, match);
        return match;
      }
    }

    // 3. Fallback: Search the entire root recursively for the target basename
    const rootMatch = findFileRecursively(root, baseName, 4);
    if (rootMatch && isExistingRegularFile(root, rootMatch)) {
      setCachedPath(cleanRel, rootMatch);
      return rootMatch;
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
 * Detects MIME type and extension from file extension and/or buffer magic bytes.
 * Used across upload storage, static serving, and attachment preview/viewers.
 */
export const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword'
};

export const detectContentTypeForFile = (filePath = '', buffer = null) => {
  const ext = path.extname(String(filePath || '').split('?')[0]).toLowerCase();
  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 5) {
    const headLatin1 = buffer.subarray(0, 5).toString('latin1');
    if (headLatin1 === '%PDF-') return 'application/pdf';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    if (buffer.subarray(0, 3).toString('latin1') === 'GIF') return 'image/gif';
  }
  return MIME_BY_EXT[ext] || 'application/octet-stream';
};

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

    let ext = '';
    if (fallbackName) {
      const pExt = path.extname(fallbackName).toLowerCase();
      if (['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.txt'].includes(pExt)) {
        ext = pExt;
      }
    }
    if (!ext) {
      if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
        ext = '.pdf';
      } else if (mime.includes('image/png')) ext = '.png';
      else if (mime.includes('image/jpeg') || mime.includes('image/jpg')) ext = '.jpg';
      else if (mime.includes('image/webp')) ext = '.webp';
      else if (mime.includes('image/gif')) ext = '.gif';
      else if (mime.includes('spreadsheetml') || mime.includes('excel')) ext = mime.includes('ms-excel') ? '.xls' : '.xlsx';
      else if (mime.includes('text/csv') || mime.includes('application/csv')) ext = '.csv';
      else if (mime.includes('wordprocessingml')) ext = '.docx';
      else if (mime.includes('msword') || mime.includes('word')) ext = '.doc';
      else if (mime.includes('officedocument')) ext = '.docx';
      else if (mime.includes('text/plain')) ext = '.txt';
      else ext = '.pdf';
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
  const detectTypeFromExt = (val) => {
    const ext = String(val || '').split('?')[0].split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    return 'pdf';
  };
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
          type: detectTypeFromExt(cleanUrl)
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
      const type = att.type || detectTypeFromExt(name || cleanUrl);
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

