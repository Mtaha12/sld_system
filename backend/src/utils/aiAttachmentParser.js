import zlib from 'zlib';
import XLSX from 'xlsx';
import logger from './logger.js';

/**
 * Extracts raw textual content from DOCX (Office Open XML Word) buffer
 */
export function extractTextFromDocx(buffer) {
  try {
    let pos = 0;
    while (pos < buffer.length - 30) {
      if (buffer[pos] === 0x50 && buffer[pos + 1] === 0x4b && buffer[pos + 2] === 0x03 && buffer[pos + 3] === 0x04) {
        const compMethod = buffer.readUInt16LE(pos + 8);
        const compSize = buffer.readUInt32LE(pos + 18);
        const uncompSize = buffer.readUInt32LE(pos + 22);
        const nameLen = buffer.readUInt16LE(pos + 26);
        const extraLen = buffer.readUInt16LE(pos + 28);
        const name = buffer.toString('utf8', pos + 30, pos + 30 + nameLen);
        const dataStart = pos + 30 + nameLen + extraLen;

        if (name === 'word/document.xml') {
          let xml = '';
          if (compMethod === 0) {
            xml = buffer.toString('utf8', dataStart, dataStart + uncompSize);
          } else if (compMethod === 8) {
            const deflated = buffer.subarray(dataStart, dataStart + (compSize > 0 ? compSize : buffer.length - dataStart));
            xml = zlib.inflateRawSync(deflated).toString('utf8');
          }
          if (xml) {
            const text = xml
              .replace(/<w:p[ >]/g, '\n')
              .replace(/<w:tab\/>/g, '\t')
              .replace(/<w:br\/>/g, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
              .trim();
            if (text.length > 0) return text;
          }
        }
        pos = dataStart + (compSize > 0 ? compSize : 1);
      } else {
        pos++;
      }
    }
    // Fallback: extract ASCII/UTF8 words
    return buffer.toString('utf8').replace(/[^\x20-\x7E\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  } catch (err) {
    logger?.warn?.(`extractTextFromDocx warning: ${err.message}`);
    return buffer.toString('utf8').replace(/[^\x20-\x7E\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }
}

/**
 * Extracts tabular CSV content from Excel (XLSX, XLS, CSV) buffer
 */
export function extractTextFromExcel(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let text = '';
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv && csv.trim()) {
        text += `\n[Sheet: ${sheetName}]\n${csv.trim()}\n`;
      }
    }
    return text.trim();
  } catch (err) {
    logger?.warn?.(`extractTextFromExcel warning: ${err.message}`);
    return '';
  }
}

/**
 * Parses and enriches attachment objects with textual representations
 * Handles Word (.doc, .docx), Excel (.xlsx, .xls, .csv), and plain text.
 */
export function parseAIAttachment(att) {
  if (!att || typeof att !== 'object') return att;

  // If text already exists, keep it
  if (att.text && typeof att.text === 'string' && att.text.trim()) {
    return att;
  }

  const name = String(att.name || '').toLowerCase();
  const type = String(att.type || '').toLowerCase();

  // If no base64 content, cannot extract binary data
  if (!att.base64) {
    return att;
  }

  try {
    const buffer = Buffer.from(att.base64, 'base64');

    // 1. Excel Spreadsheets (.xlsx, .xls, .csv)
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || type.includes('spreadsheet') || type.includes('excel')) {
      const excelText = extractTextFromExcel(buffer);
      if (excelText) {
        return {
          ...att,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          text: `[Excel Data: ${att.name || 'Spreadsheet'}]\n${excelText}`
        };
      }
    }

    // 2. Word Documents (.docx, .doc)
    if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('word') || type.includes('officedocument')) {
      const docxText = extractTextFromDocx(buffer);
      if (docxText) {
        return {
          ...att,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          text: `[Word Document: ${att.name || 'Document'}]\n${docxText}`
        };
      }
    }

    // 3. Plain Text / RTF / JSON / XML
    if (name.endsWith('.txt') || name.endsWith('.rtf') || name.endsWith('.json') || name.endsWith('.xml') || type.includes('text')) {
      const str = buffer.toString('utf8');
      return {
        ...att,
        text: str
      };
    }
  } catch (err) {
    logger?.warn?.(`parseAIAttachment error for ${att.name}: ${err.message}`);
  }

  return att;
}

/**
 * Normalizes an array of attachments for the AI Legal Intelligence Engine
 */
export function parseAllAIAttachments(attachments = []) {
  if (!Array.isArray(attachments)) return [];
  return attachments.map(parseAIAttachment);
}

