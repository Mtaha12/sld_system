import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('../LIST OF ARTICLES, TOPICS AND WORDS & PHRASES.xlsx');
const workbook = xlsx.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`\n==================================================`);
  console.log(`SHEET: ${sheetName} (Rows: ${rows.length})`);
  console.log(`==================================================`);
  if (rows.length > 0) {
    console.log('Sample Row 1:', rows[0]);
    console.log('Sample Row 2:', rows[1]);
    console.log('Sample Row 3:', rows[2]);
    console.log('Keys:', Object.keys(rows[0]));
  }
});
