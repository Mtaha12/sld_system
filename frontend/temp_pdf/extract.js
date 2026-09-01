const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:\\Users\\faiza\\.gemini\\antigravity\\brain\\d57e7400-29a5-4e6a-8a98-892298778495\\.user_uploaded\\media_1788268753910.pdf');

pdf(dataBuffer).then(function(data) {
    const text = data.text;
    const lines = text.split('\n');
    let laws = [];
    const regex = /^\d+\.\s+(.*)$/;
    
    for (let line of lines) {
        line = line.trim();
        let match = line.match(regex);
        if (match) {
            laws.push(match[1].trim().replace(/'/g, "\\'"));
        } else if (laws.length > 0 && line.length > 0 && !line.match(/^\d+/) && !line.match(/^Page \d+$/)) {
            // Append continuation lines to the previous law (e.g. long names that wrapped to next line in PDF)
            laws[laws.length - 1] += " " + line.replace(/'/g, "\\'");
        }
    }
    
    let out = 'export const LAW_OPTIONS = [\n';
    out += '  { value: \'\', label: \'Choose a law\' },\n';
    laws.forEach(law => {
        out += `  { value: '${law}', label: '${law}' },\n`;
    });
    out += '];\n';
    
    fs.writeFileSync('../src/data/laws.js', out);
    console.log('Successfully saved ' + laws.length + ' laws to src/data/laws.js');
});
