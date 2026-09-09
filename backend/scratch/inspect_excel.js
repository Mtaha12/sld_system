import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

console.log('--- Sample Citations (first 20 rows) ---');
for (let i = 1; i <= 20; i++) {
  console.log(`Row ${i} (SLD ${data[i][0]}):`, data[i][1]);
}

console.log('\n--- Checking format variations in Column 1 ---');
let matchesStandard = 0;
let totalNonEmpty = 0;
let examples = [];

for (let i = 1; i < data.length; i++) {
  const cell = String(data[i][1] || '').trim();
  if (!cell) continue;
  totalNonEmpty++;
  if (cell.toUpperCase().startsWith('SLD ')) {
    if (examples.length < 15) {
      examples.push({ sld: data[i][0], raw: cell });
    }
  }
}

console.log('Total non-empty citations:', totalNonEmpty);
console.log('Examples starting with SLD:');
console.log(JSON.stringify(examples, null, 2));
