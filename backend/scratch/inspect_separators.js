import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

let hasEquals = 0;
let hasTripleSpace = 0;
let hasTab = 0;
let hasNewline = 0;

for (let i = 1; i < data.length; i++) {
  const cell = String(data[i][1] || '').trim();
  if (!cell) continue;
  if (cell.includes('=')) hasEquals++;
  if (cell.includes('   ')) hasTripleSpace++;
  if (cell.includes('\t')) hasTab++;
  if (cell.includes('\n')) hasNewline++;
}

console.log('Total non-empty:', data.length - 1);
console.log('Has "=":', hasEquals);
console.log('Has "   " (triple space):', hasTripleSpace);
console.log('Has tab:', hasTab);
console.log('Has newline:', hasNewline);
