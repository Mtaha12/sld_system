import os
import sys
import json
import time
import re
import pymongo
from dotenv import load_dotenv

# Set UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# 1. Load environment variables
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(env_path)

mongo_uri = os.getenv('MONGODB_URI')
if not mongo_uri:
    print("ERROR: MONGODB_URI not found in .env")
    sys.exit(1)

# File paths
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

# Target safe limit for MongoDB Atlas M0 (512 MB hard quota)
SAFE_STORAGE_LIMIT_MB = 380.0
TARGET_CASE_COUNT = 15000
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

    # Check case_mag and case_page from cms_caseslaw.json
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
    print("=" * 70)
    print("STARTING COMPLETE CASE LAW RESET & NEW INGESTION PROCESS")
    print("=" * 70)

    # Step 1: Connect to MongoDB
    print(f"\n[1/6] Connecting to MongoDB Atlas...")
    client = pymongo.MongoClient(mongo_uri)
    db = client.get_default_database()
    print(f"Connected to database: '{db.name}'")

    # Step 2: Wipe all previous case data
    print(f"\n[2/6] Wiping all previous case law data...")
    if 'cases' in db.list_collection_names():
        db.cases.drop()
        print("Dropped existing 'cases' collection (reclaimed all previous storage & indexes).")
    else:
        print("'cases' collection did not exist.")

    # Reset counter for 'case'
    db.counters.delete_one({'_id': 'case'})
    print("Reset 'case' counter in counters collection.")

    # Step 3: Load lookups and auxiliary tables into memory
    print(f"\n[3/6] Loading lookups and indexing auxiliary tables into memory...")
    t0 = time.time()

    with open(COURTS_PATH, 'r', encoding='utf-8') as f:
        courts_lookup = {c['court_id']: c['court_name'] for c in json.load(f)}

    with open(DEPTS_PATH, 'r', encoding='utf-8') as f:
        depts_lookup = {d['dept_id']: d['dept_name'] for d in json.load(f)}

    with open(LAWS_PATH, 'r', encoding='utf-8') as f:
        laws_lookup = {l['law_id']: l['law_name'] for l in json.load(f)}

    with open(PLAWS_PATH, 'r', encoding='utf-8') as f:
        plaws_lookup = {p['plaw_id']: p['plaw_name'] for p in json.load(f)}

    print(f"  - Lookups loaded: {len(courts_lookup)} courts, {len(depts_lookup)} departments, {len(laws_lookup)} statutes, {len(plaws_lookup)} principles of law.")

    # Index cms_caseslawdetail.json
    details_by_case = {}
    with open(DETAILS_PATH, 'r', encoding='utf-8') as f:
        for item in json.load(f):
            cid = item.get('id_case')
            if cid:
                details_by_case.setdefault(cid, []).append(item)
    print(f"  - Indexed details for {len(details_by_case)} cases.")

    # Index cms_caseslawsections.json
    sections_by_case = {}
    with open(SECTIONS_PATH, 'r', encoding='utf-8') as f:
        for item in json.load(f):
            cid = item.get('id_case')
            if cid:
                sections_by_case.setdefault(cid, []).append(item)
    print(f"  - Indexed sections for {len(sections_by_case)} cases.")

    # Index cms_casenumbers.json
    casenumbers_by_sld = {}
    with open(CASENUMBERS_PATH, 'r', encoding='utf-8') as f:
        for item in json.load(f):
            sld = item.get('sld_no')
            cno = (item.get('case_no') or '').strip()
            if sld and cno:
                casenumbers_by_sld.setdefault(sld, []).append(cno)
    print(f"  - Indexed case numbers for {len(casenumbers_by_sld)} SLD numbers.")
    print(f"All auxiliary data indexed in {time.time() - t0:.2f} seconds.")

    # Step 4: Stream and transform cms_caseslaw.json
    print(f"\n[4/6] Streaming '{os.path.basename(CASESLAW_PATH)}' in sequential order...")
    print(f"  - Target count: {TARGET_CASE_COUNT} complete cases")
    print(f"  - Storage ceiling limit: {SAFE_STORAGE_LIMIT_MB} MB")
    print(f"  - Filtering: Only 100% complete cases (full judgment, headnote, court, case number)")
    print(f"  - Excluding extra/irrelevant fields (status, is_new, id_added, date_added, id_modify, date_modify, id_deleted, date_deleted, ip_deleted)")

    batch = []
    total_inserted = 0
    total_scanned = 0
    skipped_incomplete = 0
    seen_sld_numbers = set()
    start_time = time.time()

    with open(CASESLAW_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line.startswith('{'):
                continue
            if line.endswith(','):
                line = line[:-1]

            total_scanned += 1
            try:
                c = json.loads(line)
            except Exception:
                continue

            cid = c.get('id')
            sldno = c.get('sldno')
            if not sldno or sldno in seen_sld_numbers:
                continue

            # Core text fields
            judgment_text = clean_string(c.get('judgment') or c.get('judgment1') or '')
            head_note = clean_string(c.get('head_note') or '')
            primary_case_no = clean_string(c.get('case_no') or '')
            court_name = courts_lookup.get(c.get('id_court'), '').strip()

            # COMPLETENESS CHECK: Ensure no half or partial cases
            if len(judgment_text) < 30 or len(head_note) < 15 or not court_name or not primary_case_no:
                skipped_incomplete += 1
                continue

            sld_str = str(sldno)
            seen_sld_numbers.add(sldno)

            # Department
            dept_name = depts_lookup.get(c.get('id_dept'), 'tax') or 'tax'
            department = dept_name.lower().strip()

            # Date
            dated = extract_date(primary_case_no, c.get('dated'))

            # Case numbers (combine and clean)
            extra_numbers = casenumbers_by_sld.get(sldno, [])
            case_numbers = clean_case_numbers(primary_case_no, extra_numbers)

            # Judges, Petitioners, Lawyers
            judges = clean_array_field(c.get('judges'))
            petitioners = clean_array_field(c.get('petitioners'))
            lawyers = clean_array_field(c.get('lawyers'))

            # Principle of Law
            principle_law = plaws_lookup.get(c.get('id_plaw'), '').strip()

            # References
            references = clean_string(c.get('case_references'))

            # Publications and mapYearPage
            details_list = details_by_case.get(cid, [])
            publications, map_year_page = process_publications(
                c.get('case_year'), c.get('case_mag'), c.get('case_page'), details_list
            )

            # Laws & Sections
            sections_list = sections_by_case.get(cid, [])
            laws = process_laws(sections_list, laws_lookup)

            # Construct clean document adhering STRICTLY to Case schema
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

            # Insert batch
            if len(batch) >= BATCH_SIZE:
                db.cases.insert_many(batch, ordered=False)
                total_inserted += len(batch)
                batch = []

                # Periodic storage and safety check
                if total_inserted % 1000 == 0:
                    try:
                        db_stats = db.command('dbStats')
                        coll_stats = db.command('collStats', 'cases')
                        total_storage_mb = (db_stats.get('storageSize', 0) + db_stats.get('indexSize', 0)) / (1024 * 1024)
                        case_storage_mb = coll_stats.get('storageSize', 0) / (1024 * 1024)
                        print(f"  -> Inserted {total_inserted:,} cases | DB Storage: {total_storage_mb:.2f} MB / {SAFE_STORAGE_LIMIT_MB} MB ceiling (Cases: {case_storage_mb:.2f} MB)")

                        if total_storage_mb >= SAFE_STORAGE_LIMIT_MB:
                            print(f"\n[SAFETY STOP] Total storage ({total_storage_mb:.2f} MB) reached safe limit ({SAFE_STORAGE_LIMIT_MB} MB). Stopping to protect free tier.")
                            break
                    except Exception as e:
                        print(f"  -> Inserted {total_inserted:,} cases...")

                if total_inserted >= TARGET_CASE_COUNT:
                    print(f"\n[TARGET REACHED] Reached target count of {TARGET_CASE_COUNT:,} complete cases!")
                    break

        # Insert remaining batch if any and limit not hit
        if batch and total_inserted < TARGET_CASE_COUNT:
            db.cases.insert_many(batch, ordered=False)
            total_inserted += len(batch)
            batch = []

    elapsed = time.time() - start_time
    print(f"\nInsertion complete: {total_inserted:,} cases inserted from {total_scanned:,} scanned ({skipped_incomplete:,} incomplete skipped) in {elapsed:.1f}s.")

    # Step 5: Build all indexes for maximum query performance & zero speed impact
    print(f"\n[5/6] Building high-performance database indexes...")
    t_idx = time.time()

    # Unique index on caseId and case_id
    db.cases.create_index([('caseId', pymongo.ASCENDING)], unique=True, sparse=True)
    db.cases.create_index([('case_id', pymongo.ASCENDING)], unique=True, sparse=True)

    # Core query indexes
    db.cases.create_index([('sldNumber', pymongo.ASCENDING)])
    db.cases.create_index([('isDeleted', pymongo.ASCENDING), ('sldNumber', pymongo.DESCENDING)])
    db.cases.create_index([('isDeleted', pymongo.ASCENDING), ('sldNumber', pymongo.ASCENDING)])
    db.cases.create_index([('isDeleted', pymongo.ASCENDING), ('dated', pymongo.DESCENDING)])
    db.cases.create_index([('isDeleted', pymongo.ASCENDING), ('court', pymongo.ASCENDING)])

    # Text Search Index
    print("Building full-text search index across key search fields...")
    db.cases.create_index([
        ('caseId', 'text'),
        ('case_id', 'text'),
        ('sldNumber', 'text'),
        ('court', 'text'),
        ('caseNumber', 'text'),
        ('judges', 'text'),
        ('lawyers', 'text'),
        ('petitioners', 'text'),
        ('headNote', 'text'),
        ('references', 'text'),
        ('principleLaw', 'text'),
    ], name='case_text_search_index')

    print(f"All indexes created in {time.time() - t_idx:.2f} seconds.")

    # Step 6: Verification and final report
    print(f"\n[6/6] Verifying database status and integrity...")
    final_count = db.cases.count_documents({})
    db_stats = db.command('dbStats')
    coll_stats = db.command('collStats', 'cases')

    print(f"Total Cases in Database: {final_count:,}")
    print(f"Cases Data Size:        {coll_stats.get('size', 0) / (1024 * 1024):.2f} MB")
    print(f"Cases Storage Size:     {coll_stats.get('storageSize', 0) / (1024 * 1024):.2f} MB")
    print(f"Cases Index Size:       {coll_stats.get('totalIndexSize', 0) / (1024 * 1024):.2f} MB")
    print(f"Total Database Storage: {(db_stats.get('storageSize', 0) + db_stats.get('indexSize', 0)) / (1024 * 1024):.2f} MB / 512.00 MB")

    # Sample check
    c1 = db.cases.find_one({'sldNumber': '1'})
    if c1:
        print("\n--- SAMPLE CASE VERIFICATION (SLD #1) ---")
        print(f"caseId:       {c1.get('caseId')}")
        print(f"sldNumber:    {c1.get('sldNumber')}")
        print(f"court:        {c1.get('court')}")
        print(f"department:   {c1.get('department')}")
        print(f"caseNumber:   {c1.get('caseNumber')}")
        print(f"judges:       {c1.get('judges')}")
        print(f"petitioners:  {c1.get('petitioners')}")
        print(f"lawyers:      {c1.get('lawyers')}")
        print(f"publications: {len(c1.get('publications', []))} items -> {c1.get('mapYearPage')}")
        print(f"laws:         {len(c1.get('laws', []))} items -> {[l.get('lawStatute') + ' s.' + l.get('section') for l in c1.get('laws', [])[:3]]}...")
        print(f"headNote:     {c1.get('headNote')[:80]}... (len: {len(c1.get('headNote', ''))})")
        print(f"judgment:     {c1.get('judgment')[:80]}... (len: {len(c1.get('judgment', ''))})")
        print(f"extra fields check: 'status' in doc: {'status' in c1}, 'is_new' in doc: {'is_new' in c1}")

    client.close()
    print("\n" + "=" * 70)
    print("SUCCESS: ALL PREVIOUS CASES REPLACED WITH ACCURATE, COMPLETE CASES!")
    print("=" * 70)


if __name__ == '__main__':
    main()
