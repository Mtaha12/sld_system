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

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'USER_INPUT' && parsed.content.includes('Extracted from the uploaded HTML dropdown')) {
        const textLines = parsed.content.split('\n');
        for (const textLine of textLines) {
          const match = textLine.match(regex);
          if (match) {
            laws.push(match[1].trim().replace(/'/g, "\\'"));
          }
        }
      }
    } catch (e) {
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
