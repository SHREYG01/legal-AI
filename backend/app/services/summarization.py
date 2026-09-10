"""Contract summarization. Reuses extraction output (Step 3) and the configured
LLM client (Step 5). Long contracts are map-reduced: each chunk is condensed to
plain-text notes first, then the notes are combined into one structured summary.
"""
import json
import os
from typing import Any, Dict

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import settings
from app.models.schemas import ContractSummary
from app.services.chunking import split_text
from app.services.llm_client import generate_answer, LLMError

MAX_SINGLE_PASS_CHARS = 12000  # above this, use map-reduce instead of one LLM call
MAP_CHUNK_CHARS = 6000
MAP_OVERLAP = 200

SUMMARY_SCHEMA_HINT = (
    '{"contract_purpose": string, "parties": [string], "duration": string, '
    '"payment_terms": string, "key_obligations": [string], '
    '"termination_conditions": string, "important_clauses": [string]}'
)

REDUCE_SYSTEM_PROMPT = (
    "You are a contract analysis assistant. Using ONLY the contract text/notes given by the "
    "user, produce a summary. Base every field strictly on that text — never invent facts. "
    'If a field is not present, use "Not specified in the contract." for string fields, or an '
    "empty list for list fields. Respond with ONLY valid JSON matching exactly this shape — "
    f"no markdown, no commentary:\n{SUMMARY_SCHEMA_HINT}"
)

MAP_SYSTEM_PROMPT = (
    "You are a contract analysis assistant. From this contract excerpt, extract only facts "
    "relevant to: contract purpose, parties involved, duration/term, payment terms, key "
    "obligations, termination conditions, and other important clauses. Write concise plain-text "
    "notes. Do not invent information not present in the excerpt. If nothing relevant appears, "
    "respond with exactly: 'No relevant information.'"
)


def _load_extraction(contract_id: str) -> Dict[str, Any]:
    path = os.path.join(settings.upload_dir, f"{contract_id}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No contract found with id '{contract_id}'")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_summary_json(raw: str) -> ContractSummary:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned
    try:
        return ContractSummary(**json.loads(cleaned))
    except (json.JSONDecodeError, ValidationError) as e:
        raise LLMError(f"LLM returned an unexpected format for the summary: {e}")


def _map_reduce_summarize(full_text: str) -> ContractSummary:
    pieces = split_text(full_text, MAP_CHUNK_CHARS, MAP_OVERLAP)
    notes = []
    for piece in pieces:
        note = generate_answer(MAP_SYSTEM_PROMPT, piece, max_tokens=400)
        if note.strip() and "no relevant information" not in note.lower():
            notes.append(note.strip())

    combined_notes = "\n\n".join(notes) if notes else "No relevant information extracted."
    raw = generate_answer(REDUCE_SYSTEM_PROMPT, combined_notes, max_tokens=800)
    return _parse_summary_json(raw)


def _single_pass_summarize(full_text: str) -> ContractSummary:
    raw = generate_answer(REDUCE_SYSTEM_PROMPT, full_text, max_tokens=800)
    return _parse_summary_json(raw)


def summarize_contract(contract_id: str) -> Dict[str, Any]:
    extraction = _load_extraction(contract_id)
    full_text = extraction.get("full_text", "")

    if not full_text.strip():
        raise HTTPException(status_code=422, detail="Contract has no extracted text to summarize.")

    if len(full_text) > MAX_SINGLE_PASS_CHARS:
        summary, method = _map_reduce_summarize(full_text), "map_reduce"
    else:
        summary, method = _single_pass_summarize(full_text), "single_pass"

    return {"contract_id": contract_id, "method": method, "summary": summary.model_dump()}
