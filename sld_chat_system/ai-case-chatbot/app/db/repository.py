from typing import Any, Generic, Optional, TypeVar
import pymongo
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

T = TypeVar("T")

class BaseRepository(Generic[T]):
    """
    Base repository for read-only database operations.
    Keeps MongoDB-specific code isolated from business logic.
    """

    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str) -> None:
        self.db = db
        self.collection = db[collection_name]

    async def get_by_id(self, id: str) -> dict[str, Any] | None:
        """Fetch a document by its ID."""
        try:
            return await self.collection.find_one({"_id": id})
        except Exception as e:
            logger.error(f"Database error in get_by_id: {e}")
            raise

    async def get_all(self, limit: int = 100, skip: int = 0) -> list[dict[str, Any]]:
        """Fetch all documents with pagination."""
        try:
            cursor = self.collection.find({}).skip(skip).limit(limit)
            return await cursor.to_list(length=limit)
        except Exception as e:
            logger.error(f"Database error in get_all: {e}")
            raise

def clean_objectid(data: Any) -> Any:
    """Recursively convert ObjectId to string in dictionaries and lists."""
    from bson import ObjectId
    if isinstance(data, dict):
        return {k: clean_objectid(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_objectid(v) for v in data]
    elif isinstance(data, ObjectId):
        return str(data)
    return data

class CaseRepository(BaseRepository[dict[str, Any]]):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        super().__init__(db, "cases")

    @staticmethod
    def _normalize_reference_values(case_number: str) -> list[str | int]:
        values: list[str | int] = []
        if not case_number:
            return values

        cleaned = case_number.strip()
        if not cleaned:
            return values

        values.append(cleaned)

        normalized = cleaned.upper().replace("(", " ").replace(")", " ")
        normalized = " ".join(normalized.split())
        if normalized:
            values.append(normalized)

        if cleaned.isdigit():
            values.append(int(cleaned))
            values.append(cleaned)

        # Support citation formats like 'SLD 2025 8335' or 'SLD 2025 8335' with extra spaces.
        citation_match = __import__("re").search(r"(?:^|\s)([A-ZA-z]+)\s+(\d{4})\s+(\d+)$", cleaned)
        if citation_match:
            mag, year, page = citation_match.groups()
            values.extend([mag, mag.upper(), year, page, f"{mag} {year} {page}", f"{mag.upper()} {year} {page}"])
            values.append(int(page) if page.isdigit() else page)

        # Deduplicate while preserving order.
        seen: set[tuple[str, str]] = set()
        deduped: list[str | int] = []
        for value in values:
            key = (type(value).__name__, str(value))
            if key not in seen:
                seen.add(key)
                deduped.append(value)
        return deduped
        
    def _build_lookup_query(self, case_number: str) -> dict[str, Any]:
        """Build a query that searches sldNumber (int or str) and excludes deleted cases."""
        lookup_values = self._normalize_reference_values(case_number)
        or_conds: list[dict[str, Any]] = []
        for lookup_value in lookup_values:
            or_conds.append({"sldNumber": lookup_value})

        # Match publication citation values stored as mapYearPage or publications entries.
        citation_match = __import__("re").search(r"(?:^|\s)([A-Za-z]+)\s+(\d{4})\s+(\d+)$", case_number.strip())
        if citation_match:
            mag, year, page = citation_match.groups()
            or_conds.extend([
                {"mapYearPage": {"$in": [f"{mag.upper()} {year} {page}", f"{mag} {year} {page}"]}},
                {"publications.mag": {"$regex": f"^{__import__('re').escape(mag)}$", "$options": "i"}},
                {"publications.year": year},
                {"publications.page": page},
            ])

        if not or_conds:
            or_conds = [{"sldNumber": case_number}]
            
        return {
            "isDeleted": {"$ne": True},
            "$or": or_conds
        }

    async def setup_indexes(self) -> None:
        try:
            await self.collection.create_index([("sldNumber", pymongo.ASCENDING)], unique=True)
        except Exception as e:
            logger.error(f"Error creating indexes for cases: {e}")
        
    async def get_case_by_case_number(self, case_number: str) -> dict[str, Any] | None:
        try:
            case = await self.collection.find_one(self._build_lookup_query(case_number), {"_id": 0})
            return clean_objectid(case) if case else None
        except Exception as e:
            logger.error(f"Database error fetching case {case_number}: {e}")
            raise

    async def get_case_metadata(self, case_number: str) -> dict[str, Any] | None:
        try:
            projection = {
                "_id": 0, "dated": 1, "department": 1, "court": 1, 
                "caseNumber": 1, "judges": 1, "petitioners": 1, "lawyers": 1
            }
            case = await self.collection.find_one(self._build_lookup_query(case_number), projection)
            return clean_objectid(case) if case else None
        except Exception as e:
            logger.error(f"Database error fetching metadata for {case_number}: {e}")
            raise

    async def get_case_history(self, case_number: str, skip: int = 0, limit: int = 100) -> list[dict[str, Any]] | None:
        try:
            cursor = self.collection.aggregate([
                {"$match": self._build_lookup_query(case_number)},
                {"$project": {"_id": 0, "history": {"$slice": [{"$ifNull": ["$history", []]}, skip, limit]}}}
            ])
            docs = await cursor.to_list(length=1)
            return clean_objectid(docs[0].get("history", [])) if docs else None
        except Exception as e:
            logger.error(f"Database error fetching history for {case_number}: {e}")
            raise
        
    async def get_case_hearings(self, case_number: str, skip: int = 0, limit: int = 100) -> list[dict[str, Any]] | None:
        try:
            cursor = self.collection.aggregate([
                {"$match": self._build_lookup_query(case_number)},
                {"$project": {"_id": 0, "hearings": {"$slice": [{"$ifNull": ["$hearings", []]}, skip, limit]}}}
            ])
            docs = await cursor.to_list(length=1)
            return clean_objectid(docs[0].get("hearings", [])) if docs else None
        except Exception as e:
            logger.error(f"Database error fetching hearings for {case_number}: {e}")
            raise
        
    async def get_case_orders(self, case_number: str, skip: int = 0, limit: int = 100) -> list[dict[str, Any]] | None:
        try:
            cursor = self.collection.aggregate([
                {"$match": self._build_lookup_query(case_number)},
                {"$project": {"_id": 0, "orders": {"$slice": [{"$ifNull": ["$orders", []]}, skip, limit]}}}
            ])
            docs = await cursor.to_list(length=1)
            return clean_objectid(docs[0].get("orders", [])) if docs else None
        except Exception as e:
            logger.error(f"Database error fetching orders for {case_number}: {e}")
            raise
        
    async def get_case_judgments(self, case_number: str, skip: int = 0, limit: int = 100) -> list[dict[str, Any]] | None:
        try:
            cursor = self.collection.aggregate([
                {"$match": self._build_lookup_query(case_number)},
                {"$project": {"_id": 0, "judgment": 1}}
            ])
            docs = await cursor.to_list(length=1)
            if not docs:
                return None
            judgment = docs[0].get("judgment")
            return clean_objectid([{"judgment": judgment}] if judgment else [])
        except Exception as e:
            logger.error(f"Database error fetching judgments for {case_number}: {e}")
            raise

class DocumentRepository(BaseRepository[dict[str, Any]]):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        super().__init__(db, "cases")
        
    def _build_lookup_query(self, case_number: str) -> dict[str, Any]:
        """Same lookup query for attachments based on cases."""
        or_conds: list[dict[str, Any]] = [{"sldNumber": case_number}]
        if case_number.isdigit():
            or_conds.append({"sldNumber": int(case_number)})
            
        return {
            "isDeleted": {"$ne": True},
            "$or": or_conds
        }

    async def setup_indexes(self) -> None:
        pass # Index already created by CaseRepository since it's the same collection
        
    async def get_documents_by_case_number(self, case_number: str, skip: int = 0, limit: int = 100) -> list[dict[str, Any]]:
        try:
            cursor = self.collection.aggregate([
                {"$match": self._build_lookup_query(case_number)},
                {"$project": {"_id": 0, "attachments": {"$slice": [{"$ifNull": ["$attachments", []]}, skip, limit]}}}
            ])
            docs = await cursor.to_list(length=1)
            if not docs:
                return []
            return clean_objectid(docs[0].get("attachments", []))
        except Exception as e:
            logger.error(f"Database error fetching documents for {case_number}: {e}")
            raise

class ChunkRepository(BaseRepository[dict[str, Any]]):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        super().__init__(db, "document_chunks")
        
    async def setup_indexes(self) -> None:
        try:
            await self.collection.create_index([("metadata.case_id", pymongo.ASCENDING)])
            await self.collection.create_index([("metadata.document_id", pymongo.ASCENDING)])
        except Exception as e:
            logger.error(f"Error creating basic indexes for document_chunks: {e}")
            
        # Create MongoDB Atlas Search Index
        try:
            if hasattr(self.collection, "create_search_index"):
                index_model = {
                    "definition": {
                        "mappings": {
                            "dynamic": True
                        }
                    },
                    "name": "text_index"
                }
                await self.collection.create_search_index(index_model)
        except pymongo.errors.OperationFailure as e:
            if "already exists" not in str(e).lower():
                logger.info(f"Skipping search index creation (likely not on Atlas): {e}")
        except Exception as e:
            logger.warning(f"Failed to create search index: {e}")
            
    async def delete_chunks_by_document(self, document_id: str) -> None:
        """Deletes all chunks for a document to prevent duplicates during re-indexing."""
        try:
            await self.collection.delete_many({"metadata.document_id": document_id})
        except Exception as e:
            logger.error(f"Database error deleting chunks for document {document_id}: {e}")
            raise

    async def save_chunks(self, chunks: list[dict[str, Any]]) -> None:
        if not chunks:
            return
        try:
            for chunk in chunks:
                chunk.pop("embedding", None)
            await self.collection.insert_many(chunks)
        except Exception as e:
            logger.error(f"Database error saving chunks: {e}")
            raise

    async def get_chunks_by_case(self, case_id: str) -> list[dict[str, Any]]:
        try:
            cursor = self.collection.find({"metadata.case_id": case_id}, {"_id": 0, "embedding": 0})
            return clean_objectid(await cursor.to_list(length=None))
        except Exception as e:
            logger.error(f"Database error fetching chunks: {e}")
            raise

    async def text_search(self, query: str, sld_number: str | int, limit: int = 5) -> list[dict[str, Any]]:
        try:
            parsed_sld = int(sld_number) if isinstance(sld_number, str) and sld_number.isdigit() else sld_number
            sld_values = [parsed_sld]
            if isinstance(parsed_sld, int):
                sld_values.append(str(parsed_sld))
            
            pipeline = [
                {
                    "$search": {
                        "index": "text_index",
                        "compound": {
                            "must": [
                                {
                                    "text": {
                                        "query": query,
                                        "path": "text"
                                    }
                                }
                            ],
                            "filter": [
                                {
                                    "compound": {
                                        "should": [
                                            {
                                                "equals": {
                                                    "path": "metadata.sld_number",
                                                    "value": value
                                                }
                                            }
                                            for value in sld_values
                                        ],
                                        "minimumShouldMatch": 1
                                    }
                                }
                            ]
                        }
                    }
                },
                {
                    "$limit": limit
                },
                {
                    "$addFields": {
                        "score": {"$meta": "searchScore"}
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "embedding": 0
                    }
                }
            ]
            
            async def fetch_synthetic_metadata_fallback(current_results):
                # Always fetch the case metadata directly to provide LLM context about attachments, judges, etc.
                case_doc = await self.db["cases"].find_one({"sldNumber": {"$in": [str(v) for v in sld_values]}})
                if case_doc:
                    def safe_join(val):
                        if isinstance(val, list): return ' '.join(str(v) for v in val)
                        return str(val) if val else ''
                        
                    synthetic_text = f"Case Title: {safe_join(case_doc.get('petitioners', []))}\n"
                    synthetic_text += f"Date: {case_doc.get('dated', 'Unknown')}\n"
                    synthetic_text += f"Case Numbers: {safe_join(case_doc.get('caseNumber', []))}\n"
                    synthetic_text += f"Court: {case_doc.get('court', '')}\n"
                    synthetic_text += f"Judges: {safe_join(case_doc.get('judges', []))}\n"
                    
                    if case_doc.get('headNote'):
                        synthetic_text += f"Head Note: {case_doc.get('headNote')}\n"
                    if case_doc.get('principleLaw'):
                        synthetic_text += f"Principle Law: {case_doc.get('principleLaw')}\n"
                        
                    attachments = case_doc.get('attachments', [])
                    if attachments:
                        att_details = [f"{a.get('name', 'Unknown')} ({a.get('type', 'Unknown')})" for a in attachments if isinstance(a, dict)]
                        if att_details:
                            synthetic_text += f"Attachments: {', '.join(att_details)}\n"
                        else:
                            synthetic_text += "Attachments: None\n"
                    else:
                        synthetic_text += "Attachments: None\n"
                    
                    judg = case_doc.get('judgment', '')
                    if judg:
                        import re as regex_lib
                        judg = regex_lib.sub(r'<[^>]+>', '', judg) # strip html
                        synthetic_text += f"Judgment Extract: {judg}\n"
                        
                    current_results.append({
                        "text": synthetic_text,
                        "metadata": {
                            "sld_number": str(case_doc.get("sldNumber", sld_number)),
                            "document_id": "case_metadata",
                            "document_type": "metadata",
                            "page_number": 1
                        }
                    })

                # Check Notifications
                notif_doc = await self.db["notifications"].find_one({"srNumber": {"$in": [str(v) for v in sld_values]}})
                if notif_doc:
                    synthetic_text = f"Notification Number: {notif_doc.get('number', '')}\n"
                    synthetic_text += f"Year: {notif_doc.get('year', '')}\n"
                    synthetic_text += f"Department: {notif_doc.get('department', '')}\n"
                    synthetic_text += f"SRO Number: {notif_doc.get('sroNumber', '')}\n"
                    synthetic_text += f"Subject: {notif_doc.get('subject', '')}\n"
                    blocks = notif_doc.get('blocks', [])
                    if blocks:
                        for b in blocks:
                            detail = b.get('detail', '')
                            if detail:
                                import re as regex_lib
                                detail = regex_lib.sub(r'<[^>]+>', '', detail)
                                synthetic_text += f"Details: {detail}\n"
                    current_results.append({
                        "text": synthetic_text,
                        "metadata": {
                            "sld_number": str(notif_doc.get("srNumber", sld_number)),
                            "document_id": "notification_metadata",
                            "document_type": "notification",
                            "page_number": 1
                        }
                    })

                # Check Statutes
                stat_doc = await self.db["statutes"].find_one({"srNumber": {"$in": [str(v) for v in sld_values]}})
                if stat_doc:
                    synthetic_text = f"Law: {stat_doc.get('law', '')}\n"
                    synthetic_text += f"Chapter: {stat_doc.get('chapter', '')}\n"
                    synthetic_text += f"Section: {stat_doc.get('section', '')}\n"
                    synthetic_text += f"Heading: {stat_doc.get('heading', '')}\n"
                    blocks = stat_doc.get('blocks', [])
                    if blocks:
                        for b in blocks:
                            detail = b.get('detail', '')
                            if detail:
                                import re as regex_lib
                                detail = regex_lib.sub(r'<[^>]+>', '', detail)
                                synthetic_text += f"Details: {detail}\n"
                    current_results.append({
                        "text": synthetic_text,
                        "metadata": {
                            "sld_number": str(stat_doc.get("srNumber", sld_number)),
                            "document_id": "statute_metadata",
                            "document_type": "statute",
                            "page_number": 1
                        }
                    })
                    
                return current_results

            try:
                cursor = self.collection.aggregate(pipeline)
                results = await cursor.to_list(length=limit)
                results = await fetch_synthetic_metadata_fallback(results)
                return clean_objectid(results)
            except Exception as e:
                # Any failure in aggregate is likely an Atlas Search issue (e.g. missing token index, local environment)
                logger.info(f"Atlas $search failed ({e}). Falling back to standard regex find (mock environment).")
                
                import re
                # Simple text match fallback
                query_terms = query.split()
                regex_pattern = "|".join(re.escape(term) for term in query_terms)
                
                filter_query = {
                    "metadata.sld_number": {"$in": sld_values},
                    "text": {"$regex": regex_pattern, "$options": "i"}
                }
                cursor = self.collection.find(filter_query, {"_id": 0, "embedding": 0}).limit(limit)
                results = await cursor.to_list(length=limit)
                results = await fetch_synthetic_metadata_fallback(results)
                return clean_objectid(results)
        except Exception as e:
            logger.error(f"Text search failed: {e}")
            raise

class SessionRepository(BaseRepository[dict[str, Any]]):
    def __init__(self, db: AsyncIOMotorDatabase) -> None:
        super().__init__(db, "chat_sessions")
        
    async def setup_indexes(self) -> None:
        try:
            await self.collection.create_index([("sld_number", pymongo.ASCENDING)])
        except Exception as e:
            logger.error(f"Error creating indexes for chat_sessions: {e}")
            
    async def create_session(
        self,
        session_id: str,
        sld_number: str,
        owner_id: str | None = None,
    ) -> str:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        doc = {
            "_id": session_id,
            "sld_number": sld_number,
            "created_at": now,
            "updated_at": now,
            "messages": []
        }
        if owner_id:
            doc["owner_id"] = owner_id
        await self.collection.insert_one(doc)
        return session_id
        
    async def get_session(
        self,
        session_id: str,
        owner_id: str | None = None,
    ) -> dict[str, Any] | None:
        query = {"_id": session_id}
        if owner_id:
            query["owner_id"] = owner_id
        return await self.collection.find_one(query)
        
    async def add_message(self, session_id: str, role: str, content: str) -> None:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        msg = {
            "role": role,
            "content": content,
            "timestamp": now
        }
        
        try:
            await self.collection.update_one(
                {"_id": session_id},
                {
                    "$push": {"messages": msg},
                    "$set": {"updated_at": now}
                }
            )
        except Exception as e:
            logger.error(f"Error adding message to session {session_id}: {e}")
            raise

    async def get_user_sessions(self, owner_id: str) -> list[dict[str, Any]]:
        """Fetch all sessions belonging to a specific user, sorted by newest first."""
        try:
            cursor = self.collection.find(
                {"owner_id": owner_id},
                {"messages": 0} # Exclude messages to save bandwidth
            ).sort("updated_at", -1)
            
            sessions = await cursor.to_list(length=50)
            return clean_objectid(sessions)
        except Exception as e:
            logger.error(f"Error fetching user sessions: {e}")
            raise
