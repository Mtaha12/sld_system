import json
import re
import os

transcript_path = r'C:\Users\faiza\.gemini\antigravity\brain\d57e7400-29a5-4e6a-8a98-892298778495\.system_generated\logs\transcript_full.jsonl'

laws = []
pdf_text = ""

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            parsed = json.loads(line)
            if 'content' in parsed and isinstance(parsed['content'], str):
                if '==Start of PDF==' in parsed['content']:
                    pdf_text = parsed['content']
        except Exception:
            pass

if pdf_text:
    lines = pdf_text.split('\n')
    for line in lines:
        match = re.match(r'^\d+\.\s+(.*)$', line.strip())
        if match:
            law_name = match.group(1).strip().replace("'", "\\'")
            laws.append(law_name)
        elif laws and line.strip() and not re.match(r'^\d+', line.strip()) and not re.match(r'^Page \d+$', line.strip()) and not line.startswith('==') and not line.startswith('Extracted from'):
            laws[-1] += " " + line.strip().replace("'", "\\'")

if laws:
    os.makedirs('src/data', exist_ok=True)
    with open('src/data/laws.js', 'w', encoding='utf-8') as f:
        f.write('export const LAW_OPTIONS = [\n')
        f.write("  { value: '', label: 'Choose a law' },\n")
        for law in laws:
            f.write(f"  {{ value: '{law}', label: '{law}' }},\n")
        f.write('];\n')
    print(f"Successfully saved {len(laws)} laws.")
else:
    print("No laws found.")
