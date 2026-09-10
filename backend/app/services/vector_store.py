"""Reusable ChromaDB vector-store service for contract chunks."""
from typing import List, Dict, Any, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.core.config import settings
from app.services.embeddings import embed_texts

_client = chromadb.PersistentClient(
    path=settings.chroma_persist_dir,
    settings=ChromaSettings(anonymized_telemetry=False),
)
_COLLECTION_NAME = "contract_chunks"


def _get_collection():
    return _client.get_or_create_collection(name=_COLLECTION_NAME)


def add_chunks(contract_id: str, chunks: List[Dict[str, Any]]) -> int:
    """Embed and store chunks for a contract. Returns number of chunks indexed."""
    if not chunks:
        return 0

    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    ids = [f"{contract_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "contract_id": contract_id,
            "chunk_index": i,
            # Chroma metadata can't store None -> use -1 sentinel for "no page" (DOCX)
            "page_number": c["page_number"] if c.get("page_number") is not None else -1,
            "heading": c.get("heading") or "",
        }
        for i, c in enumerate(chunks)
    ]

    _get_collection().add(ids=ids, embeddings=embeddings, metadatas=metadatas, documents=texts)
    return len(chunks)


def query_chunks(query_text: str, contract_id: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
    """Return the top_k chunks most similar to query_text, optionally scoped to one contract."""
    collection = _get_collection()
    query_embedding = embed_texts([query_text])[0]

    where = {"contract_id": contract_id} if contract_id else None
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k, where=where)

    docs = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    hits = []
    for text, meta, dist in zip(docs, metadatas, distances):
        hits.append(
            {
                "text": text,
                "page_number": meta.get("page_number") if meta.get("page_number") != -1 else None,
                "heading": meta.get("heading") or None,
                "contract_id": meta.get("contract_id"),
                "chunk_index": meta.get("chunk_index"),
                "distance": dist,
            }
        )
    return hits
