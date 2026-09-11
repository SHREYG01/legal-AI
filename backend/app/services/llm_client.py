"""Provider-neutral LLM client supporting Groq, Gemini, Anthropic, and OpenAI
with resilient HTTP handling, rate-limit retry, and an offline deterministic fallback.
"""
import json
import logging
import os
import random
import time
from urllib import error, request

import anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    pass


def _get_groq_key() -> str:
    """Resolve Groq API key with backwards-compatible fallback to older env vars."""
    if settings.groq_api_key.strip():
        return settings.groq_api_key.strip()
    if os.environ.get("GROQ_API_KEY", "").strip():
        return os.environ.get("GROQ_API_KEY", "").strip()
    # Check if a Groq key (starts with 'gsk_') was placed in OPENAI_API_KEY or GEMINI_API_KEY
    if settings.openai_api_key.strip().startswith("gsk_"):
        return settings.openai_api_key.strip()
    if settings.gemini_api_key.strip().startswith("gsk_"):
        return settings.gemini_api_key.strip()
    return ""


def generate_answer(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    provider = settings.llm_provider.lower().strip()
    try:
        if provider == "groq":
            groq_key = _get_groq_key()
            if not groq_key:
                if settings.mock_fallback:
                    logger.warning("GROQ_API_KEY is not configured; using offline mock fallback.")
                    return _generate_mock(system_prompt, user_prompt)
                raise LLMError("GROQ_API_KEY is not set in .env")
            return _generate_groq(system_prompt, user_prompt, max_tokens, api_key=groq_key)

        if provider == "anthropic":
            if not settings.anthropic_api_key and settings.mock_fallback:
                logger.warning("ANTHROPIC_API_KEY is not configured; using offline mock fallback.")
                return _generate_mock(system_prompt, user_prompt)
            return _generate_anthropic(system_prompt, user_prompt, max_tokens)

        if provider in {"openai", "openrouter"}:
            if not settings.openai_api_key and settings.mock_fallback:
                logger.warning("OPENAI_API_KEY is not configured; using offline mock fallback.")
                return _generate_mock(system_prompt, user_prompt)
            return _generate_openai_compatible(system_prompt, user_prompt, max_tokens)

        if provider == "gemini":
            if not settings.gemini_api_key and settings.mock_fallback:
                logger.warning("GEMINI_API_KEY is not configured; using offline mock fallback.")
                return _generate_mock(system_prompt, user_prompt)
            return _generate_gemini(system_prompt, user_prompt, max_tokens)

        if provider in {"mock", "fallback"}:
            return _generate_mock(system_prompt, user_prompt)

        raise LLMError(f"Unsupported LLM_PROVIDER: '{settings.llm_provider}'")

    except LLMError as exc:
        if settings.mock_fallback and provider not in {"mock", "fallback"}:
            logger.warning("LLM request failed (%s); switching to mock fallback.", exc)
            return _generate_mock(system_prompt, user_prompt)
        raise


def _generate_groq(system_prompt: str, user_prompt: str, max_tokens: int, api_key: str) -> str:
    url = f"{settings.groq_base_url.rstrip('/')}/chat/completions"
    model = settings.llm_model.strip()
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    data = _post_json(url, payload, {"Authorization": f"Bearer {api_key}"})
    try:
        msg = data["choices"][0]["message"]
        content = (msg.get("content") or "").strip()
        if not content and msg.get("reasoning"):
            content = msg["reasoning"].strip()
        return content
    except (KeyError, IndexError, AttributeError) as exc:
        raise LLMError("Groq returned an unexpected response format") from exc


def _generate_anthropic(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    if not settings.anthropic_api_key:
        raise LLMError("ANTHROPIC_API_KEY is not set in .env")
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.llm_model.strip(),
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except anthropic.APIError as exc:
        raise LLMError(f"Anthropic LLM request failed: {exc}") from exc
    return "".join(block.text for block in response.content if block.type == "text").strip()


def _post_json(url: str, payload: dict, headers: dict, max_retries: int = 3) -> dict:
    """Post JSON with custom User-Agent and automatic backoff retry on HTTP 429."""
    body = json.dumps(payload).encode("utf-8")
    default_headers = {
        "Content-Type": "application/json",
        "User-Agent": "LegalAI-Assistant/1.0",
    }
    merged_headers = {**default_headers, **headers}

    for attempt in range(max_retries + 1):
        req = request.Request(url, data=body, headers=merged_headers, method="POST")
        try:
            with request.urlopen(req, timeout=90) as response:
                return json.loads(response.read().decode("utf-8"))
        except error.HTTPError as exc:
            try:
                detail = exc.read().decode("utf-8", errors="replace")
            except Exception:
                detail = str(exc)

            # Edge Case: Rate Limit (HTTP 429) backoff retry
            if exc.code == 429 and attempt < max_retries:
                retry_after = exc.headers.get("Retry-After")
                sleep_secs = float(retry_after) if retry_after else (1.5 * (2 ** attempt) + random.uniform(0.1, 0.5))
                logger.info("Rate limited (429). Retrying in %.2fs (attempt %d/%d)...", sleep_secs, attempt + 1, max_retries)
                time.sleep(sleep_secs)
                continue

            # Diagnostic guidance for common HTTP errors
            if exc.code == 404:
                raise LLMError(
                    f"LLM model not found (404) on '{url}'. Configured model: '{settings.llm_model}'. "
                    "For Groq, recommended models include 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', or 'qwen/qwen3.8-27b'."
                ) from exc

            if exc.code == 403:
                raise LLMError(f"Access forbidden (403): Check API key permissions and network headers. Details: {detail}") from exc

            raise LLMError(f"LLM request failed ({exc.code}): {detail}") from exc

        except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt < max_retries and isinstance(exc, (error.URLError, TimeoutError)):
                time.sleep(1.0 + attempt)
                continue
            raise LLMError(f"LLM connection/decoding failed: {exc}") from exc

    raise LLMError(f"LLM request failed after {max_retries} retries.")


def _generate_openai_compatible(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    data = _post_json(
        url,
        {
            "model": settings.llm_model.strip(),
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        },
        {"Authorization": f"Bearer {settings.openai_api_key}"},
    )
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, AttributeError) as exc:
        raise LLMError("OpenAI-compatible provider returned an unexpected response") from exc


def _generate_gemini(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    url = f"{settings.gemini_base_url.rstrip('/')}/models/{settings.llm_model.strip()}:generateContent"
    data = _post_json(
        url,
        {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens},
        },
        {"x-goog-api-key": settings.gemini_api_key},
    )
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError, AttributeError) as exc:
        raise LLMError("Gemini returned an unexpected response") from exc


def _generate_mock(system_prompt: str, user_prompt: str) -> str:
    """Return schema-compatible responses for local development and tests."""
    prompt = system_prompt.lower()
    if "exactly this sentence" in prompt and "could not find" in prompt:
        return "I could not find this information in the uploaded contract."
    if "contract_purpose" in prompt and "important_clauses" in prompt:
        return json.dumps({
            "contract_purpose": "Not specified in the contract.",
            "parties": [],
            "duration": "Not specified in the contract.",
            "payment_terms": "Not specified in the contract.",
            "key_obligations": [],
            "termination_conditions": "Not specified in the contract.",
            "important_clauses": [],
        })
    if "contract_start_date" in prompt:
        return json.dumps({
            "contract_start_date": None,
            "contract_end_date": None,
            "renewal_date": None,
            "termination_notice_period": None,
            "payment_deadlines": [],
            "delivery_deadlines": [],
            "other_dates": [],
        })
    if "responsible_party" in prompt and "obligation" in prompt:
        return "[]"
    if '"severity"' in prompt and "evidence" in prompt:
        return "[]"
    if '"summary"' in prompt and "highlighted_changes" in prompt:
        return json.dumps({
            "summary": "No material changes were detected by the offline analysis.",
            "highlighted_changes": [],
        })
    return "I could not find this information in the uploaded contract."

