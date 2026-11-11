import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SCP_BASE_URL = 'https://www.supremecourt.gov.pk/downloads_judgements';

// Ordered prefix mappings verified against live supremecourt.gov.pk downloads_judgements URLs
const SCP_PREFIX_MAP = new Map([
  ['c.p.l.a.', ['c.p.', 'c.p.l.a.']],
  ['crl.p.l.a.', ['crl.p.', 'crl.p.l.a.']],
  ['crl.o.p.', ['crl.o.', 'crl.o.p.']],
  ['c.p.', ['const.p.', 'c.p.']],
  ['const.p.', ['const.p.', 'c.p.']],
  ['reference.', ['reference.', 'ref.']],
]);

const KNOWN_SCP_CASE_PREFIX_RE = /^(?:C\.P\.L\.A\.|Crl\.P\.L\.A\.|C\.A\.|Crl\.A\.|C\.P\.|Const\.P\.|J\.P\.|C\.M\.A\.|S\.M\.C\.|C\.R\.P\.|H\.R\.C\.|Crl\.O\.P\.|I\.C\.A\.|Crl\.M\.A\.|Crl\.R\.P\.|Reference\.|C\.U\.O\.|Crl\.Sh\.A\.|C\.Sh\.A\.|C\.M\.Appeal\.|Crl\.M\.Appeal\.|Crl\.I\.C\.A\.|Crl\.S\.M\.R\.P\.|H\.R\.|R\.P\.|S\.J\.C\.)/i;

const cleanUrlField = (val) => {
  const s = String(val || '').trim();
  return s && s.toLowerCase() !== 'nil' ? s : '';
};

export const getStoredOtherCaseUrl = (doc) => {
  if (!doc) return '';
  return (
    cleanUrlField(doc.caseNoLink) ||
    cleanUrlField(doc.downloadLink) ||
    cleanUrlField(doc.attachment) ||
    ''
  );
};

export const isLikelySupremeCourtRecord = (doc) => {
  if (!doc) return false;
  const citation = String(doc.citation || doc.scCitation || '').trim();
  const caseNo = String(doc.caseNo || '').trim();
  if (/\b(?:19|20)\d{2}\s+SCP\s+\d+\b/i.test(citation)) return true;
  if (/high\s*court|circuit/i.test(caseNo)) return false;
  return KNOWN_SCP_CASE_PREFIX_RE.test(caseNo);
};

/**
 * Generates deterministic Supreme Court judgment PDF candidate URLs from caseNo.
 * Example: "C.P.L.A.1103-L/2016" -> ["https://www.supremecourt.gov.pk/downloads_judgements/c.p._1103_l_2016.pdf", ...]
 */
export const buildSupremeCourtCandidateUrls = (doc) => {
  if (!doc || !doc.caseNo || !isLikelySupremeCourtRecord(doc)) return [];

  let raw = String(doc.caseNo)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw || raw.startsWith('=')) return [];

  const m = raw.match(/^([A-Za-z.]+?)\s*\.?\s*(\d+)(?:\s*-\s*([A-Za-z]+))?\s*\/\s*(\d{4})(?:\/.*)?$/i);
  if (!m) return [];

  let normPrefix = m[1].toLowerCase().replace(/\s+/g, '');
  if (!normPrefix.endsWith('.')) normPrefix = `${normPrefix}.`;

  const num = m[2];
  const bench = m[3] ? m[3].toLowerCase() : '';
  const year = m[4];

  const mappedPrefixes = SCP_PREFIX_MAP.get(normPrefix) || [normPrefix];
  const slugSuffixes = bench
    ? [`_${num}_${bench}_${year}.pdf`, `_${num}-${bench}_${year}.pdf`]
    : [`_${num}_${year}.pdf`];

  const candidates = [];
  const seen = new Set();
  for (const pref of mappedPrefixes) {
    for (const suf of slugSuffixes) {
      const url = `${SCP_BASE_URL}/${pref}${suf}`;
      if (!seen.has(url)) {
        seen.add(url);
        candidates.push(url);
      }
    }
  }
  return candidates;
};

export const getPrimarySupremeCourtCandidateUrl = (doc) => {
  const candidates = buildSupremeCourtCandidateUrls(doc);
  return candidates[0] || '';
};

const isPdfResponse = (response, buffer) => {
  if (!response || !response.ok || !buffer || buffer.length < 100) return false;
  const ct = String(response.headers.get('content-type') || '').toLowerCase();
  const headerSig = buffer.subarray(0, 5).toString('utf8');
  return headerSig === '%PDF-' || (ct.includes('pdf') && !ct.includes('html'));
};

/**
 * Resolves a working Supreme Court PDF URL (checking local disk cache first, then probing candidates)
 * and returns { url, buffer, contentType, fromCache } if found, else null.
 */
export const resolveAndFetchSupremeCourtPdf = async (doc, { cacheDir = '', timeoutMs = 15000 } = {}) => {
  const candidates = buildSupremeCourtCandidateUrls(doc);
  if (candidates.length === 0) return null;

  // 1. Check disk cache across candidates first (0 network latency)
  if (cacheDir) {
    for (const url of candidates) {
      const urlHash = crypto.createHash('md5').update(url).digest('hex');
      const cacheFilePath = path.join(cacheDir, `${urlHash}.pdf`);
      if (fs.existsSync(cacheFilePath)) {
        try {
          const stats = fs.statSync(cacheFilePath);
          if (stats.size > 1000) {
            return { url, cacheFilePath, size: stats.size, fromCache: true };
          }
        } catch {}
      }
    }
  }

  // 2. Fetch candidates directly until a real PDF is returned
  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.supremecourt.gov.pk/',
    'Accept': 'application/pdf,application/octet-stream,*/*'
  };

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(url, { headers: fetchHeaders, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!isPdfResponse(response, buffer)) continue;

      return {
        url,
        buffer,
        contentType: response.headers.get('content-type') || 'application/pdf',
        fromCache: false,
      };
    } catch {}
  }

  return null;
};

