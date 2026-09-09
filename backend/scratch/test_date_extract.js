import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

let extractedDates = 0;
for (let i = 1; i <= 100; i++) {
  const caseNum = String(data[i][4] || '');
  const match = caseNum.match(/(?:decision\s+dated|dated)\s*[:\-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  if (match) {
    extractedDates++;
  }
}

console.log(`Extracted dates in first 100 rows: ${extractedDates}/100`);
