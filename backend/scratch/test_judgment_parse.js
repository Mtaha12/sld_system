import fs from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), '..', 'Judgment SLD # 1-500.txt');
const content = fs.readFileSync(filePath, 'utf-8');

// Split by regex matching "SLD #:\s*(\d+)"
const regex = /(?:^|\r?\n)SLD\s*#\s*:\s*(\d+)\r?\n/gi;
let match;
const sections = [];
let lastIndex = 0;
let lastSld = null;

while ((match = regex.exec(content)) !== null) {
  if (lastSld !== null) {
    sections.push({
      sld: lastSld,
      text: content.slice(lastIndex, match.index).trim()
    });
  }
  lastSld = parseInt(match[1], 10);
  lastIndex = match.index + match[0].length;
}

if (lastSld !== null) {
  sections.push({
    sld: lastSld,
    text: content.slice(lastIndex).trim()
  });
}

console.log('Sections parsed:', sections.length);
console.log('Section 1 SLD:', sections[0].sld, 'Length:', sections[0].text.length);
console.log('Section 1 Preview (start):\n', sections[0].text.slice(0, 150));
console.log('Section 1 Preview (end):\n', sections[0].text.slice(-150));

console.log('\nSection 2 SLD:', sections[1].sld, 'Length:', sections[1].text.length);
console.log('Section 2 Preview (start):\n', sections[1].text.slice(0, 150));
console.log('Section 2 Preview (end):\n', sections[1].text.slice(-150));

console.log('\nSection 500 SLD:', sections[499].sld, 'Length:', sections[499].text.length);
console.log('Section 500 Preview (start):\n', sections[499].text.slice(0, 150));
console.log('Section 500 Preview (end):\n', sections[499].text.slice(-150));
