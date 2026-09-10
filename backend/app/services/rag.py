"""RAG pipeline for contract Q&A.

Answers are grounded only in retrieved contract chunks. If nothing relevant is
retrieved, or the LLM finds no answer in the excerpts, the fixed fallback string
is returned instead of letting the model guess.
"""
from typing import List, Dict, Any

from app.services.vector_store import query_chunks
from app.services.llm_client import generate_answer

FALLBACK = "I could not find this information in the uploaded contract."

SYSTEM_PROMPT = (
    "You are a contract analysis assistant. Answer ONLY using the contract excerpts "
    "provided in the user message. Do not use outside knowledge, do not guess, and do "
    "not invent facts, dates, names, or figures that are not explicitly present in the "
    f"excerpts. If the excerpts do not contain the answer, respond with EXACTLY this "
    f'sentence and nothing else: "{FALLBACK}"'
)

DEFAULT_TOP_K = 5


def _build_context(chunks: List[Dict[str, Any]]) -> str:
    parts = []
    for i, c in enumerate(chunks, start=1):
        if c.get("page_number"):
            loc = f"page {c['page_number']}"
        elif c.get("heading"):
            loc = c["heading"]
        else:
            loc = f"section {c.get('chunk_index')}"
        parts.append(f"[Excerpt {i} — {loc}]\n{c['text']}")
    return "\n\n".join(parts)


def answer_question(contract_id: str, question: str, top_k: int = DEFAULT_TOP_K) -> Dict[str, Any]:
    chunks = query_chunks(question, contract_id=contract_id, top_k=top_k)

    if not chunks:
        return {"answer": FALLBACK, "sources": []}

    context = _build_context(chunks)
    user_prompt = f"Contract excerpts:\n\n{context}\n\nQuestion: {question}"

    answer = generate_answer(SYSTEM_PROMPT, user_prompt)
    not_found = answer.strip().rstrip(".") == FALLBACK.rstrip(".")

    sources = [] if not_found else [
        {
            "page_number": c.get("page_number"),
            "heading": c.get("heading"),
            "chunk_index": c.get("chunk_index"),
            "distance": c.get("distance"),
        }
        for c in chunks
    ]

    return {"answer": FALLBACK if not_found else answer, "sources": sources}
