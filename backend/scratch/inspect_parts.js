import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

const formats = new Set();
let rowsSample = [];

for (let i = 1; i < 50; i++) {
  const cell = String(data[i][1] || '').trim();
  const parts = cell.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
  rowsSample.push({ sld: data[i][0], parts });
}

console.log(JSON.stringify(rowsSample.slice(0, 10), null, 2));
