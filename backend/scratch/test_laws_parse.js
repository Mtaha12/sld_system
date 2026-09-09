const testStr = "Income Tax Ordinance, 2001 80D,234,80,235,234(A)(3),80CC,80C,  Constitution of Pakistan, 1973 199  Sales Tax Act, 1990 3,7,7A ";

function parseLaws(val) {
  if (!val) return [];
  const text = String(val).trim();
  // Statutes are often separated by 2+ spaces or newlines
  const lines = text.split(/(?:\r?\n|\s{2,})/).map(s => s.trim()).filter(Boolean);
  const results = [];

  for (const line of lines) {
    // Check if line contains a year followed by space and sections
    // e.g. "Income Tax Ordinance, 2001 80D,234,..."
    // or separator '='
    if (line.includes('=')) {
      const idx = line.indexOf('=');
      const lawStatute = line.slice(0, idx).trim();
      const sections = line.slice(idx + 1).split(',').map(s => s.trim()).filter(Boolean);
      for (const section of (sections.length ? sections : [''])) {
        results.push({ lawStatute, section });
      }
    } else {
      // Look for statute matching something like `... \d{4} <sections>`
      // or split by last whitespace before digits/section numbers
      const match = line.match(/^(.+?,\s*\d{4}|\D+?)\s+([0-9A-Za-z(),._ -]+)$/);
      if (match) {
        const lawStatute = match[1].trim();
        const sections = match[2].split(',').map(s => s.trim()).filter(Boolean);
        for (const section of (sections.length ? sections : [''])) {
          results.push({ lawStatute, section });
        }
      } else {
        results.push({ lawStatute: line.trim(), section: '' });
      }
    }
  }
  return results;
}

console.log(parseLaws(testStr));
