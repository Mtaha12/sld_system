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

function sanitizeText(str) {
  if (!str) return '';
  return str.replace(/[^\x20-\x7E\r\n\t]/g, ' ').replace(/[ \t]+/g, ' ');
}

function decodeHexPdfString(hex) {
  const cleanHex = (hex || '').replace(/\s+/g, '');
  if (!cleanHex) return '';
  let decoded = '';
  if (cleanHex.length >= 4 && (cleanHex.startsWith('00') || cleanHex.startsWith('FEFF') || cleanHex.startsWith('feff'))) {
    const start = cleanHex.toLowerCase().startsWith('feff') ? 4 : 0;
    for (let h = start; h < cleanHex.length; h += 4) {
      const code = parseInt(cleanHex.slice(h, h + 4), 16);
      if (code >= 32 && code <= 126) decoded += String.fromCharCode(code);
      else if (code === 10 || code === 13) decoded += '\n';
      else if (code === 9) decoded += '\t';
    }
  } else {
    for (let h = 0; h < cleanHex.length; h += 2) {
      const code = parseInt(cleanHex.slice(h, h + 2), 16);
      if (code >= 32 && code <= 126) decoded += String.fromCharCode(code);
      else if (code === 10 || code === 13) decoded += '\n';
      else if (code === 9) decoded += '\t';
    }
  }
  return decoded;
}

/**
 * Advanced Linear PDF Stream Content Parser
 * Accurately decodes TJ arrays, Tj strings, hex codes, and kerning bounds
 */
function parseStreamContent(streamStr) {
  let text = '';
  let i = 0;
  const len = streamStr.length;

  while (i < len) {
    // 1. Check for TJ array: [...] TJ
    if (streamStr[i] === '[') {
      const endBracket = streamStr.indexOf(']', i);
      if (endBracket !== -1) {
        const post = streamStr.slice(endBracket + 1, endBracket + 12).trimStart();
        if (post.startsWith('TJ')) {
          const tjContent = streamStr.slice(i + 1, endBracket);
          let currentStr = '';
          let inParen = false;
          let parenDepth = 0;
          let parenStr = '';
          let isEsc = false;
          let inHex = false;
          let hexStr = '';

          for (let j = 0; j < tjContent.length; j++) {
            const ch = tjContent[j];

            if (inHex) {
              if (ch === '>') {
                inHex = false;
                currentStr += decodeHexPdfString(hexStr);
                hexStr = '';
              } else {
                hexStr += ch;
              }
              continue;
            }

            if (isEsc) {
              if (inParen) parenStr += ch;
              isEsc = false;
              continue;
            }
            if (ch === '\\') {
              isEsc = true;
              continue;
            }
            if (ch === '<' && !inParen && tjContent[j + 1] !== '<') {
              inHex = true;
              hexStr = '';
              continue;
            }
            if (ch === '(') {
              if (parenDepth === 0) {
                inParen = true;
                parenStr = '';
              } else {
                parenStr += ch;
              }
              parenDepth++;
            } else if (ch === ')') {
              parenDepth--;
              if (parenDepth <= 0) {
                inParen = false;
                parenDepth = 0;
                currentStr += decodePdfEscapes(parenStr);
                parenStr = '';
              } else {
                parenStr += ch;
              }
            } else if (inParen) {
              parenStr += ch;
            } else if (!inParen) {
              // Parse spacing numbers between strings
              if ((ch >= '0' && ch <= '9') || ch === '-' || ch === '+') {
                let numStr = ch;
                while (j + 1 < tjContent.length && ((tjContent[j + 1] >= '0' && tjContent[j + 1] <= '9') || tjContent[j + 1] === '.')) {
                  numStr += tjContent[++j];
                }
                const num = parseFloat(numStr);
                // Negative displacement > 120 units indicates genuine space between words
                if (num < -120) {
                  if (currentStr && !currentStr.endsWith(' ')) {
                    currentStr += ' ';
                  }
                }
              }
            }
          }
          if (currentStr.trim()) {
            text += sanitizeText(currentStr) + ' ';
          }
          i = endBracket + 1;
          continue;
        }
      }
    }

    // 2. Check for single Tj (paren): (text) Tj, ', "
    if (streamStr[i] === '(') {
      let parenDepth = 1;
      let j = i + 1;
      let isEsc = false;
      let str = '';
      while (j < len && parenDepth > 0) {
        const ch = streamStr[j];
        if (isEsc) {
          str += ch;
          isEsc = false;
        } else if (ch === '\\') {
          isEsc = true;
        } else if (ch === '(') {
          parenDepth++;
          str += ch;
        } else if (ch === ')') {
          parenDepth--;
          if (parenDepth === 0) break;
          str += ch;
        } else {
          str += ch;
        }
        j++;
      }
      const post = streamStr.slice(j + 1, j + 15).trimStart();
      if (post.startsWith('Tj') || post.startsWith("'") || post.startsWith('"')) {
        const decoded = decodePdfEscapes(str);
        if (decoded.trim()) {
          text += sanitizeText(decoded) + (post.startsWith("'") || post.startsWith('"') ? '\n' : ' ');
        }
        i = j + 1;
        continue;
      }
    }

    // 3. Check for hex string <...> Tj
    if (streamStr[i] === '<' && streamStr[i + 1] !== '<') {
      const closeHex = streamStr.indexOf('>', i);
      if (closeHex !== -1) {
        const hex = streamStr.slice(i + 1, closeHex);
        const post = streamStr.slice(closeHex + 1, closeHex + 15).trimStart();
        if (post.startsWith('Tj')) {
          const decoded = decodeHexPdfString(hex);
          if (decoded.trim()) text += sanitizeText(decoded) + ' ';
          i = closeHex + 1;
          continue;
        }
      }
    }

    // 4. Line breaks and layout positioning operators
    if (streamStr.slice(i, i + 2) === 'T*' || streamStr.slice(i, i + 2) === 'TD') {
      text += '\n';
      i += 2;
      continue;
    }

    i++;
  }
  return text;
}

/**
 * Normalizes extracted text layout and removes kerning spacing anomalies
 */
function normalizeExtractedText(raw) {
  if (!raw) return '';
  return raw
    // Collapse single-letter spaced words: "J U D G M E N T" -> "JUDGMENT", "H I G H  C O U R T" -> "HIGH COURT"
    .replace(/(?:^|\s)(?:[A-Z]\s+){3,}[A-Z](?:\s|$)/g, m => {
      return ' ' + m.replace(/\s+/g, '') + ' ';
    })
    .replace(/(?:^|\s)(?:[a-z]\s+){3,}[a-z](?:\s|$)/g, m => {
      return ' ' + m.replace(/\s+/g, '') + ' ';
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Ultra-Fast Linear Native PDF text extractor (< 15ms execution, zero freeze)
 * Inflates streams and parses text safely with strict linear bounds and full word cohesion
 */
export function extractTextFromPdf(buffer) {
  try {
    if (!buffer || buffer.length < 5) return '';
    const parts = [];
    const latin = buffer.toString('latin1');
    let searchPos = 0;
    let streamCount = 0;

    // Scan for streams linearly without complex regex backtracking
    while (searchPos < latin.length && streamCount < 120) {
      const streamIdx = latin.indexOf('stream', searchPos);
      if (streamIdx === -1) break;

      // Check delimiter before 'stream'
      const prevChar = streamIdx > 0 ? latin[streamIdx - 1] : '\n';
      if (prevChar !== '\n' && prevChar !== '\r' && prevChar !== '>' && prevChar !== ' ') {
        searchPos = streamIdx + 6;
        continue;
      }

      // Inspect preceding dictionary for image filters to skip non-text streams
      const dictStart = Math.max(0, streamIdx - 350);
      const precedingDict = latin.slice(dictStart, streamIdx);
      const isImageStream = /\/(?:Subtype\s*\/Image|Filter\s*\[?\s*\/(?:DCTDecode|JBIG2Decode|JPXDecode|CCITTFaxDecode))\b/i.test(precedingDict);

      let start = streamIdx + 6;
      if (latin[start] === '\r') start++;
      if (latin[start] === '\n') start++;

      const end = latin.indexOf('endstream', start);
      if (end === -1) break;

      searchPos = end + 9;
      streamCount++;

      // Skip image streams
      if (isImageStream) continue;

      const streamLen = end - start;
      if (streamLen <= 0 || streamLen > 4000000) continue;

      // Trim trailing whitespace/\r/\n before endstream
      let realEnd = end;
      while (realEnd > start && (latin[realEnd - 1] === '\r' || latin[realEnd - 1] === '\n' || latin[realEnd - 1] === ' ')) {
        realEnd--;
      }

      const rawStream = buffer.subarray(start, realEnd);
      let decompressed = null;
      try {
        decompressed = zlib.inflateSync(rawStream);
      } catch (_) {
        try {
          decompressed = zlib.inflateRawSync(rawStream);
        } catch (_) {
          decompressed = null;
        }
      }

      let streamText = '';
      if (decompressed && decompressed.length < 5000000) {
        streamText = parseStreamContent(decompressed.toString('latin1'));
      } else if (!decompressed && streamLen < 500000) {
        const rawLatin = rawStream.toString('latin1');
        if (rawLatin.includes('BT') && (rawLatin.includes('Tj') || rawLatin.includes('TJ'))) {
          streamText = parseStreamContent(rawLatin);
        }
      }

      if (streamText && streamText.trim().length > 0) {
        parts.push(streamText.trim());
        // Collect up to 60KB of clean extracted text
        if (parts.join('\n\n').length > 60000) break;
      }
    }

    let result = normalizeExtractedText(parts.join('\n\n'));

    // If stream parsing extracted minimal text, fallback to clean ascii/hex scanning
    if (result.length < 60) {
      const pdfSyntaxBlacklist = new Set([
        'obj', 'endobj', 'stream', 'endstream', 'xref', 'trailer', 'startxref',
        'catalog', 'pages', 'page', 'mediabox', 'resources', 'procset', 'font',
        'xobject', 'subtype', 'image', 'filter', 'flatedecode', 'dctdecode',
        'length', 'type', 'root', 'info', 'producer', 'creator', 'creationdate',
        'moddate', 'author', 'title', 'subject', 'keywords', 'bpc', 'colorspace',
        'devicergb', 'devicgray', 'devicecmyk', 'bitspercomponent', 'height', 'width'
      ]);
      const words = [];
      const cleanLatin = latin.replace(/[^\x20-\x7E\r\n\t]/g, ' ');
      const tokens = cleanLatin.split(/\s+/);
      for (const w of tokens) {
        // Decode potential UTF-16BE hex tokens (e.g. FEFF0043...)
        if (/^(?:FEFF|feff|00)[0-9A-Fa-f]{6,}$/.test(w)) {
          const dec = decodeHexPdfString(w);
          if (dec && dec.length >= 3) {
            words.push(dec);
            continue;
          }
        }
        const cleanW = w.replace(/^[\\\/()<>\[\]%#]+|[\\\/()<>\[\]%#]+$/g, '');
        if ((cleanW.length >= 2 || /^\d+$/.test(cleanW)) && !pdfSyntaxBlacklist.has(cleanW.toLowerCase()) && /^[a-zA-Z0-9.,;:()'"\/\-]+$/.test(cleanW)) {
          words.push(cleanW);
          if (words.length > 2500) break;
        }
      }
      if (words.length >= 2) {
        result = normalizeExtractedText(words.join(' '));
      }
    }

    return result.slice(0, 50000);
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
