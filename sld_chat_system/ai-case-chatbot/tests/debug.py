import asyncio
from mongomock_motor import AsyncMongoMockClient

async def main():
    client = AsyncMongoMockClient()
    db = client.get_database("sld_system")
    cases = [
        {
            "sldNumber": 1629482,
            "isDeleted": False,
            "caseId": "CASE-000032",
        }
    ]
    await db.cases.insert_many(cases)
    
    query = {
        "isDeleted": {"$ne": True},
        "$or": [{"sldNumber": "1629482"}, {"sldNumber": 1629482}]
    }
    case = await db.cases.find_one(query)
    print(case)

asyncio.run(main())
