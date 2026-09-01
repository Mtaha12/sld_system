import re
import os

laws = []
with open('parsed.txt', 'r', encoding='utf-16le', errors='replace') as f:
    for line in f:
        line = line.strip()
        match = re.match(r'^\d+\.\s+(.*)$', line)
        if match:
            law_name = match.group(1).strip().replace("'", "\\'")
            laws.append(law_name)
        elif laws and line and not re.match(r'^Page \d+$', line) and not line.startswith('Complete Law Names') and not line.startswith('Extracted from'):
            laws[-1] += " " + line.replace("'", "\\'")

if laws:
    os.makedirs('../src/data', exist_ok=True)
    with open('../src/data/laws.js', 'w', encoding='utf-8') as f:
        f.write('export const LAW_OPTIONS = [\n')
        f.write("  { value: '', label: 'Choose a law' },\n")
        for law in laws:
            f.write(f"  {{ value: '{law}', label: '{law}' }},\n")
        f.write('];\n')
    print(f"Successfully saved {len(laws)} laws.")
else:
    print("No laws found.")

