/**
 * Convert number into English words (e.g. 25000 -> "twenty-five thousand")
 */
const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 
              'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 
              'seventeen', 'eighteen', 'nineteen'];

const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function convertChunk(num) {
  let str = '';
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + ' hundred ';
    num %= 100;
  }
  if (num >= 20) {
    str += tens[Math.floor(num / 10)];
    if (num % 10 > 0) {
      str += '-' + ones[num % 10];
    }
    str += ' ';
  } else if (num > 0) {
    str += ones[num] + ' ';
  }
  return str.trim();
}

export function numberToWords(num) {
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'zero';

  let words = '';

  // Millions / Crore / Lakh or standard Millions / Thousands
  if (n >= 10000000) {
    const crore = Math.floor(n / 10000000);
    words += convertChunk(crore) + ' crore ';
    const remainder = n % 10000000;
    if (remainder > 0) words += numberToWords(remainder);
    return words.trim();
  }

  if (n >= 100000) {
    const lakh = Math.floor(n / 100000);
    words += convertChunk(lakh) + ' lakh ';
    const remainder = n % 100000;
    if (remainder > 0) words += numberToWords(remainder);
    return words.trim();
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    words += convertChunk(thousands) + ' thousand ';
    const remainder = n % 1000;
    if (remainder > 0) words += convertChunk(remainder);
    return words.trim();
  }

  return convertChunk(n);
}

export default numberToWords;
