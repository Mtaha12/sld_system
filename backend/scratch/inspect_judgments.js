import fs from 'fs';
import path from 'path';

const filePath = path.resolve(process.cwd(), '..', 'Judgment SLD # 1-500.txt');
const content = fs.readFileSync(filePath, 'utf-8');

console.log('Total length of judgment file:', content.length);

// Let's find all occurrences of "SLD #:" or "SLD #"
const matches = [...content.matchAll(/SLD\s*#\s*:\s*(\d+)/gi)];
console.log('Total SLD matches with "SLD #: <num>":', matches.length);

if (matches.length > 0) {
  console.log('First 5 match numbers:', matches.slice(0, 5).map(m => m[1]));
  console.log('Last 5 match numbers:', matches.slice(-5).map(m => m[1]));
}

// Let's check for any other patterns of SLD #
const allSldMatches = [...content.matchAll(/SLD\s*#\s*(\d+)/gi)];
console.log('Total SLD matches with "SLD # <num>":', allSldMatches.length);

// Check if any numbers are duplicated or missing between min and max
const sldNums = matches.map(m => parseInt(m[1], 10));
const numSet = new Set(sldNums);
console.log('Unique SLD numbers found:', numSet.size);

const min = Math.min(...sldNums);
const max = Math.max(...sldNums);
console.log(`Range: min=${min}, max=${max}`);

const missing = [];
for (let i = min; i <= max; i++) {
  if (!numSet.has(i)) missing.push(i);
}
console.log('Missing numbers in range 1-500:', missing);
