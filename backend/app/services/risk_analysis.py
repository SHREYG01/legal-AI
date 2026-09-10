"""Contract risk detection.

Default backend: the configured LLM, doing evidence-grounded analysis over
batched contract excerpts (same batching architecture as Step 8's
obligations/deadlines extraction). This is NOT a trained risk-classification
model — it's the general-purpose LLM applying a risk-analysis prompt.

Modular by design: RiskAnalyzer is the interface every backend implements.
get_risk_analyzer() tries a dedicated trained model first (RISK_MODEL_PATH),
falling back to the LLM analyzer. No trained risk model ships with this
project — MLRiskClassifier is a placeholder for later, and instantiating it
without a real model raises NotImplementedError rather than pretending to work.
"""
import json
import os
from functools import lru_cache
from typing import Any, Dict, List

from fastapi import HTTPException
from pydantic import ValidationError

from app.core.config import settings
from app.models.schemas import RiskFinding
from app.services.extraction_batching import atomize_segments, pack_batches, label_batch
from app.services.llm_client import generate_answer

MAX_UNIT_CHARS = 1500
MAX_BATCH_CHARS = 6000

RISK_CATEGORIES = [
    "Unlimited liability",
    "One-sided termination rights",
    "Missing confidentiality protection",
    "Missing payment deadlines",
    "Ambiguous language",
    "Excessive penalties",
    "Broad indemnification",
    "Unfavorable renewal terms",
    "Unusual notice periods",
    "Unfavorable IP ownership",
]

SYSTEM_PROMPT = (
    "You are a contract risk analyst. Examine the contract excerpts below and identify "
    "potentially risky clauses, focusing on (but not limited to): "
    f"{', '.join(RISK_CATEGORIES)}. "
    "Base every finding strictly on text actually present in the excerpts — never invent a "
    "clause or risk that isn't there. Every finding MUST include a short verbatim 'evidence' "
    "quote copied from the excerpt it came from. Use each excerpt's page/section label to fill "
    "'page_number' (integer or null) and 'section' (heading text or null). Assign 'severity' as "
    'exactly one of "Low", "Medium", "High", "Critical" based on potential impact. Respond with '
    "ONLY a JSON array (no markdown, no commentary) where each item has exactly these keys: "
    '{"title": string, "severity": "Low"|"Medium"|"High"|"Critical", "explanation": string, '
    '"evidence": string, "page_number": integer|null, "section": string|null}. '
    "If these excerpts contain no meaningful risk, respond with []."
)


class RiskAnalyzer:
    """Interface every backend implements."""

    method_name = "base"

    def analyze_batch(self, labeled_excerpts: str) -> List[Dict[str, Any]]:
        raise NotImplementedError


class LLMRiskAnalyzer(RiskAnalyzer):
    method_name = "llm_grounded_analysis"

    def analyze_batch(self, labeled_excerpts: str) -> List[Dict[str, Any]]:
        raw = generate_answer(SYSTEM_PROMPT, labeled_excerpts, max_tokens=1000)
        return _parse_batch_response(raw)


class MLRiskClassifier(RiskAnalyzer):
    """Placeholder for a future dedicated, trained risk-classification model.
    No such model exists yet — instantiating this without a real model at
    RISK_MODEL_PATH must fail loudly, never silently pretend to be trained."""

    method_name = "ml_risk_classifier"

    def __init__(self, model_path: str):
        raise NotImplementedError(
            "No trained risk-classification model ships with this project. "
            "Set RISK_MODEL_PATH to a real trained model to use this backend."
        )

    def analyze_batch(self, labeled_excerpts: str) -> List[Dict[str, Any]]:
        raise NotImplementedError


@lru_cache(maxsize=1)
def get_risk_analyzer() -> RiskAnalyzer:
    if settings.risk_model_path:
        try:
            return MLRiskClassifier(settings.risk_model_path)
        except Exception:
            pass  # fall through to the LLM analyzer
    return LLMRiskAnalyzer()


def _extraction_path(contract_id: str) -> str:
    return os.path.join(settings.upload_dir, f"{contract_id}.json")


def _cache_path(contract_id: str) -> str:
    return os.path.join(settings.upload_dir, f"{contract_id}_risks.json")


def _load_extraction(contract_id: str) -> Dict[str, Any]:
    path = _extraction_path(contract_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"No contract found with id '{contract_id}'")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _parse_batch_response(raw: str) -> List[Dict[str, Any]]:
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
            items.append(RiskFinding(**entry).model_dump())
        except ValidationError:
            continue  # skip malformed individual findings
    return items


def analyze_risks(contract_id: str, force: bool = False) -> Dict[str, Any]:
    cache_path = _cache_path(contract_id)
    if not force and os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    extraction = _load_extraction(contract_id)
    units = atomize_segments(extraction["segments"], MAX_UNIT_CHARS)
    if not units:
        raise HTTPException(status_code=422, detail="No contract text available to analyze.")

    analyzer = get_risk_analyzer()
    all_risks: List[Dict[str, Any]] = []
    for batch in pack_batches(units, MAX_BATCH_CHARS):
        all_risks.extend(analyzer.analyze_batch(label_batch(batch)))

    output = {"contract_id": contract_id, "method": analyzer.method_name, "risks": all_risks}
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)
    return output
