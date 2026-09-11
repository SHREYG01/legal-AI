"""Small provider-neutral LLM client with an offline deterministic fallback."""
import json
from urllib import error, request

import anthropic

from app.core.config import settings


class LLMError(Exception):
    pass


def generate_answer(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> str:
    provider = settings.llm_provider.lower().strip()
    try:
        if provider == "anthropic":
            if not settings.anthropic_api_key and settings.mock_fallback:
                return _generate_mock(system_prompt, user_prompt)
            return _generate_anthropic(system_prompt, user_prompt, max_tokens)
        if provider in {"openai", "openrouter", "groq"}:
            if not settings.openai_api_key and settings.mock_fallback:
                return _generate_mock(system_prompt, user_prompt)
            return _generate_openai_compatible(system_prompt, user_prompt, max_tokens)
        if provider == "gemini":
            if not settings.gemini_api_key and settings.mock_fallback:
                return _generate_mock(system_prompt, user_prompt)
            return _generate_gemini(system_prompt, user_prompt, max_tokens)
        if provider in {"mock", "fallback"}:
            return _generate_mock(system_prompt, user_prompt)
        raise LLMError(f"Unsupported LLM_PROVIDER: '{settings.llm_provider}'")
    except LLMError:
        if settings.mock_fallback and provider not in {"mock", "fallback"}:
            return _generate_mock(system_prompt, user_prompt)
        raise


def _generate_anthropic(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    if not settings.anthropic_api_key:
        raise LLMError("ANTHROPIC_API_KEY is not set in .env")
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(model=settings.llm_model, max_tokens=max_tokens, system=system_prompt, messages=[{"role": "user", "content": user_prompt}])
    except anthropic.APIError as exc:
        raise LLMError(f"LLM request failed: {exc}") from exc
    return "".join(block.text for block in response.content if block.type == "text").strip()


def _post_json(url: str, payload: dict, headers: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with request.urlopen(req, timeout=90) as response:
            return json.loads(response.read().decode("utf-8"))
    except (error.HTTPError, error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise LLMError(f"LLM request failed: {exc}") from exc


def _generate_openai_compatible(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    url = f"{settings.openai_base_url.rstrip('/')}/chat/completions"
    data = _post_json(url, {"model": settings.llm_model, "max_tokens": max_tokens, "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]}, {"Authorization": f"Bearer {settings.openai_api_key}"})
    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, AttributeError) as exc:
        raise LLMError("OpenAI-compatible provider returned an unexpected response") from exc


def _generate_gemini(system_prompt: str, user_prompt: str, max_tokens: int) -> str:
    url = f"{settings.gemini_base_url.rstrip('/')}/models/{settings.llm_model}:generateContent?key={settings.gemini_api_key}"
    data = _post_json(url, {"systemInstruction": {"parts": [{"text": system_prompt}]}, "contents": [{"role": "user", "parts": [{"text": user_prompt}]}], "generationConfig": {"maxOutputTokens": max_tokens}}, {})
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
        return json.dumps({"contract_purpose": "Not specified in the contract.", "parties": [], "duration": "Not specified in the contract.", "payment_terms": "Not specified in the contract.", "key_obligations": [], "termination_conditions": "Not specified in the contract.", "important_clauses": []})
    if "contract_start_date" in prompt:
        return json.dumps({"contract_start_date": None, "contract_end_date": None, "renewal_date": None, "termination_notice_period": None, "payment_deadlines": [], "delivery_deadlines": [], "other_dates": []})
    if "responsible_party" in prompt and "obligation" in prompt:
        return "[]"
    if '"severity"' in prompt and "evidence" in prompt:
        return "[]"
    if '"summary"' in prompt and "highlighted_changes" in prompt:
        return json.dumps({"summary": "No material changes were detected by the offline analysis.", "highlighted_changes": []})
    return "I could not find this information in the uploaded contract."
