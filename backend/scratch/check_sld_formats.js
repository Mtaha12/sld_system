import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

let bothPresent = 0;
let onlyMagFirst = 0;
let onlyYearFirst = 0;
let neither = 0;

for (let i = 1; i < data.length; i++) {
  const cell = String(data[i][1] || '').trim();
  const parts = cell.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
  
  let hasMagFirst = parts.some(p => /^SLD\s+\d{4}\s+\d+/i.test(p));
  let hasYearFirst = parts.some(p => /^\d{4}\s+SLD\s+\d+/i.test(p));

  if (hasMagFirst && hasYearFirst) bothPresent++;
  else if (hasMagFirst && !hasYearFirst) onlyMagFirst++;
  else if (!hasMagFirst && hasYearFirst) onlyYearFirst++;
  else neither++;
}

console.log({
  total: data.length - 1,
  bothPresent,
  onlyMagFirst,
  onlyYearFirst,
  neither
});
