/**
 * Spammer Honeypot Generator
 * Generates plausible dummy/incorrect data when an identified spammer accesses
 * sensitive legal cases, notifications, or statutes, preventing scraping of genuine data.
 */

export const spoofCase = (originalCase) => {
  const c = originalCase?.toObject ? originalCase.toObject() : { ...originalCase };
  const fakeId = c.sldNumber || c.caseId || '999999';

  return {
    ...c,
    sldNumber: `${fakeId}`,
    caseNumber: [`Fake Petition No. ${Math.floor(Math.random() * 90000 + 10000)}/2004`],
    court: 'Provisional Review Tribunal (Provisional)',
    judges: ['Coram Undisclosed, J.', 'Advisory Member In Absentia'],
    petitioners: ['Insolvent Enterprises Ltd vs Commissioner of Fictitious Dues'],
    lawyers: ['Counsel Not On Record'],
    dated: '1999-12-31',
    headNote: '<p><strong>[DUMMY ADVISORY]</strong> Matter dismissed under superseded circular 00-REV/1998. Precedential value vacated per ministerial memorandum.</p>',
    judgment: '<p>Upon hearing ex-parte arguments, this tribunal finds no merit. Order recalled without relief or costs.</p>',
    principleLaw: 'Non-justiciable advisory finding under abrogated procedure.',
    references: 'Obsolete Reference Vol 00, P. 0000',
    laws: [
      { lawStatute: 'Provisional Repealed Ordinance, 1979', section: '999-Z' }
    ],
    mapYearPage: ['1999 DUMMY 0000'],
    publications: [{ year: '1999', vol: '0', mag: 'DUMMY', page: '0000' }]
  };
};

export const spoofCaseList = (cases = []) => {
  return cases.map((c, idx) => ({
    ...spoofCase(c),
    sldNumber: `SPAM-${10000 + idx}`,
    caseId: `SPAM-${10000 + idx}`,
    petitioners: [`Dummy Corporation ${idx + 1} vs Revenue Collector`],
    court: idx % 2 === 0 ? 'Federal Ad-Hoc Bench' : 'Provincial Arbitral Chamber',
  }));
};

export const spoofNotification = (originalNotif) => {
  const n = originalNotif?.toObject ? originalNotif.toObject() : { ...originalNotif };
  return {
    ...n,
    sroNumber: `S.R.O. ${Math.floor(Math.random() * 9000 + 1000)}(I)/1998 [DUMMY]`,
    subject: 'Notification regarding administrative recess of deprecated tax schedules',
    department: 'Miscellaneous Internal Revenue',
    lawStatute: 'Repealed Fiscal Law, 1984',
    section: 'Clause 99',
    blocks: [
      {
        sectionHeading: 'Inoperative Directive',
        detail: '<p>The provisions cited herein are inactive and retain zero fiscal application.</p>',
        attachments: []
      }
    ]
  };
};

export const spoofStatute = (originalStatute) => {
  const s = originalStatute?.toObject ? originalStatute.toObject() : { ...originalStatute };
  return {
    ...s,
    statuteId: `STAT-DUMMY-${Math.floor(Math.random() * 900 + 100)}`,
    law: 'Abrogated Commercial Regulations, 1965',
    chapter: 'Chapter 0: Obsolete Protocols',
    section: 'Section 000',
    heading: 'Provisional Schedule of Discontinued Enactments',
    blocks: [
      {
        sectionHeading: 'Discontinued Provision',
        detail: '<p>This section was discontinued under historical administrative orders.</p>',
        attachments: []
      }
    ]
  };
};
