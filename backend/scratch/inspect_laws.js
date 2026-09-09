import XLSX from 'xlsx';

const wb = XLSX.readFile('../1-15000.xlsx');
const s = wb.Sheets['CASE DATA'];
const data = XLSX.utils.sheet_to_json(s, { header: 1 });

for (let i = 1; i <= 10; i++) {
  console.log(`SLD ${data[i][0]}:`, JSON.stringify(data[i][3]));
}
