const fs = require('fs');
const readline = require('readline');

async function processTranscript() {
  const fileStream = fs.createReadStream('C:\\Users\\faiza\\.gemini\\antigravity\\brain\\d57e7400-29a5-4e6a-8a98-892298778495\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'USER_INPUT' && parsed.content.includes('Extracted from the uploaded HTML dropdown')) {
        console.log('Found message!');
        console.log('First 200 chars:', parsed.content.substring(0, 200));
        break;
      }
    } catch (e) {
    }
  }
}

processTranscript();
