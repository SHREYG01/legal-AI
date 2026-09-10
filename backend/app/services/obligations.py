"""Obligation extraction. Reuses extraction (Step 3) and the configured LLM
client (Step 5). Grounded strictly in the uploaded contract — no invented
parties, actions, or deadlines. Malformed LLM output is skipped, not fatal.
"""
import json
import os
from typing import Any, Dict, List

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import settings
from app.models.schemas import Obligation
from app.services.extraction_batching import atomize_segments, pack_batches, label_batch
from app.services.llm_client import generate_answer

MAX_UNIT_CHARS = 1500
MAX_BATCH_CHARS = 6000

SYSTEM_PROMPT = (
    "You are a contract analysis assistant. From the contract excerpts below, extract every "
    "distinct obligation — a party's required action. Use each excerpt's page/section label to "
    "fill 'page_number' (integer, or null if none) and 'section' (the heading text, or null). "
    "Use ONLY information explicitly stated in the excerpts — never invent a responsible party, "
    "action, or deadline that isn't written there. If a field is not stated, use null. Respond "
    "with ONLY a JSON array (no markdown, no commentary) where each item has exactly these keys: "
    '{"responsible_party": string|null, "obligation": string, "deadline": string|null, '
    '"section": string|null, "page_number": integer|null}. '
    "If no obligations are found in these excerpts, respond with []."
)


def _extraction_path(contract_id: str) -> str:
    return os.path.join(settings.upload_dir, f"{contract_id}.json")


def _cache_path(contract_id: str) -> str:
    return os.path.join(settings.upload_dir, f"{contract_id}_obligations.json")


def _load_extraction(contract_id: str) -> Dict[str, Any]:
    path = _extraction_path(contract_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No contract found with id '{contract_id}'")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_batch_response(raw: str) -> List[Obligation]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned
    try:
        data = json.loads(cleaned)
        if not isinstance(data, list):
            return []
    except json.JSONDecodeError:
        return []  # malformed batch output is skipped, not fatal for the whole request

    items = []
    for entry in data:
        try:
            items.append(Obligation(**entry))
        except ValidationError:
            continue  # skip malformed individual items
    return items


def extract_obligations(contract_id: str, force: bool = False) -> Dict[str, Any]:
    cache_path = _cache_path(contract_id)
    if not force and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    extraction = _load_extraction(contract_id)
    units = atomize_segments(extraction["segments"], MAX_UNIT_CHARS)
    if not units:
        raise HTTPException(status_code=422, detail="No contract text available to analyze.")

    all_obligations: List[Obligation] = []
    for batch in pack_batches(units, MAX_BATCH_CHARS):
        raw = generate_answer(SYSTEM_PROMPT, label_batch(batch), max_tokens=800)
        all_obligations.extend(_parse_batch_response(raw))

    output = {"contract_id": contract_id, "obligations": [o.model_dump() for o in all_obligations]}
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)
    return output
