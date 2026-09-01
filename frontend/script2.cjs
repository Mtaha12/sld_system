const fs = require('fs');
const readline = require('readline');

async function processTranscript() {
  const fileStream = fs.createReadStream('C:\\Users\\faiza\\.gemini\\antigravity\\brain\\d57e7400-29a5-4e6a-8a98-892298778495\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let laws = [];
  const regex = /^\d+\.\s+(.*)$/;
  let pdfText = '';

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      // Check if it's the TOOL_RESPONSE from view_file containing the PDF text
      if (parsed.content && parsed.content.includes('==Start of PDF==')) {
         pdfText = parsed.content;
      }
    } catch (e) {
    }
  }

  if (pdfText) {
    let textLines = pdfText.split('\n');
    for (let i = 0; i < textLines.length; i++) {
        let textLine = textLines[i];
        if (textLine.includes('\\n')) {
            const subLines = textLine.split('\\n');
            for (const subLine of subLines) {
                 const match = subLine.match(regex);
                 if (match) {
                     laws.push(match[1].trim().replace(/'/g, "\\'"));
                 }
            }
        } else {
             const match = textLine.match(regex);
             if (match) {
                 laws.push(match[1].trim().replace(/'/g, "\\'"));
             }
        }
    }
  }

  let out = 'export const LAW_OPTIONS = [\n';
  out += '  { value: \'\', label: \'Choose a law\' },\n';
  laws.forEach(law => {
    out += `  { value: '${law}', label: '${law}' },\n`;
  });
  out += '];\n';
  
  fs.mkdirSync('src/data', { recursive: true });
  fs.writeFileSync('src/data/laws.js', out);
  console.log('Saved ' + laws.length + ' laws to src/data/laws.js');
}

processTranscript();
