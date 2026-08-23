const fs = require('fs');

const COURTS = [
  'Federal Constitutional Court of Pakistan',
  'Supreme Court of Pakistan',
  'Lahore High Court',
  'Sindh High Court',
  'Islamabad High Court',
  'Peshawar High Court'
];

const STATUSES = ['Active', 'Closed', 'Pending', 'Archived'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const baseCases = [
  {
    mapYearPage: ['SLD 2025 8335', '2025 SLD 3335', '(2025) Tax 304 139'],
    caseNumber: ['C.P.L.A.3458-K/2022', 'with connected case', 'decided on 07.05.2025.', 'State Life Margalla 11,', '13th, 13thA, 13th B, 14th', '& 14th C.'],
    judges: ['A.U.BANGASH,', 'J.U.DOGAR, M.S.', 'AKRAM, A.NAEEM,', 'N.MOHSIN.'],
    lawyers: ['For the Petitioners: Mr. Rashid', 'Ameer, ASC [Insaaf Naz', 'Foundation] Mr. Muneer,', 'Adv. Mr. Salman Akram Raja,', 'ASC [Counsel Associate: Mr.', 'Jawad Ahmad] For the'],
    petitioners: ['C.P.L.A.3458-K/2022 (Against', 'the judgment dated', '29.03.2022, 2019 CLC 551)', 'State Life Insurance', 'Corporation of Pakistan', '(SLIC) through its Chairman']
  },
  {
    mapYearPage: ['SLD 2025 8333', '2025 SLD 3333'],
    caseNumber: ['C.A. Misc. No. 4821/2022', 'Order dtd: 06.05.2025.'],
    judges: ['Aumreha Imtiaz,', 'J.'],
    lawyers: ['Mr. Muhammad Sarmad, Adv.', 'For the Petitioner.', 'Mr. Muhammad Ishaq, Adv.', 'For the Respondent.'],
    petitioners: ['Applicant: Dr. Mirza Ikram', 'Baig Versus The State']
  },
  {
    mapYearPage: ['SLD 2025 8331', '2025 SLD 3331'],
    caseNumber: ['Civil Revision No. 10 of', '2025. Order dtd:', '05.05.2025.'],
    judges: ['Aumreha Imtiaz,', 'J.'],
    lawyers: ['Applicant: The State Vs.', 'Dar-ul-Roomi Welfare', 'Trust & Ors.'],
    petitioners: ['Applicant: The State Vs.', 'Dar-ul-Roomi Welfare', 'Trust & Ors.']
  }
];

let mockCases = [];
let startId = 1629516;

for (let i = 0; i < 35; i++) {
  const base = baseCases[i % 3];
  
  // Randomize a bit
  const d = new Date(2025, 4, 7);
  d.setDate(d.getDate() - i);
  const dated = d.toISOString().split('T')[0];
  const month = MONTHS[d.getMonth()];
  
  mockCases.push({
    id: i + 1,
    sldNumber: (startId - i).toString(),
    dated,
    mapYearPage: base.mapYearPage,
    month,
    court: COURTS[i % COURTS.length],
    caseNumber: base.caseNumber,
    judges: base.judges,
    lawyers: base.lawyers,
    lawyersMore: i % 4 === 0 ? '+3 more' : null,
    petitioners: base.petitioners,
    petitionersMore: i % 5 === 0 ? '+2 more' : null,
    attachments: Math.floor(Math.random() * 5) + 1,
    status: STATUSES[i % STATUSES.length]
  });
}

const fileContent = `export const MOCK_CASES = ${JSON.stringify(mockCases, null, 2)};\n`;
fs.writeFileSync('src/features/cases/data/casesMockData.js', fileContent);
console.log('Successfully wrote 35 mock cases.');
