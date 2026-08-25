import { MOCK_CASES } from '../data/casesMockData.js';

let casesData = [...MOCK_CASES];

export const caseService = {
  getCases: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([...casesData]);
      }, 50);
    });
  },

  getCaseById: async (idOrSld) => {
    return new Promise((resolve) => {
      const clean = idOrSld?.toString().toLowerCase().replace(/^sld\s*#?/i, '').trim();
      const found = casesData.find(c => 
        c.id?.toString() === clean || 
        c.sldNumber?.toLowerCase() === clean ||
        (Array.isArray(c.caseNumber) && c.caseNumber.some(n => n.toLowerCase().includes(clean)))
      );
      setTimeout(() => {
        resolve(found || null);
      }, 50);
    });
  },

  searchCases: async (filters = {}) => {
    return new Promise((resolve) => {
      const { subject, fromDate, toDate, magazine } = filters;
      let results = [...casesData];

      if (subject) {
        const query = subject.toLowerCase().trim();
        results = results.filter(item => {
          const courtMatch = item.court?.toLowerCase().includes(query);
          const sldMatch = item.sldNumber?.toLowerCase().includes(query);
          const dateMatch = item.dated?.toLowerCase().includes(query);
          const caseNumMatch = Array.isArray(item.caseNumber) && item.caseNumber.some(c => c.toLowerCase().includes(query));
          const judgesMatch = Array.isArray(item.judges) && item.judges.some(j => j.toLowerCase().includes(query));
          const lawyersMatch = Array.isArray(item.lawyers) && item.lawyers.some(l => l.toLowerCase().includes(query));
          const petitionersMatch = Array.isArray(item.petitioners) && item.petitioners.some(p => p.toLowerCase().includes(query));
          const citationMatch = Array.isArray(item.mapYearPage) && item.mapYearPage.some(m => m.toLowerCase().includes(query));
          return courtMatch || sldMatch || dateMatch || caseNumMatch || judgesMatch || lawyersMatch || petitionersMatch || citationMatch;
        });
      }

      if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        results = results.filter(item => {
          if (!item.dated) return true;
          return new Date(item.dated).getTime() >= fromTime;
        });
      }

      if (toDate) {
        const toTime = new Date(toDate).getTime();
        results = results.filter(item => {
          if (!item.dated) return true;
          return new Date(item.dated).getTime() <= toTime;
        });
      }

      if (magazine) {
        results = results.filter(item => 
          item.mapYearPage?.some(m => m.toLowerCase().includes(magazine.toLowerCase()))
        );
      }

      setTimeout(() => {
        resolve(results);
      }, 50);
    });
  },

  createCase: async (newCase) => {
    return new Promise((resolve) => {
      const record = {
        ...newCase,
        id: newCase.id || Date.now(),
      };
      casesData = [record, ...casesData];
      setTimeout(() => {
        resolve({ success: true, data: record });
      }, 100);
    });
  },

  updateCase: async (id, updatedFields) => {
    return new Promise((resolve) => {
      casesData = casesData.map(c => c.id === id ? { ...c, ...updatedFields } : c);
      const updated = casesData.find(c => c.id === id);
      setTimeout(() => {
        resolve({ success: true, data: updated });
      }, 100);
    });
  },

  deleteCase: async (id) => {
    return new Promise((resolve) => {
      casesData = casesData.filter(c => c.id !== id);
      setTimeout(() => {
        resolve({ success: true, id });
      }, 100);
    });
  },

  deleteCases: async (ids) => {
    return new Promise((resolve) => {
      casesData = casesData.filter(c => !ids.includes(c.id));
      setTimeout(() => {
        resolve({ success: true, ids });
      }, 100);
    });
  }
};
