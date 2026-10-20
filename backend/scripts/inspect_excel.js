import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('../LIST OF ARTICLES, TOPICS AND WORDS & PHRASES.xlsx');
console.log('Reading file:', filePath);

const workbook = xlsx.readFile(filePath);
console.log('Sheet names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log('Total rows:', data.length);
  console.log('First 3 rows:', data.slice(0, 3));
});
