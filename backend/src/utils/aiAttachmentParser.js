import zlib from 'zlib';
import XLSX from 'xlsx';
import logger from './logger.js';

function decodePdfEscapes(str) {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractTextFromStream(streamBuf) {
  const textChunks = [];
  const latin = streamBuf.toString('latin1');

  // Extract text within BT ... ET blocks
  const btRegex = /BT[\s\S]*?ET/g;
  let btMatch;
  while ((btMatch = btRegex.exec(latin)) !== null) {
    const block = btMatch[0];

    // 1. Array strings: [(str1) -10 (str2)] TJ
    const tjArrayRegex = /\[((?:[^\(\)\[\]]*|\([^\)]*\))*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let sMatch;
      let combined = '';
      while ((sMatch = strRegex.exec(inner)) !== null) {
        combined += decodePdfEscapes(sMatch[1]);
      }
      if (combined.trim()) textChunks.push(combined.trim());
    }

    // 2. Single strings: (str) Tj or (str) ' or (str) "
    const tjSingleRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
    let singleMatch;
    while ((singleMatch = tjSingleRegex.exec(block)) !== null) {
      const decoded = decodePdfEscapes(singleMatch[1]);
      if (decoded.trim()) textChunks.push(decoded.trim());
    }

    // 3. Hex strings: <48656c6c6f> Tj
    const hexRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      try {
        const hex = hexMatch[1];
        const bytes = Buffer.from(hex, 'hex');
        const str = bytes.toString('utf8');
        if (str.trim()) textChunks.push(str.trim());
      } catch (_) {}
    }
  }

  // If BT...ET yielded nothing, try finding any (string) Tj in the stream
  if (textChunks.length === 0) {
    const fallbackTj = /\(([^)]+)\)\s*Tj/g;
    let fMatch;
    while ((fMatch = fallbackTj.exec(latin)) !== null) {
      const dec = decodePdfEscapes(fMatch[1]);
      if (dec.trim().length > 1) textChunks.push(dec.trim());
    }
  }

  return textChunks.join(' ');
}

/**
 * Robust Native PDF text extractor
 * Inflates FlateDecode streams and parses PDF text operators (Tj, TJ, BT/ET)
 */
export function extractTextFromPdf(buffer) {
  try {
    if (!buffer || buffer.length < 5) return '';
    const parts = [];
    const latin = buffer.toString('latin1');
    const streamStartRegex = /stream[\r\n]+/g;
    let match;

    while ((match = streamStartRegex.exec(latin)) !== null) {
      const start = match.index + match[0].length;
      const end = latin.indexOf('endstream', start);
      if (end === -1) break;

      const rawStream = buffer.subarray(start, end);
      let decompressed = null;
      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch (_) {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch (_) {
          decompressed = rawStream;
        }
      }

      if (decompressed) {
        const streamText = extractTextFromStream(decompressed);
        if (streamText && streamText.trim().length > 0) {
          parts.push(streamText.trim());
        }
      }
    }

    let result = parts.join('\n\n').trim();

    // If stream parsing extracted minimal text, fallback to readable string scanning
    if (result.length < 50) {
      const readable = latin
        .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3 && /^[a-zA-Z0-9.,;:()'"\/\-]+$/.test(w))
        .join(' ');
      if (readable.length > result.length) {
        result = readable;
      }
    }

    return result;
  } catch (err) {
    logger?.warn?.(`extractTextFromPdf error: ${err.message}`);
    return '';
  }
}

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
 * Handles PDF (.pdf), Word (.doc, .docx), Excel (.xlsx, .xls, .csv), and plain text.
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

    // 1. PDF Documents (.pdf)
    if (name.endsWith('.pdf') || type === 'application/pdf' || (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-')) {
      const pdfText = extractTextFromPdf(buffer);
      if (pdfText) {
        return {
          ...att,
          type: 'application/pdf',
          text: `[PDF Document: ${att.name || 'Document'}]\n${pdfText}`
        };
      }
    }

    // 2. Excel Spreadsheets (.xlsx, .xls, .csv)
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

    // 3. Word Documents (.docx, .doc)
    if (name.endsWith('.docx') || name.endsWith('.doc') || type.includes('word') || type.includes('officedocument')) {
      const docxText = extractTextFromDocx(buffer);
      if (docxText) {
        return {
          ...att,
          type: name.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword',
          text: `[Word Document: ${att.name || 'Document'}]\n${docxText}`
        };
      }
    }

    // 4. Plain Text / RTF / JSON / XML
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
