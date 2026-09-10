"""Deadline/date extraction. Same architecture as obligations.py — batches
grounded excerpts through the LLM, then merges each batch's structured result
deterministically (no extra LLM call needed for merging).
"""
import json
import os
from typing import Any, Dict

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import settings
from app.models.schemas import DeadlinesSummary
from app.services.extraction_batching import atomize_segments, pack_batches, label_batch
from app.services.llm_client import generate_answer

MAX_UNIT_CHARS = 1500
MAX_BATCH_CHARS = 6000

_DATE_ITEM_SHAPE = '{"description": string, "date_or_timeframe": string|null, "page_number": integer|null}'

SYSTEM_PROMPT = (
    "You are a contract analysis assistant. From the contract excerpts below, extract any "
    "dates or timeframes for: contract start date, contract end/expiration date, renewal date, "
    "payment deadlines, delivery deadlines, termination notice periods, and any other important "
    "dates/timeframes. Use ONLY what is explicitly stated — never invent or infer a date that "
    "isn't written in the excerpts. Use each excerpt's page/section label to fill 'page_number'. "
    "If a field has no information in these excerpts, use null for single-value fields or an "
    "empty array for list fields. Respond with ONLY valid JSON (no markdown, no commentary) "
    "matching exactly this shape:\n"
    '{"contract_start_date": string|null, "contract_end_date": string|null, '
    '"renewal_date": string|null, "termination_notice_period": string|null, '
    f'"payment_deadlines": [{_DATE_ITEM_SHAPE}], "delivery_deadlines": [{_DATE_ITEM_SHAPE}], '
    f'"other_dates": [{_DATE_ITEM_SHAPE}]}}'
)


def _extraction_path(contract_id: str) -> str:
    return os.path.join(settings.upload_dir, f"{contract_id}.json")


def _cache_path(contract_id: str) -> str:
    return os.path.join(settings.upload_dir, f"{contract_id}_deadlines.json")


def _load_extraction(contract_id: str) -> Dict[str, Any]:
    path = _extraction_path(contract_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No contract found with id '{contract_id}'")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_batch_response(raw: str) -> DeadlinesSummary:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned
    try:
        return DeadlinesSummary(**json.loads(cleaned))
    except (json.JSONDecodeError, ValidationError):
        return DeadlinesSummary()  # malformed batch contributes nothing, not fatal


def _merge(a: DeadlinesSummary, b: DeadlinesSummary) -> DeadlinesSummary:
    return DeadlinesSummary(
        contract_start_date=a.contract_start_date or b.contract_start_date,
        contract_end_date=a.contract_end_date or b.contract_end_date,
        renewal_date=a.renewal_date or b.renewal_date,
        termination_notice_period=a.termination_notice_period or b.termination_notice_period,
        payment_deadlines=a.payment_deadlines + b.payment_deadlines,
        delivery_deadlines=a.delivery_deadlines + b.delivery_deadlines,
        other_dates=a.other_dates + b.other_dates,
    )


def extract_deadlines(contract_id: str, force: bool = False) -> Dict[str, Any]:
    cache_path = _cache_path(contract_id)
    if not force and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    extraction = _load_extraction(contract_id)
    units = atomize_segments(extraction["segments"], MAX_UNIT_CHARS)
    if not units:
        raise HTTPException(status_code=422, detail="No contract text available to analyze.")

    merged = DeadlinesSummary()
    for batch in pack_batches(units, MAX_BATCH_CHARS):
        raw = generate_answer(SYSTEM_PROMPT, label_batch(batch), max_tokens=600)
        merged = _merge(merged, _parse_batch_response(raw))

    output = {"contract_id": contract_id, "deadlines": merged.model_dump()}
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)
    return output
