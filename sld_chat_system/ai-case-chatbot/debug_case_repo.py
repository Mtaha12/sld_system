import asyncio
from mongomock_motor import AsyncMongoMockClient
from app.db.repository import CaseRepository

async def main():
    db = AsyncMongoMockClient().get_database('sld_system')
    await db.cases.insert_one({
        'sldNumber': 1629482,
        'isDeleted': False,
        'caseId': 'CASE-000032',
        'dated': '2023-01-15',
        'court': 'Supreme Court',
        'judgment': 'Test judgment content',
        'attachments': [
            {'document_id': 'DOC-1', 'title': 'Attachment 1'},
            {'document_id': 'DOC-2', 'title': 'Attachment 2'}
        ]
    })
    repo = CaseRepository(db)
    q = repo._build_lookup_query('1629482')
    print('QUERY', q)
    raw = await db.cases.find_one(q, {'_id': 0})
    print('RAW', raw)
    case = await repo.get_case_by_case_number('1629482')
    print('CASE', case)

asyncio.run(main())
