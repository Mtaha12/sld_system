import os
import sys
import json
import time
import re
import pymongo
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(env_path)

mongo_uri = os.getenv('MONGODB_URI')
if not mongo_uri:
    print("ERROR: MONGODB_URI not found in .env", flush=True)
    sys.exit(1)

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
CASESLAW_PATH = os.path.join(WORKSPACE_ROOT, 'cms_caseslaw.json')
CASENUMBERS_PATH = os.path.join(WORKSPACE_ROOT, 'cms_casenumbers.json')
DETAILS_PATH = os.path.join(WORKSPACE_ROOT, 'cms_caseslawdetail.json')
SECTIONS_PATH = os.path.join(WORKSPACE_ROOT, 'cms_caseslawsections.json')

LOOKUPS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'scratch', 'lookups'))
COURTS_PATH = os.path.join(LOOKUPS_DIR, 'cms_courts.json')
DEPTS_PATH = os.path.join(LOOKUPS_DIR, 'cms_departments.json')
LAWS_PATH = os.path.join(LOOKUPS_DIR, 'cms_lawstatutes.json')
PLAWS_PATH = os.path.join(LOOKUPS_DIR, 'cms_principlelaws.json')

TARGET_STORAGE_LIMIT_MB = 450.0
BATCH_SIZE = 500


def clean_string(val):
    if val is None:
        return ''
    return str(val).replace('\r\n', '\n').replace('\r', '\n').strip()


def extract_date(case_num_str, dated_raw):
    if dated_raw and str(dated_raw).strip() not in ('0000-00-00', 'None', '', 'null'):
        d = str(dated_raw).strip()
        m = re.match(r'^(\d{4}-\d{2}-\d{2})', d)
        if m:
            return m.group(1)

    if not case_num_str:
        return None

    m = re.search(r'(?:decision\s+dated|dated|decision\s+date\s*d)\s*[:\-]?\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})', str(case_num_str), re.IGNORECASE)
    if m:
        day = m.group(1).zfill(2)
        month = m.group(2).zfill(2)
        year = m.group(3)
        if len(year) == 2:
            year = '20' + year if int(year) < 50 else '19' + year
        if int(month) > 12 and int(day) <= 12:
            day, month = month, day
        return f"{year}-{month}-{day}"
    return None


def clean_case_numbers(primary_case_no, sld_numbers):
    res = []
    seen = set()
    candidates = []
    if primary_case_no:
        candidates.append(primary_case_no)
    if sld_numbers:
        candidates.extend(sld_numbers)

    for c in candidates:
        if not c:
            continue
        s = clean_string(c)
        s = re.sub(r'\bDATE\s+d:\s*', 'dated: ', s)
        s = re.sub(r'\bDATE\s*:\s*', 'dated: ', s)
        s = re.sub(r'\s+', ' ', s).strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            res.append(s)
    return res


def clean_array_field(val):
    s = clean_string(val)
    return [s] if s else []


def process_publications(case_year, case_mag, case_page, details_list):
    pubs = []
    map_year_page = []
    seen = set()

    for d in (details_list or []):
        year = str(d.get('d_year') or '').strip()
        vol = str(d.get('d_vol') or '').strip()
        mag = str(d.get('d_mag') or '').strip()
        page = str(d.get('d_page') or '').strip()

        if not (year or mag or page):
            continue

        key = f"{year}|{mag.lower()}|{vol}|{page}"
        if key in seen:
            continue
        seen.add(key)

        pubs.append({
            'year': year,
            'vol': vol,
            'mag': mag.lower(),
            'page': page
        })

        mag_upper = mag.upper()
        if vol:
            citation = f"({year}) {vol} {mag_upper} {page}".strip()
        elif year:
            citation = f"{year} {mag_upper} {page}".strip()
        else:
            citation = f"{mag_upper} {page}".strip()
        map_year_page.append(citation)

    c_year = str(case_year or '').strip()
    c_mag = str(case_mag or '').strip()
    c_page = str(case_page or '').strip()
    if c_mag and c_page:
        key = f"{c_year}|{c_mag.lower()}||{c_page}"
        if key not in seen:
            seen.add(key)
            pubs.insert(0, {
                'year': c_year,
                'vol': '',
                'mag': c_mag.lower(),
                'page': c_page
            })
            citation = f"{c_year} {c_mag.upper()} {c_page}".strip() if c_year else f"{c_mag.upper()} {c_page}".strip()
            map_year_page.insert(0, citation)

    return pubs, map_year_page


def process_laws(sections_list, law_lookup):
    laws_res = []
    seen = set()
    for s in (sections_list or []):
        lid = s.get('d_idlaw')
        lname = law_lookup.get(lid) or str(s.get('lawname') or '').strip()
        if not lname:
            continue

        raw_secs = str(s.get('d_sections') or '').strip()
        if not raw_secs:
            key = f"{lname.lower()}|"
            if key not in seen:
                seen.add(key)
                laws_res.append({'lawStatute': lname, 'section': '', 'date': None, 'dated': None})
            continue

        sec_parts = [p.strip() for p in raw_secs.split(',') if p.strip()]
        if not sec_parts:
            sec_parts = ['']

        for sec in sec_parts:
            key = f"{lname.lower()}|{sec.lower()}"
            if key not in seen:
                seen.add(key)
                laws_res.append({
                    'lawStatute': lname,
                    'section': sec,
                    'date': None,
                    'dated': None
                })
    return laws_res


def main():
    print("=" * 70, flush=True)
    print(f"CONTINUING INGESTION TO FILL MONGODB STORAGE UP TO {TARGET_STORAGE_LIMIT_MB} MB", flush=True)
    print("=" * 70, flush=True)

    client = pymongo.MongoClient(mongo_uri)
    db = client.get_default_database()

    initial_count = db.cases.count_documents({})
    db_stats = db.command('dbStats')
    current_storage_mb = (db_stats.get('storageSize', 0) + db_stats.get('indexSize', 0)) / (1024 * 1024)

    print(f"Current cases count in DB: {initial_count:,}", flush=True)
    print(f"Current total database storage: {current_storage_mb:.2f} MB / {TARGET_STORAGE_LIMIT_MB:.2f} MB limit", flush=True)

    if current_storage_mb >= TARGET_STORAGE_LIMIT_MB:
        print(f"Database is already at {current_storage_mb:.2f} MB >= target {TARGET_STORAGE_LIMIT_MB} MB. Nothing to do.", flush=True)
        client.close()
        return

    # Load existing sldNumbers to guarantee 0 duplicates
    print("Fetching existing sldNumbers from DB...", flush=True)
    existing_slds = set()
    max_existing_sld = 0
    for doc in db.cases.find({}, {'sldNumber': 1}):
        s = doc.get('sldNumber')
        if s:
            existing_slds.add(str(s))
            try:
                num = int(s)
                if num > max_existing_sld:
                    max_existing_sld = num
            except:
                pass
    print(f"Loaded {len(existing_slds):,} existing sldNumbers. Max SLD in DB: {max_existing_sld}", flush=True)

    # Load lookups and auxiliary maps
    print("Loading lookups and indexing auxiliary datasets...", flush=True)
    t0 = time.time()
    with open(COURTS_PATH, 'r', encoding='utf-8') as f:
        courts_lookup = {c['court_id']: c['court_name'] for c in json.load(f)}

    with open(DEPTS_PATH, 'r', encoding='utf-8') as f:
        depts_lookup = {d['dept_id']: d['dept_name'] for d in json.load(f)}

    with open(LAWS_PATH, 'r', encoding='utf-8') as f:
        laws_lookup = {l['law_id']: l['law_name'] for l in json.load(f)}

    with open(PLAWS_PATH, 'r', encoding='utf-8') as f:
        plaws_lookup = {p['plaw_id']: p['plaw_name'] for p in json.load(f)}

    details_by_case = {}
    with open(DETAILS_PATH, 'r', encoding='utf-8') as f:
        for item in json.load(f):
            cid = item.get('id_case')
            if cid:
                details_by_case.setdefault(cid, []).append(item)

    sections_by_case = {}
    with open(SECTIONS_PATH, 'r', encoding='utf-8') as f:
        for item in json.load(f):
            cid = item.get('id_case')
            if cid:
                sections_by_case.setdefault(cid, []).append(item)

    casenumbers_by_sld = {}
    with open(CASENUMBERS_PATH, 'r', encoding='utf-8') as f:
        for item in json.load(f):
            sld = item.get('sld_no')
            cno = (item.get('case_no') or '').strip()
            if sld and cno:
                casenumbers_by_sld.setdefault(sld, []).append(cno)

    print(f"Lookups and auxiliary data loaded in {time.time() - t0:.2f}s.", flush=True)

    # Fast regex to extract sldno without full json.loads() when skipping
    sld_pattern = re.compile(r'"sldno":\s*(\d+)')

    print(f"\nStreaming '{os.path.basename(CASESLAW_PATH)}' and appending complete cases...", flush=True)
    batch = []
    new_inserted = 0
    scanned = 0
    skipped_existing = 0
    skipped_incomplete = 0
    t_start = time.time()
    reached_limit = False

    with open(CASESLAW_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line.startswith('{'):
                continue
            if line.endswith(','):
                line = line[:-1]

            scanned += 1

            # FAST SKIP: Check sldno before parsing full 30KB json string
            m = sld_pattern.search(line[:100])
            if m:
                fast_sld = int(m.group(1))
                if fast_sld <= max_existing_sld and str(fast_sld) in existing_slds:
                    skipped_existing += 1
                    continue

            try:
                c = json.loads(line)
            except Exception:
                continue

            cid = c.get('id')
            sldno = c.get('sldno')
            if not sldno:
                continue

            sld_str = str(sldno)
            if sld_str in existing_slds:
                skipped_existing += 1
                continue

            # Core fields
            judgment_text = clean_string(c.get('judgment') or c.get('judgment1') or '')
            head_note = clean_string(c.get('head_note') or '')
            primary_case_no = clean_string(c.get('case_no') or '')
            court_name = courts_lookup.get(c.get('id_court'), '').strip()

            # Completeness verification: NO half or partial cases
            if len(judgment_text) < 30 or len(head_note) < 15 or not court_name or not primary_case_no:
                skipped_incomplete += 1
                continue

            existing_slds.add(sld_str)

            dept_name = depts_lookup.get(c.get('id_dept'), 'tax') or 'tax'
            department = dept_name.lower().strip()
            dated = extract_date(primary_case_no, c.get('dated'))

            extra_numbers = casenumbers_by_sld.get(sldno, [])
            case_numbers = clean_case_numbers(primary_case_no, extra_numbers)

            judges = clean_array_field(c.get('judges'))
            petitioners = clean_array_field(c.get('petitioners'))
            lawyers = clean_array_field(c.get('lawyers'))
            principle_law = plaws_lookup.get(c.get('id_plaw'), '').strip()
            references = clean_string(c.get('case_references'))

            details_list = details_by_case.get(cid, [])
            publications, map_year_page = process_publications(
                c.get('case_year'), c.get('case_mag'), c.get('case_page'), details_list
            )

            sections_list = sections_by_case.get(cid, [])
            laws = process_laws(sections_list, laws_lookup)

            doc = {
                'caseId': f"CASE-IMPORT-{sld_str}",
                'case_id': f"CASE-IMPORT-{sld_str}",
                'sldNumber': sld_str,
                'dated': dated,
                'department': department,
                'court': court_name,
                'caseNumber': case_numbers,
                'judges': judges,
                'petitioners': petitioners,
                'lawyers': lawyers,
                'headNote': head_note,
                'references': references,
                'principleLaw': principle_law,
                'legalMaxim': '',
                'judgment': judgment_text,
                'publications': publications,
                'laws': laws,
                'attachments': [],
                'mapYearPage': map_year_page,
                'isDeleted': False,
                'deletedAt': None,
                'createdAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
                'updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime()),
            }

            batch.append(doc)

            if len(batch) >= BATCH_SIZE:
                db.cases.insert_many(batch, ordered=False)
                new_inserted += len(batch)
                batch = []

                if new_inserted % 1000 == 0:
                    try:
                        cur_db_stats = db.command('dbStats')
                        cur_coll_stats = db.command('collStats', 'cases')
                        tot_mb = (cur_db_stats.get('storageSize', 0) + cur_db_stats.get('indexSize', 0)) / (1024 * 1024)
                        case_stor_mb = cur_coll_stats.get('storageSize', 0) / (1024 * 1024)
                        idx_mb = cur_coll_stats.get('totalIndexSize', 0) / (1024 * 1024)
                        total_count = initial_count + new_inserted

                        print(f"  [Progress] Cases: {total_count:,} (+{new_inserted:,} new) | Storage: {case_stor_mb:.1f} MB | Index: {idx_mb:.1f} MB | Total DB: {tot_mb:.2f} MB / {TARGET_STORAGE_LIMIT_MB} MB", flush=True)

                        if tot_mb >= TARGET_STORAGE_LIMIT_MB:
                            print(f"\n[TARGET REACHED] Reached {tot_mb:.2f} MB total storage! Stopping at {TARGET_STORAGE_LIMIT_MB} MB limit.", flush=True)
                            reached_limit = True
                            break
                    except Exception as e:
                        print(f"  [Progress] +{new_inserted:,} new cases inserted...", flush=True)

        if batch and not reached_limit:
            cur_db_stats = db.command('dbStats')
            tot_mb = (cur_db_stats.get('storageSize', 0) + cur_db_stats.get('indexSize', 0)) / (1024 * 1024)
            if tot_mb < TARGET_STORAGE_LIMIT_MB:
                db.cases.insert_many(batch, ordered=False)
                new_inserted += len(batch)
                batch = []

    elapsed = time.time() - t_start
    final_count = db.cases.count_documents({})
    final_db_stats = db.command('dbStats')
    final_coll_stats = db.command('collStats', 'cases')
    final_storage_mb = (final_db_stats.get('storageSize', 0) + final_db_stats.get('indexSize', 0)) / (1024 * 1024)

    print("\n" + "=" * 70, flush=True)
    print("INGESTION COMPLETE SUMMARY", flush=True)
    print("=" * 70, flush=True)
    print(f"New Cases Added:          +{new_inserted:,}", flush=True)
    print(f"Total Cases Now in DB:    {final_count:,}", flush=True)
    print(f"Cases Uncompressed Size:  {final_coll_stats.get('size', 0) / (1024 * 1024):.2f} MB", flush=True)
    print(f"Cases Storage on Disk:    {final_coll_stats.get('storageSize', 0) / (1024 * 1024):.2f} MB", flush=True)
    print(f"Cases Total Index Size:   {final_coll_stats.get('totalIndexSize', 0) / (1024 * 1024):.2f} MB", flush=True)
    print(f"Total Database Storage:   {final_storage_mb:.2f} MB / 512.00 MB limit", flush=True)
    print(f"Remaining Free Headroom:  {512.00 - final_storage_mb:.2f} MB", flush=True)
    print(f"Time Taken:               {elapsed:.1f} seconds", flush=True)
    print("=" * 70, flush=True)

    client.close()


if __name__ == '__main__':
    main()
