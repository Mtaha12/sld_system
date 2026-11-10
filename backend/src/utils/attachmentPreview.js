import zlib from 'zlib';
import path from 'path';
import XLSX from 'xlsx';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const decodeXmlEntities = (str) =>
  String(str || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');

/**
 * Extracts a single UTF-8 XML file from a ZIP container (.docx / .xlsx) via Central Directory.
 */
export const extractZipEntryText = (zipBuffer, targetEntryName) => {
  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length < 22) return null;

  const minOffset = Math.max(0, zipBuffer.length - 65557);
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= minOffset; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return null;

  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  let pos = zipBuffer.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < totalEntries && pos + 46 <= zipBuffer.length; i++) {
    if (zipBuffer.readUInt32LE(pos) !== 0x02014b50) break;
    const method = zipBuffer.readUInt16LE(pos + 10);
    const compSize = zipBuffer.readUInt32LE(pos + 20);
    const nameLen = zipBuffer.readUInt16LE(pos + 28);
    const extraLen = zipBuffer.readUInt16LE(pos + 30);
    const commentLen = zipBuffer.readUInt16LE(pos + 32);
    const localOffset = zipBuffer.readUInt32LE(pos + 42);
    const name = zipBuffer.toString('utf8', pos + 46, pos + 46 + nameLen);

    if (name.toLowerCase() === targetEntryName.toLowerCase()) {
      if (localOffset + 30 > zipBuffer.length || zipBuffer.readUInt32LE(localOffset) !== 0x04034b50) {
        return null;
      }
      const lNameLen = zipBuffer.readUInt16LE(localOffset + 26);
      const lExtraLen = zipBuffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const dataEnd = Math.min(zipBuffer.length, dataStart + compSize);
      const slice = zipBuffer.subarray(dataStart, dataEnd);

      const raw = method === 0 ? slice : method === 8 ? zlib.inflateRawSync(slice) : null;
      return raw ? raw.toString('utf8') : null;
    }

    pos += 46 + nameLen + extraLen + commentLen;
  }

  return null;
};

/**
 * Checks ZIP entries to distinguish .xlsx vs .docx when filename lacks an extension.
 */
export const detectZipOfficeType = (zipBuffer) => {
  if (extractZipEntryText(zipBuffer, 'word/document.xml')) return 'docx';
  if (extractZipEntryText(zipBuffer, 'xl/workbook.xml')) return 'xlsx';
  return null;
};

const renderDocxXmlToHtml = (xml) => {
  if (!xml) return '<p>Unable to extract Word document text.</p>';

  // Split around paragraph tags while keeping table cells visually separated
  const normalized = xml
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, '    ')
    .replace(/<\/w:tc>/g, ' | ')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:p>/g, '\n\n');

  const stripped = decodeXmlEntities(normalized.replace(/<[^>]+>/g, ''));
  const paragraphs = stripped
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return '<p style="color:#64748b;font-style:italic;">Document contains no readable text content (it may contain scanned images).</p>';
  }

  return paragraphs
    .map((para) => {
      const lines = para.split('\n').map((l) => l.trim()).filter(Boolean);
      const isRowLike = lines.every((l) => l.includes(' | '));
      if (isRowLike && lines.length > 0 && lines.some((l) => l.split(' | ').length > 1)) {
        const rowsHtml = lines
          .map((line) => {
            const cells = line.split(' | ').map((c) => `<td>${escapeHtml(c.trim())}</td>`).join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');
        return `<table><tbody>${rowsHtml}</tbody></table>`;
      }
      return `<p>${lines.map(escapeHtml).join('<br/>')}</p>`;
    })
    .join('\n');
};

const extractLegacyDocHtml = (buffer) => {
  // Legacy binary .doc (OLE2): extract readable UTF-16LE or ASCII paragraph runs cleanly
  const utf16Runs = [];
  const textUtf16 = buffer.toString('utf16le');
  const matches16 = textUtf16.match(/[\u0020-\u007e\r\n\t]{16,}/g) || [];
  for (const m of matches16) {
    const cleaned = m.replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 16 && !/^(Root Entry|WordDocument|1Table|SummaryInformation|Microsoft)/i.test(cleaned)) {
      utf16Runs.push(cleaned);
    }
  }

  const runs = utf16Runs.length > 0
    ? utf16Runs
    : (buffer.toString('latin1').match(/[\x20-\x7e\r\n]{20,}/g) || [])
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter((s) => s.length >= 20 && !/^(Root Entry|WordDocument|bjbj|Microsoft)/i.test(s));

  if (runs.length === 0) {
    return '<p style="color:#64748b;font-style:italic;">Legacy binary .doc preview is limited. Use Download Original to open in Microsoft Word.</p>';
  }

  return runs.slice(0, 600).map((r) => `<p>${escapeHtml(r)}</p>`).join('\n');
};

const renderSpreadsheetHtml = (buffer) => {
  const wb = XLSX.read(buffer, { type: 'buffer', dense: false });
  if (!wb || !Array.isArray(wb.SheetNames) || wb.SheetNames.length === 0) {
    return '<p>No spreadsheet sheets found.</p>';
  }

  return wb.SheetNames.slice(0, 12)
    .map((sheetName) => {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
      const cappedRows = rows.slice(0, 2500);
      const maxCols = Math.min(50, cappedRows.reduce((m, r) => Math.max(m, Array.isArray(r) ? r.length : 0), 0));

      if (cappedRows.length === 0 || maxCols === 0) {
        return `<section class="sheet"><h2>${escapeHtml(sheetName)}</h2><p class="muted">Empty sheet</p></section>`;
      }

      const tableRows = cappedRows
        .map((row, rowIdx) => {
          const cells = [];
          for (let c = 0; c < maxCols; c++) {
            const val = Array.isArray(row) && row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
            const tag = rowIdx === 0 ? 'th' : 'td';
            cells.push(`<${tag}>${escapeHtml(val)}</${tag}>`);
          }
          return `<tr>${cells.join('')}</tr>`;
        })
        .join('');

      const truncatedNotice = rows.length > 2500
        ? `<p class="muted">Showing first 2,500 of ${rows.length} rows.</p>`
        : '';

      return `<section class="sheet"><h2>${escapeHtml(sheetName)}</h2><div class="table-wrap"><table><tbody>${tableRows}</tbody></table></div>${truncatedNotice}</section>`;
    })
    .join('\n');
};

/**
 * Converts a spreadsheet (.xlsx/.xls/.csv), Word (.docx/.doc), or text buffer into escaped HTML preview.
 */
export const buildAttachmentPreview = (buffer, filename = 'Document', mimeHint = '') => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Empty document buffer');
  }

  const ext = path.extname(String(filename || '').split('?')[0]).toLowerCase();
  const mime = String(mimeHint || '').toLowerCase();
  const isZip = buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;

  let format = '';
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    format = 'spreadsheet';
  } else if (ext === '.docx' || mime.includes('wordprocessingml')) {
    format = 'docx';
  } else if (ext === '.doc' || mime.includes('msword')) {
    format = 'doc';
  } else if (isZip) {
    const zipKind = detectZipOfficeType(buffer);
    if (zipKind === 'xlsx') format = 'spreadsheet';
    else if (zipKind === 'docx') format = 'docx';
  } else if (ext === '.txt' || mime.startsWith('text/plain')) {
    format = 'text';
  }

  if (format === 'spreadsheet') {
    return {
      format: 'spreadsheet',
      filename,
      bodyHtml: renderSpreadsheetHtml(buffer)
    };
  }

  if (format === 'docx') {
    const xml = extractZipEntryText(buffer, 'word/document.xml');
    return {
      format: 'word',
      filename,
      bodyHtml: renderDocxXmlToHtml(xml)
    };
  }

  if (format === 'doc') {
    const bodyHtml = isZip
      ? renderDocxXmlToHtml(extractZipEntryText(buffer, 'word/document.xml'))
      : extractLegacyDocHtml(buffer);
    return {
      format: 'word',
      filename,
      bodyHtml
    };
  }

  if (format === 'text') {
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 2 * 1024 * 1024));
    return {
      format: 'text',
      filename,
      bodyHtml: `<pre>${escapeHtml(text)}</pre>`
    };
  }

  return {
    format: 'unsupported',
    filename,
    bodyHtml: ''
  };
};

