import xlsx from 'xlsx';
import path from 'path';

const filePath = path.resolve('../LIST OF ARTICLES, TOPICS AND WORDS & PHRASES.xlsx');
const workbook = xlsx.readFile(filePath);

// Inspect ARTICLES
const articlesSheet = workbook.Sheets['ARTICLES'];
const articles = xlsx.utils.sheet_to_json(articlesSheet);
console.log('ARTICLES length:', articles.length);
console.log('Sample Article:', articles[0]);

// Inspect TOPICS
const topicsSheet = workbook.Sheets['TOPICS'];
const topics = xlsx.utils.sheet_to_json(topicsSheet);
console.log('TOPICS length:', topics.length);
console.log('Sample Topic:', topics[0]);

// Inspect WORDS & PHRASES
const wpSheet = workbook.Sheets['WORDS & PHRASES'];
const wp = xlsx.utils.sheet_to_json(wpSheet);
console.log('WORDS & PHRASES length:', wp.length);
console.log('Sample WP:', wp[0]);

// Inspect LEGAL TERMS
const ltSheet = workbook.Sheets['LEGAL TERMS'];
const lt = xlsx.utils.sheet_to_json(ltSheet);
console.log('LEGAL TERMS length:', lt.length);
console.log('Sample LT:', lt[0]);

// Inspect MAXIMS
const maximsSheet = workbook.Sheets['MAXIMS'];
const maxims = xlsx.utils.sheet_to_json(maximsSheet);
console.log('MAXIMS length:', maxims.length);
console.log('Sample Maxim:', maxims[0]);
