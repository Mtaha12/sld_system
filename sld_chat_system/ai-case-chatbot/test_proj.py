import asyncio
from mongomock_motor import AsyncMongoMockClient

async def test():
    client = AsyncMongoMockClient()
    db = client.get_database('test')
    await db.c.insert_one({'a': 1, 'b': [1,2,3]})
    cursor = db.c.aggregate([
        {"$match": {"a": 1}},
        {"$project": {"_id": 0, "b": {"$slice": ["$b", 0, 2]}}}
    ])
    res = await cursor.to_list(None)
    print(res)

asyncio.run(test())
